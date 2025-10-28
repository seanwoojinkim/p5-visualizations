"""
Polar H10 Heart Rate Monitor Service
Main application that connects all components:
- Polar H10 Bluetooth connection
- HeartMath coherence calculation
- WebSocket server for real-time streaming
"""

import asyncio
import logging
import yaml
import sys
from pathlib import Path

from polar_h10 import PolarH10
from coherence_calculator import CoherenceCalculator
from websocket_server import CoherenceWebSocketServer


# Configure logging
def setup_logging(config: dict):
    """Setup logging configuration."""
    log_level = getattr(logging, config['logging']['level'])
    log_format = config['logging']['format']

    # Create logs directory if needed
    log_file = config['logging'].get('file')
    if log_file:
        Path(log_file).parent.mkdir(parents=True, exist_ok=True)

    handlers = []

    # Console handler
    if config['logging'].get('console', True):
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(log_format))
        handlers.append(console_handler)

    # File handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(logging.Formatter(log_format))
        handlers.append(file_handler)

    logging.basicConfig(
        level=log_level,
        format=log_format,
        handlers=handlers
    )


logger = logging.getLogger(__name__)


class HRVMonitorService:
    """
    Main service that orchestrates Polar H10 connection,
    coherence calculation, and WebSocket streaming.
    """

    def __init__(self, config: dict):
        """
        Initialize the HRV monitoring service.

        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.update_interval = config['coherence']['update_interval']

        # Initialize components
        self.coherence_calc = CoherenceCalculator(config)
        self.websocket_server = CoherenceWebSocketServer(config)
        self.polar_h10 = PolarH10(config, on_rr_interval=self._on_rr_interval)

        # State
        self.is_calibrating = config['calibration']['enabled']
        self.calibration_duration = config['calibration']['duration']
        self.calibration_start_time = None

        # Track background tasks for proper exception handling
        self.background_tasks = set()

    def _on_rr_interval(self, rr_ms: float) -> None:
        """
        Callback for new RR interval from Polar H10.

        Args:
            rr_ms: RR interval in milliseconds
        """
        # Add to coherence calculator
        self.coherence_calc.add_rr_interval(rr_ms)

        # Broadcast heartbeat event to WebSocket clients with exception handling
        task = asyncio.create_task(self.websocket_server.broadcast_heartbeat(rr_ms))
        self._track_background_task(task, "broadcast_heartbeat")

        logger.debug(f"RR interval: {rr_ms:.1f} ms")

    def _track_background_task(self, task: asyncio.Task, task_name: str) -> None:
        """
        Track a background task and handle exceptions.

        Args:
            task: The asyncio task to track
            task_name: Name of the task for logging
        """
        self.background_tasks.add(task)
        task.add_done_callback(lambda t: self.background_tasks.discard(t))

        # Add exception handler
        def handle_task_exception(t: asyncio.Task) -> None:
            try:
                t.result()  # This will raise if the task raised
            except asyncio.CancelledError:
                pass  # Task was cancelled, this is expected during shutdown
            except Exception as e:
                logger.error(f"Error in background task '{task_name}': {e}", exc_info=True)

        task.add_done_callback(handle_task_exception)

    async def _periodic_coherence_update(self) -> None:
        """
        Periodically calculate and broadcast coherence scores.
        """
        await asyncio.sleep(5)  # Initial delay for buffer to fill

        while True:
            try:
                # Calculate coherence
                coherence_result = self.coherence_calc.calculate_coherence()

                # Get buffer status
                buffer_status = self.coherence_calc.get_buffer_status()

                # Check calibration
                if self.is_calibrating:
                    if self.calibration_start_time is None:
                        self.calibration_start_time = asyncio.get_event_loop().time()

                    elapsed = asyncio.get_event_loop().time() - self.calibration_start_time
                    if elapsed >= self.calibration_duration:
                        self.is_calibrating = False
                        logger.info("Calibration complete")
                    else:
                        remaining = self.calibration_duration - elapsed
                        logger.info(f"Calibrating... {remaining:.0f}s remaining")

                # Broadcast updates
                await self.websocket_server.broadcast_coherence(coherence_result)
                await self.websocket_server.broadcast_buffer_status(buffer_status)

                # Log coherence score
                if coherence_result['status'] == 'valid':
                    score = coherence_result['coherence']
                    ratio = coherence_result['ratio']
                    peak_freq = coherence_result['peak_frequency']
                    logger.info(
                        f"Coherence: {score}/100 "
                        f"(ratio={ratio:.2f}, peak={peak_freq:.3f} Hz, "
                        f"beats={coherence_result['beats_used']})"
                    )
                else:
                    logger.info(f"Coherence: {coherence_result['status']}")

            except Exception as e:
                logger.error(f"Error in coherence update: {e}")

            await asyncio.sleep(self.update_interval)

    async def _periodic_status_broadcast(self) -> None:
        """
        Periodically broadcast connection status.
        """
        while True:
            try:
                status = self.polar_h10.get_status()
                await self.websocket_server.broadcast_connection_status(status)
            except Exception as e:
                logger.error(f"Error broadcasting status: {e}")

            await asyncio.sleep(5)

    async def run(self) -> None:
        """
        Run the HRV monitoring service.
        """
        logger.info("Starting HRV Monitor Service")

        # Connect to Polar H10
        logger.info("Connecting to Polar H10...")
        connected = await self.polar_h10.connect()

        if not connected:
            logger.error("Failed to connect to Polar H10. Exiting.")
            return

        logger.info("✓ Polar H10 connected")

        # Start WebSocket server in background
        logger.info("Starting WebSocket server...")
        websocket_task = asyncio.create_task(self.websocket_server.start())

        # Start periodic updates
        coherence_task = asyncio.create_task(self._periodic_coherence_update())
        status_task = asyncio.create_task(self._periodic_status_broadcast())

        # Maintain Polar H10 connection
        connection_task = asyncio.create_task(self.polar_h10.maintain_connection())

        logger.info("✓ Service running")
        logger.info(f"WebSocket server: ws://{self.config['websocket']['host']}:{self.config['websocket']['port']}")

        if self.is_calibrating:
            logger.info(f"Calibration mode: {self.calibration_duration}s")

        try:
            # Wait for all tasks
            await asyncio.gather(
                websocket_task,
                coherence_task,
                status_task,
                connection_task
            )
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            # Graceful shutdown: stop WebSocket server then disconnect Polar H10
            await self.websocket_server.stop()
            await self.polar_h10.disconnect()
            logger.info("Service stopped")


def validate_config(config: dict) -> bool:
    """
    Validate configuration structure and values.

    Args:
        config: Configuration dictionary to validate

    Returns:
        True if valid, False otherwise
    """
    # Check required sections
    required_sections = ['polar', 'coherence', 'websocket', 'logging', 'calibration']
    for section in required_sections:
        if section not in config:
            logger.error(f"Missing required config section: '{section}'")
            return False

    # Validate coherence settings
    coherence = config['coherence']

    if coherence.get('window_duration', 0) < 30:
        logger.error("coherence.window_duration must be >= 30 seconds")
        return False

    if coherence.get('min_beats_required', 0) < 10:
        logger.error("coherence.min_beats_required must be >= 10")
        return False

    if coherence.get('update_interval', 0) <= 0:
        logger.error("coherence.update_interval must be > 0")
        return False

    if coherence.get('resample_rate', 0) <= 0:
        logger.error("coherence.resample_rate must be > 0")
        return False

    # Validate frequency ranges
    min_freq = coherence.get('coherence_min_freq', 0)
    max_freq = coherence.get('coherence_max_freq', 0)

    if min_freq <= 0 or max_freq <= 0:
        logger.error("Coherence frequencies must be > 0")
        return False

    if min_freq >= max_freq:
        logger.error(f"coherence_min_freq ({min_freq}) must be < coherence_max_freq ({max_freq})")
        return False

    # Validate thresholds
    if coherence.get('low_coherence_threshold', -1) < 0:
        logger.error("low_coherence_threshold must be >= 0")
        return False

    if coherence.get('high_coherence_threshold', 0) <= coherence.get('low_coherence_threshold', 0):
        logger.error("high_coherence_threshold must be > low_coherence_threshold")
        return False

    # Validate polar settings
    polar = config['polar']

    if not polar.get('device_name'):
        logger.error("polar.device_name is required")
        return False

    if polar.get('reconnect_delay', 0) < 0:
        logger.error("polar.reconnect_delay must be >= 0")
        return False

    if polar.get('max_reconnect_attempts', 0) < 0:
        logger.error("polar.max_reconnect_attempts must be >= 0")
        return False

    # Validate websocket settings
    websocket = config['websocket']

    port = websocket.get('port', 0)
    if not (1 <= port <= 65535):
        logger.error(f"websocket.port must be between 1-65535, got {port}")
        return False

    # Validate calibration settings
    calibration = config['calibration']

    if calibration.get('duration', 0) < 0:
        logger.error("calibration.duration must be >= 0")
        return False

    logger.debug("Configuration validation passed")
    return True


def load_config(config_path: str = "config/default.yaml") -> dict:
    """
    Load configuration from YAML file.

    Args:
        config_path: Path to configuration file

    Returns:
        Configuration dictionary
    """
    config_file = Path(__file__).parent.parent / config_path

    if not config_file.exists():
        logger.error(f"Configuration file not found: {config_file}")
        sys.exit(1)

    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)

    # Validate configuration
    if not validate_config(config):
        logger.error("Configuration validation failed")
        sys.exit(1)

    return config


async def main():
    """Main entry point."""
    # Load configuration
    config = load_config()

    # Setup logging
    setup_logging(config)

    # Create and run service
    service = HRVMonitorService(config)
    await service.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutdown requested")
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
