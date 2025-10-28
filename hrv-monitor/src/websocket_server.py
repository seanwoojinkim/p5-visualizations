"""
WebSocket Server for Real-Time Coherence Streaming
Broadcasts coherence scores to connected clients for visualization
"""

import asyncio
import json
import logging
import time
import websockets
from typing import Set
from websockets.server import WebSocketServerProtocol


logger = logging.getLogger(__name__)


class CoherenceWebSocketServer:
    """
    WebSocket server that broadcasts coherence data to connected clients.

    Clients can subscribe to real-time coherence scores, buffer status,
    and connection events.
    """

    # Security limits
    MAX_MESSAGE_SIZE = 1024  # bytes
    MAX_MESSAGES_PER_SECOND = 10
    MAX_CLIENTS = 10

    def __init__(self, config: dict):
        """
        Initialize WebSocket server.

        Args:
            config: Configuration dictionary
        """
        self.host = config['websocket']['host']
        self.port = config['websocket']['port']
        self.cors_origins = config['websocket']['cors_origins']

        # Connected clients
        self.clients: Set[WebSocketServerProtocol] = set()

        # Shutdown event for clean server termination
        self.shutdown_event = asyncio.Event()

        # Rate limiting tracking: client_id -> list of message timestamps
        self.client_message_times: dict = {}

        # Latest data cache
        self.latest_coherence = None
        self.latest_buffer_status = None
        self.connection_status = {
            'polar_h10_connected': False,
            'device_name': None
        }

    async def start(self) -> None:
        """Start the WebSocket server."""
        logger.info(f"Starting WebSocket server on ws://{self.host}:{self.port}")

        async with websockets.serve(
            self._handler,
            self.host,
            self.port
        ):
            # Wait for shutdown signal instead of unresolving Future
            await self.shutdown_event.wait()

        logger.info("WebSocket server stopped")

    async def stop(self) -> None:
        """Stop the WebSocket server gracefully."""
        logger.info("Stopping WebSocket server...")
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
        logger.info(f"Client connected: {client_address}")

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
            logger.info(f"Client disconnected: {client_address}")
        except Exception as e:
            logger.error(f"Error handling client {client_address}: {e}")
        finally:
            # Unregister client
            self.clients.discard(websocket)
            if client_id in self.client_message_times:
                del self.client_message_times[client_id]

    async def _send_initial_state(self, websocket: WebSocketServerProtocol) -> None:
        """
        Send current state to newly connected client.

        Args:
            websocket: WebSocket connection
        """
        initial_state = {
            'type': 'initial_state',
            'connection_status': self.connection_status,
            'latest_coherence': self.latest_coherence,
            'buffer_status': self.latest_buffer_status
        }

        await websocket.send(json.dumps(initial_state))

    async def _handle_message(self, websocket: WebSocketServerProtocol, message: str) -> None:
        """
        Handle incoming WebSocket messages.

        Args:
            websocket: WebSocket connection
            message: Raw message string
        """
        try:
            data = json.loads(message)
            msg_type = data.get('type')

            if msg_type == 'ping':
                await websocket.send(json.dumps({'type': 'pong'}))

            elif msg_type == 'request_status':
                status = {
                    'type': 'status',
                    'connection_status': self.connection_status,
                    'buffer_status': self.latest_buffer_status,
                    'connected_clients': len(self.clients)
                }
                await websocket.send(json.dumps(status))

        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {message}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")

    async def broadcast_coherence(self, coherence_data: dict) -> None:
        """
        Broadcast coherence update to all connected clients.

        Args:
            coherence_data: Coherence calculation result
        """
        self.latest_coherence = coherence_data

        message = {
            'type': 'coherence_update',
            'timestamp': asyncio.get_event_loop().time(),
            'data': coherence_data
        }

        await self._broadcast(message)

    async def broadcast_heartbeat(self, rr_interval: float) -> None:
        """
        Broadcast individual heartbeat event to all connected clients.

        Args:
            rr_interval: RR interval in milliseconds
        """
        message = {
            'type': 'heartbeat',
            'timestamp': asyncio.get_event_loop().time(),
            'data': {
                'rr_interval': rr_interval,
                'heart_rate': 60000 / rr_interval if rr_interval > 0 else 0
            }
        }

        await self._broadcast(message)

    async def broadcast_buffer_status(self, buffer_status: dict) -> None:
        """
        Broadcast buffer status to all connected clients.

        Args:
            buffer_status: Buffer statistics
        """
        self.latest_buffer_status = buffer_status

        message = {
            'type': 'buffer_status',
            'timestamp': asyncio.get_event_loop().time(),
            'data': buffer_status
        }

        await self._broadcast(message)

    async def broadcast_connection_status(self, status: dict) -> None:
        """
        Broadcast Polar H10 connection status.

        Args:
            status: Connection status dictionary
        """
        self.connection_status = {
            'polar_h10_connected': status.get('connected', False),
            'device_name': status.get('device_name'),
            'device_address': status.get('client_address')
        }

        message = {
            'type': 'connection_status',
            'timestamp': asyncio.get_event_loop().time(),
            'data': self.connection_status
        }

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
        await asyncio.gather(
            *[client.send(message_json) for client in self.clients],
            return_exceptions=True
        )

    def get_stats(self) -> dict:
        """
        Get server statistics.

        Returns:
            Dictionary with server stats
        """
        return {
            'connected_clients': len(self.clients),
            'host': self.host,
            'port': self.port,
            'has_coherence_data': self.latest_coherence is not None,
            'polar_connected': self.connection_status['polar_h10_connected']
        }
