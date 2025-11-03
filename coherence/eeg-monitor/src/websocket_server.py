"""
WebSocket Server for Real-Time EEG Data Streaming

Broadcasts EEG coherence scores, band powers, and protocol metrics to
connected clients for visualization.
"""

import asyncio
import json
import logging
import time
import websockets
from typing import Set, Optional, Dict
from websockets.server import WebSocketServerProtocol


logger = logging.getLogger(__name__)


class EEGWebSocketServer:
    """
    WebSocket server that broadcasts EEG data to connected clients.

    Clients can subscribe to real-time protocol metrics, band powers,
    buffer status, connection events, and baseline calibration progress.

    Security features:
    - Maximum client limit
    - Rate limiting per client
    - Message size limits
    - CORS origin validation
    """

    # Security limits
    MAX_MESSAGE_SIZE = 1024  # bytes
    MAX_MESSAGES_PER_SECOND = 10
    MAX_CLIENTS = 10

    def __init__(self, config: dict, integration_manager=None):
        """
        Initialize WebSocket server.

        Args:
            config: Configuration dictionary containing:
                - websocket.host: Host to bind to
                - websocket.port: Port to listen on (8766)
                - websocket.cors_origins: List of allowed CORS origins
            integration_manager: Reference to IntegrationManager for command execution
        """
        ws_config = config.get('websocket', {})
        self.host = ws_config.get('host', '0.0.0.0')
        self.port = ws_config.get('port', 8766)
        self.cors_origins = ws_config.get('cors_origins', ['*'])

        # Reference to integration manager for executing commands
        self.integration_manager = integration_manager

        # Connected clients
        self.clients: Set[WebSocketServerProtocol] = set()

        # Shutdown event for clean server termination
        self.shutdown_event = asyncio.Event()

        # Rate limiting tracking: client_id -> list of message timestamps
        self.client_message_times: Dict[str, list] = {}

        # Latest data cache for new connections
        self.latest_coherence = None
        self.latest_eeg_update = None
        self.latest_buffer_status = None
        self.latest_baseline_progress = None

        # Connection status tracking
        self.connection_status = {
            'muse_connected': False,
            'device_name': None,
            'current_protocol': None,
            'baseline_calibrated': False
        }

    async def start(self) -> None:
        """Start the WebSocket server."""
        logger.info(f"Starting EEG WebSocket server on ws://{self.host}:{self.port}")

        async with websockets.serve(
            self._handler,
            self.host,
            self.port
        ):
            # Wait for shutdown signal
            await self.shutdown_event.wait()

        logger.info("EEG WebSocket server stopped")

    async def stop(self) -> None:
        """Stop the WebSocket server gracefully."""
        logger.info("Stopping EEG WebSocket server...")
        self.shutdown_event.set()

    async def _handler(self, websocket: WebSocketServerProtocol) -> None:
        """
        Handle WebSocket connections.

        Args:
            websocket: WebSocket connection
        """
        client_address = websocket.remote_address
        client_id = f"{client_address[0]}:{client_address[1]}"

        # Check max clients limit
        if len(self.clients) >= self.MAX_CLIENTS:
            logger.warning(f"Max clients ({self.MAX_CLIENTS}) reached, rejecting {client_id}")
            await websocket.close(1008, "Server full")
            return

        # Register client
        self.clients.add(websocket)
        self.client_message_times[client_id] = []
        logger.info(f"Client connected: {client_id} ({len(self.clients)} total)")

        try:
            # Send initial state
            await self._send_initial_state(websocket)

            # Keep connection alive and handle messages
            async for message in websocket:
                # Check message size
                if len(message) > self.MAX_MESSAGE_SIZE:
                    logger.warning(f"Oversized message from {client_id}: {len(message)} bytes")
                    await websocket.close(1009, "Message too large")
                    break

                # Rate limiting
                now = time.time()
                self.client_message_times[client_id].append(now)

                # Remove old timestamps (older than 1 second)
                self.client_message_times[client_id] = [
                    t for t in self.client_message_times[client_id]
                    if now - t < 1.0
                ]

                # Check rate limit
                if len(self.client_message_times[client_id]) > self.MAX_MESSAGES_PER_SECOND:
                    logger.warning(f"Rate limit exceeded for {client_id}")
                    await websocket.close(1008, "Rate limit exceeded")
                    break

                # Handle the message
                await self._handle_message(websocket, message)

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {client_id}")
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}", exc_info=True)
        finally:
            # Unregister client
            self.clients.discard(websocket)
            if client_id in self.client_message_times:
                del self.client_message_times[client_id]
            logger.info(f"Client cleanup complete: {client_id} ({len(self.clients)} remaining)")

    async def _send_initial_state(self, websocket: WebSocketServerProtocol) -> None:
        """
        Send current state to newly connected client.

        Args:
            websocket: WebSocket connection
        """
        initial_state = {
            'type': 'initial_state',
            'timestamp': time.time(),
            'connection_status': self.connection_status,
            'latest_coherence': self.latest_coherence,
            'latest_eeg_update': self.latest_eeg_update,
            'buffer_status': self.latest_buffer_status,
            'baseline_progress': self.latest_baseline_progress
        }

        await websocket.send(json.dumps(initial_state))
        logger.debug(f"Sent initial state to {websocket.remote_address}")

    async def _handle_message(self, websocket: WebSocketServerProtocol, message: str) -> None:
        """
        Handle incoming WebSocket messages from clients.

        Supported commands:
        - ping: Keep-alive check
        - request_status: Get current server state
        - switch_protocol: Change active protocol
        - start_baseline: Begin baseline calibration
        - finish_baseline: Complete baseline calibration

        Args:
            websocket: WebSocket connection
            message: Raw message string
        """
        try:
            data = json.loads(message)
            msg_type = data.get('type')

            if msg_type == 'ping':
                await websocket.send(json.dumps({'type': 'pong', 'timestamp': time.time()}))

            elif msg_type == 'request_status':
                status = {
                    'type': 'status',
                    'timestamp': time.time(),
                    'connection_status': self.connection_status,
                    'buffer_status': self.latest_buffer_status,
                    'connected_clients': len(self.clients)
                }
                await websocket.send(json.dumps(status))

            elif msg_type == 'switch_protocol':
                # Protocol switching command
                protocol_name = data.get('protocol')
                logger.info(f"Protocol switch requested: {protocol_name}")

                # Execute the protocol switch
                if self.integration_manager:
                    # Create task to execute switch (non-blocking)
                    asyncio.create_task(
                        self.integration_manager.switch_protocol(protocol_name)
                    )
                else:
                    logger.warning("Cannot switch protocol: no integration manager")

                # Send acknowledgment
                await websocket.send(json.dumps({
                    'type': 'protocol_switch_requested',
                    'protocol': protocol_name,
                    'timestamp': time.time()
                }))

            elif msg_type == 'start_baseline':
                logger.info("Baseline calibration start requested")

                # Get optional duration parameter (default 60 seconds)
                duration = data.get('duration', 60)

                # Execute baseline calibration
                if self.integration_manager:
                    asyncio.create_task(
                        self.integration_manager.start_baseline_calibration(duration)
                    )
                else:
                    logger.warning("Cannot start baseline: no integration manager")

                # Send acknowledgment
                await websocket.send(json.dumps({
                    'type': 'baseline_start_requested',
                    'duration': duration,
                    'timestamp': time.time()
                }))

            elif msg_type == 'finish_baseline':
                logger.info("Baseline calibration finish requested")

                # Execute baseline finish
                if self.integration_manager:
                    asyncio.create_task(
                        self.integration_manager.finish_baseline_calibration()
                    )
                else:
                    logger.warning("Cannot finish baseline: no integration manager")

                # Send acknowledgment
                await websocket.send(json.dumps({
                    'type': 'baseline_finish_requested',
                    'timestamp': time.time()
                }))

            else:
                logger.warning(f"Unknown message type: {msg_type}")

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {message[:100]}")
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)

    async def broadcast_coherence(self, metrics: dict) -> None:
        """
        Broadcast protocol coherence/metrics update to all connected clients.

        Args:
            metrics: Protocol metrics dictionary containing:
                - protocol: Protocol name
                - score: 0-100 score
                - direction: 'higher', 'lower', or 'balanced'
                - feedback_level: 'low', 'medium', 'good', 'excellent'
                - details: Protocol-specific details
                - timestamp: Unix timestamp
        """
        self.latest_coherence = metrics

        message = {
            'type': 'coherence_update',
            'timestamp': time.time(),
            'data': metrics
        }

        await self._broadcast(message)

    async def broadcast_eeg_update(self, band_powers: dict) -> None:
        """
        Broadcast raw EEG band powers to all connected clients.

        Args:
            band_powers: Band power dictionary containing:
                - delta, theta, alpha, beta, gamma: Average powers
                - channels: Per-channel band powers
                - artifacts: Artifact detection results
                - timestamp: Unix timestamp
        """
        self.latest_eeg_update = band_powers

        message = {
            'type': 'eeg_update',
            'timestamp': time.time(),
            'data': band_powers
        }

        await self._broadcast(message)

    async def broadcast_buffer_status(self, buffer_status: dict) -> None:
        """
        Broadcast signal processor buffer status.

        Args:
            buffer_status: Buffer statistics dictionary containing:
                - ready: Whether buffers have sufficient data
                - window_size: Required window size
                - channels: Per-channel buffer info
        """
        self.latest_buffer_status = buffer_status

        message = {
            'type': 'buffer_status',
            'timestamp': time.time(),
            'data': buffer_status
        }

        await self._broadcast(message)

    async def broadcast_connection_status(self, status: dict) -> None:
        """
        Broadcast Muse headset connection status.

        Args:
            status: Connection status dictionary containing:
                - connected: Whether Muse is connected
                - device_name: Name of Muse device
                - current_protocol: Active protocol name
                - baseline_calibrated: Whether baseline is set
        """
        self.connection_status.update(status)

        message = {
            'type': 'connection_status',
            'timestamp': time.time(),
            'data': self.connection_status
        }

        await self._broadcast(message)

    async def broadcast_baseline_progress(self, progress: dict) -> None:
        """
        Broadcast baseline calibration progress.

        Args:
            progress: Progress dictionary containing:
                - state: 'idle', 'calibrating', or 'complete'
                - samples_collected: Number of samples collected
                - samples_required: Required number of samples
                - percent_complete: Percentage complete (0-100)
                - baseline_values: Final baseline (if complete)
        """
        self.latest_baseline_progress = progress

        message = {
            'type': 'baseline_progress',
            'timestamp': time.time(),
            'data': progress
        }

        await self._broadcast(message)

    async def broadcast_protocol_switched(self, protocol_name: str, success: bool, message_text: str = None) -> None:
        """
        Broadcast protocol switch confirmation.

        Args:
            protocol_name: Name of new protocol
            success: Whether switch was successful
            message_text: Optional message about the switch
        """
        message = {
            'type': 'protocol_switched',
            'timestamp': time.time(),
            'data': {
                'protocol': protocol_name,
                'success': success,
                'message': message_text
            }
        }

        # Update connection status
        if success:
            self.connection_status['current_protocol'] = protocol_name

        await self._broadcast(message)

    async def _broadcast(self, message: dict) -> None:
        """
        Broadcast message to all connected clients.

        Args:
            message: Message dictionary to broadcast
        """
        if not self.clients:
            return

        message_json = json.dumps(message)

        # Send to all clients concurrently
        results = await asyncio.gather(
            *[client.send(message_json) for client in self.clients],
            return_exceptions=True
        )

        # Log any send failures
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(f"Failed to send to client: {result}")

    def get_stats(self) -> dict:
        """
        Get server statistics.

        Returns:
            Dictionary with server stats:
                - connected_clients: Number of connected clients
                - host: Server host
                - port: Server port
                - muse_connected: Whether Muse is connected
                - current_protocol: Active protocol
                - has_data: Whether any data has been received
        """
        return {
            'connected_clients': len(self.clients),
            'host': self.host,
            'port': self.port,
            'muse_connected': self.connection_status.get('muse_connected', False),
            'current_protocol': self.connection_status.get('current_protocol'),
            'has_coherence_data': self.latest_coherence is not None,
            'has_eeg_data': self.latest_eeg_update is not None
        }
