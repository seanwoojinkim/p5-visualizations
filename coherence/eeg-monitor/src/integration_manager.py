"""
Integration Manager for EEG Monitor

Orchestrates the full pipeline:
Muse LSL Stream → SignalProcessor → ProtocolCalculator → WebSocket Server

Handles:
- Muse headset connection via LSL
- Real-time sample processing
- Protocol metric calculation
- WebSocket broadcasting
- Protocol switching
- Baseline calibration
- Connection recovery
"""

import asyncio
import logging
import time
from typing import Optional, Dict
import numpy as np

try:
    from pylsl import StreamInlet, resolve_byprop, LostError
except ImportError:
    raise ImportError("pylsl not installed. Run: pip install pylsl")

from signal_processor import SignalProcessor
from protocol_calculator import ProtocolCalculator
from protocols.factory import ProtocolFactory
from websocket_server import EEGWebSocketServer


logger = logging.getLogger(__name__)


class IntegrationManager:
    """
    Orchestrates the full EEG monitoring pipeline.

    Manages:
    - Muse LSL stream connection
    - Signal processing
    - Protocol calculation
    - WebSocket broadcasting
    - State management
    - Error recovery

    Example:
        >>> config = load_yaml('config/default.yaml')
        >>> manager = IntegrationManager(config)
        >>> await manager.start()
    """

    def __init__(self, config: dict):
        """
        Initialize the integration manager.

        Args:
            config: Configuration dictionary from YAML
        """
        self.config = config
        self.running = False
        self.paused = False

        # Component initialization
        self.signal_processor = SignalProcessor(config.get('signal_processing', {}))

        # Initialize protocol
        protocol_config = config.get('protocols', {})
        default_protocol = protocol_config.get('default', 'alpha_enhancement')
        self.protocol = ProtocolFactory.create(default_protocol, {})
        self.protocol_calculator = ProtocolCalculator(self.protocol)

        # Initialize WebSocket server with reference to this manager
        # This allows the server to execute commands (protocol switching, baseline calibration)
        self.websocket_server = EEGWebSocketServer(config, integration_manager=self)

        # Muse connection
        self.inlet: Optional[StreamInlet] = None
        self.muse_config = config.get('muse', {})
        self.expected_channels = self.muse_config.get('channel_names', ['TP9', 'AF7', 'AF8', 'TP10'])
        self.sample_rate = self.muse_config.get('sample_rate', 256)

        # Update interval for calculations
        self.update_interval = protocol_config.get('update_interval', 1.0)
        self.last_calculation_time = 0

        # Baseline calibration state
        self.baseline_state = 'idle'  # 'idle', 'calibrating', 'complete'
        self.baseline_samples = []
        self.baseline_target_count = 0

        # Connection health tracking
        self.connection_attempts = 0
        self.max_reconnect_attempts = self.muse_config.get('max_reconnect_attempts', 5)
        self.reconnect_delay = self.muse_config.get('reconnect_delay', 5)

        logger.info(f"IntegrationManager initialized with protocol: {self.protocol.name}")

    async def start(self) -> None:
        """
        Start the integration manager.

        This starts:
        1. WebSocket server
        2. Muse connection
        3. Main processing loop
        """
        logger.info("Starting IntegrationManager...")
        self.running = True

        # Start WebSocket server in background
        asyncio.create_task(self.websocket_server.start())
        await asyncio.sleep(0.5)  # Give server time to start

        # Broadcast initial connection status
        await self.websocket_server.broadcast_connection_status({
            'muse_connected': False,
            'device_name': None,
            'current_protocol': self.protocol.name,
            'baseline_calibrated': False
        })

        # Connect to Muse
        success = await self._connect_to_muse()
        if not success:
            logger.error("Failed to connect to Muse headset")
            await self.stop()
            return

        # Start main processing loop
        await self._processing_loop()

    async def stop(self) -> None:
        """Stop the integration manager gracefully."""
        logger.info("Stopping IntegrationManager...")
        self.running = False

        # Stop WebSocket server
        await self.websocket_server.stop()

        # Close Muse connection
        if self.inlet:
            try:
                self.inlet.close_stream()
            except Exception as e:
                logger.warning(f"Error closing Muse stream: {e}")
            self.inlet = None

        logger.info("IntegrationManager stopped")

    async def _connect_to_muse(self) -> bool:
        """
        Connect to Muse headset via LSL.

        Returns:
            True if connection successful, False otherwise
        """
        logger.info("Connecting to Muse headset via LSL...")

        timeout = self.muse_config.get('connection_timeout', 10)

        try:
            # Resolve EEG stream
            logger.info(f"Searching for EEG stream (timeout: {timeout}s)...")
            streams = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: resolve_byprop('type', 'EEG', timeout=timeout)
            )

            if not streams:
                logger.error("No EEG stream found. Is 'muselsl stream' running?")
                return False

            logger.info(f"Found {len(streams)} EEG stream(s)")

            # Create inlet for first stream
            stream = streams[0]
            self.inlet = StreamInlet(stream)
            info = self.inlet.info()

            # Log stream details
            device_name = info.name()
            channel_count = info.channel_count()
            sample_rate = info.nominal_srate()

            logger.info(f"Connected to: {device_name}")
            logger.info(f"  Channels: {channel_count}")
            logger.info(f"  Sample rate: {sample_rate} Hz")

            # Broadcast connection status
            await self.websocket_server.broadcast_connection_status({
                'muse_connected': True,
                'device_name': device_name,
                'current_protocol': self.protocol.name,
                'baseline_calibrated': self.protocol_calculator.baseline_calibrated
            })

            self.connection_attempts = 0
            return True

        except Exception as e:
            logger.error(f"Error connecting to Muse: {e}", exc_info=True)
            self.connection_attempts += 1
            return False

    async def _processing_loop(self) -> None:
        """
        Main processing loop.

        Continuously:
        1. Pull samples from Muse LSL stream
        2. Add samples to SignalProcessor
        3. Calculate band powers periodically
        4. Calculate protocol metrics
        5. Broadcast to WebSocket clients
        6. Handle baseline calibration
        7. Recover from errors
        """
        logger.info("Starting processing loop...")

        sample_count = 0
        error_count = 0
        last_status_broadcast = time.time()

        while self.running:
            try:
                # Check if paused
                if self.paused:
                    await asyncio.sleep(0.1)
                    continue

                # Pull sample from Muse (non-blocking with timeout)
                sample, timestamp = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: self.inlet.pull_sample(timeout=0.1)
                )

                if sample is None:
                    # No sample available yet
                    await asyncio.sleep(0.01)
                    continue

                # Filter to 4 EEG channels (ignore AUX channel if present)
                eeg_sample = sample[:4]

                # Add samples to signal processor (one per channel)
                for i, channel in enumerate(self.expected_channels):
                    self.signal_processor.add_samples(channel, [eeg_sample[i]])

                sample_count += 1

                # Calculate band powers periodically
                current_time = time.time()
                if current_time - self.last_calculation_time >= self.update_interval:
                    await self._calculate_and_broadcast()
                    self.last_calculation_time = current_time

                # Broadcast buffer status periodically (every 5 seconds)
                if current_time - last_status_broadcast >= 5.0:
                    buffer_status = self.signal_processor.get_buffer_status()
                    await self.websocket_server.broadcast_buffer_status(buffer_status)
                    last_status_broadcast = current_time

                # Reset error count on successful processing
                error_count = 0

            except LostError:
                logger.error("Lost connection to Muse stream")
                error_count += 1

                if error_count >= 3:
                    logger.error("Too many connection errors, attempting reconnect...")
                    await self._handle_reconnect()
                    error_count = 0

            except Exception as e:
                logger.error(f"Error in processing loop: {e}", exc_info=True)
                error_count += 1

                if error_count >= 5:
                    logger.error("Too many errors, stopping...")
                    break

                await asyncio.sleep(0.1)

        logger.info(f"Processing loop ended. Total samples processed: {sample_count}")

    async def _calculate_and_broadcast(self) -> None:
        """
        Calculate band powers and protocol metrics, then broadcast to clients.
        """
        try:
            # Calculate band powers
            band_powers = self.signal_processor.calculate_band_powers()

            if band_powers is None:
                # Not enough data yet
                logger.debug("Insufficient data for band power calculation")
                return

            # Broadcast raw EEG data
            await self.websocket_server.broadcast_eeg_update(band_powers)

            # Check signal quality
            artifacts = band_powers.get('artifacts', {})
            signal_quality = artifacts.get('signal_quality', 'unknown')

            if signal_quality == 'poor':
                logger.warning("Poor signal quality detected")
                # Still calculate metrics but flag quality

            # Handle baseline calibration
            if self.baseline_state == 'calibrating':
                await self._handle_baseline_sample(band_powers)

            # Calculate protocol metrics
            metrics = self.protocol_calculator.calculate(band_powers)

            # Add signal quality to metrics
            metrics['signal_quality'] = signal_quality

            # Broadcast protocol metrics
            await self.websocket_server.broadcast_coherence(metrics)

            logger.debug(f"Metrics: score={metrics['score']:.1f}, "
                        f"level={metrics['feedback_level']}, "
                        f"quality={signal_quality}")

        except Exception as e:
            logger.error(f"Error calculating and broadcasting: {e}", exc_info=True)

    async def _handle_baseline_sample(self, band_powers: dict) -> None:
        """
        Handle a sample during baseline calibration.

        Args:
            band_powers: Band power measurement
        """
        try:
            self.protocol_calculator.add_baseline_sample(band_powers)
            self.baseline_samples.append(band_powers)

            # Calculate progress
            samples_collected = len(self.baseline_samples)
            percent_complete = (samples_collected / self.baseline_target_count) * 100

            # Broadcast progress
            await self.websocket_server.broadcast_baseline_progress({
                'state': 'calibrating',
                'samples_collected': samples_collected,
                'samples_required': self.baseline_target_count,
                'percent_complete': min(100, percent_complete)
            })

            logger.debug(f"Baseline progress: {samples_collected}/{self.baseline_target_count}")

            # Auto-finish if target reached
            if samples_collected >= self.baseline_target_count:
                await self.finish_baseline_calibration()

        except Exception as e:
            logger.error(f"Error handling baseline sample: {e}")

    async def _handle_reconnect(self) -> None:
        """
        Attempt to reconnect to Muse headset.
        """
        if self.connection_attempts >= self.max_reconnect_attempts:
            logger.error(f"Max reconnect attempts ({self.max_reconnect_attempts}) reached")
            await self.stop()
            return

        logger.info(f"Reconnect attempt {self.connection_attempts + 1}/{self.max_reconnect_attempts}")

        # Broadcast disconnection
        await self.websocket_server.broadcast_connection_status({
            'muse_connected': False,
            'device_name': None,
            'current_protocol': self.protocol.name,
            'baseline_calibrated': self.protocol_calculator.baseline_calibrated
        })

        # Close old connection
        if self.inlet:
            try:
                self.inlet.close_stream()
            except:
                pass
            self.inlet = None

        # Wait before reconnect
        await asyncio.sleep(self.reconnect_delay)

        # Attempt reconnection
        success = await self._connect_to_muse()

        if not success:
            logger.error("Reconnection failed")
            await self._handle_reconnect()  # Recursive retry

    async def switch_protocol(self, protocol_name: str) -> bool:
        """
        Switch to a different neurofeedback protocol.

        Args:
            protocol_name: Name of protocol to switch to

        Returns:
            True if switch successful, False otherwise
        """
        try:
            logger.info(f"Switching protocol to: {protocol_name}")

            # Create new protocol
            new_protocol = ProtocolFactory.create(protocol_name, {})

            # Switch protocol in calculator (optionally transfer baseline)
            self.protocol_calculator.switch_protocol(new_protocol, transfer_baseline=False)

            # Update reference
            self.protocol = new_protocol

            # Broadcast success
            await self.websocket_server.broadcast_protocol_switched(
                protocol_name,
                success=True,
                message_text=f"Switched to {new_protocol.name}"
            )

            # Update connection status
            await self.websocket_server.broadcast_connection_status({
                'muse_connected': self.inlet is not None,
                'device_name': self.inlet.info().name() if self.inlet else None,
                'current_protocol': protocol_name,
                'baseline_calibrated': self.protocol_calculator.baseline_calibrated
            })

            logger.info(f"Protocol switched successfully to: {new_protocol.name}")
            return True

        except Exception as e:
            logger.error(f"Error switching protocol: {e}", exc_info=True)

            # Broadcast failure
            await self.websocket_server.broadcast_protocol_switched(
                protocol_name,
                success=False,
                message_text=f"Error: {str(e)}"
            )

            return False

    async def start_baseline_calibration(self, duration_seconds: int = 60) -> None:
        """
        Start baseline calibration.

        Args:
            duration_seconds: Duration in seconds (default: 60)
        """
        logger.info(f"Starting baseline calibration ({duration_seconds}s)...")

        # Calculate target sample count
        self.baseline_target_count = int(duration_seconds / self.update_interval)

        # Start calibration
        self.protocol_calculator.start_baseline_calibration()
        self.baseline_state = 'calibrating'
        self.baseline_samples = []

        # Broadcast start
        await self.websocket_server.broadcast_baseline_progress({
            'state': 'calibrating',
            'samples_collected': 0,
            'samples_required': self.baseline_target_count,
            'percent_complete': 0
        })

        logger.info("Baseline calibration started. Sit quietly with eyes closed.")

    async def finish_baseline_calibration(self) -> None:
        """
        Finish baseline calibration and calculate baseline.
        """
        if self.baseline_state != 'calibrating':
            logger.warning("No baseline calibration in progress")
            return

        logger.info("Finishing baseline calibration...")

        try:
            # Finish calibration in calculator
            baseline = self.protocol_calculator.finish_baseline_calibration()

            if baseline:
                self.baseline_state = 'complete'

                # Broadcast completion
                await self.websocket_server.broadcast_baseline_progress({
                    'state': 'complete',
                    'samples_collected': len(self.baseline_samples),
                    'samples_required': self.baseline_target_count,
                    'percent_complete': 100,
                    'baseline_values': baseline
                })

                # Update connection status
                await self.websocket_server.broadcast_connection_status({
                    'muse_connected': True,
                    'device_name': self.inlet.info().name() if self.inlet else None,
                    'current_protocol': self.protocol.name,
                    'baseline_calibrated': True
                })

                logger.info(f"Baseline calibrated successfully: {baseline}")
            else:
                logger.error("Failed to calculate baseline (no samples?)")
                self.baseline_state = 'idle'

        except Exception as e:
            logger.error(f"Error finishing baseline calibration: {e}", exc_info=True)
            self.baseline_state = 'idle'

    def pause(self) -> None:
        """Pause processing (keep connections alive)."""
        logger.info("Pausing processing...")
        self.paused = True

    def resume(self) -> None:
        """Resume processing."""
        logger.info("Resuming processing...")
        self.paused = False

    def get_status(self) -> dict:
        """
        Get current status.

        Returns:
            Status dictionary
        """
        return {
            'running': self.running,
            'paused': self.paused,
            'muse_connected': self.inlet is not None,
            'current_protocol': self.protocol.name,
            'baseline_state': self.baseline_state,
            'baseline_calibrated': self.protocol_calculator.baseline_calibrated,
            'websocket_clients': len(self.websocket_server.clients),
            'buffer_status': self.signal_processor.get_buffer_status()
        }
