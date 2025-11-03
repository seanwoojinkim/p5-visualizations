"""
Tests for EEG WebSocket Server

Tests message broadcasting, client connection/disconnection, protocol switching
commands, baseline calibration commands, rate limiting, and security features.
"""

import pytest
import asyncio
import json
import websockets
from unittest.mock import Mock, patch
import time

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from websocket_server import EEGWebSocketServer


@pytest.fixture
def config():
    """Standard test configuration."""
    return {
        'websocket': {
            'host': 'localhost',
            'port': 8767,  # Different port to avoid conflicts
            'cors_origins': ['*']
        }
    }


@pytest.fixture
def mock_integration_manager():
    """Create a mock integration manager for testing."""
    manager = Mock()

    # Create async mock methods
    async def mock_switch(protocol_name):
        return True

    async def mock_start_baseline(duration):
        return None

    async def mock_finish_baseline():
        return None

    manager.switch_protocol = Mock(side_effect=mock_switch)
    manager.start_baseline_calibration = Mock(side_effect=mock_start_baseline)
    manager.finish_baseline_calibration = Mock(side_effect=mock_finish_baseline)

    return manager


@pytest.fixture
async def server(config, mock_integration_manager):
    """Create and start a WebSocket server for testing."""
    server = EEGWebSocketServer(config, integration_manager=mock_integration_manager)

    # Start server in background
    server_task = asyncio.create_task(server.start())

    # Give server time to start
    await asyncio.sleep(0.5)

    yield server

    # Stop server
    await server.stop()
    await asyncio.sleep(0.2)

    # Cancel task if still running
    if not server_task.done():
        server_task.cancel()
        try:
            await server_task
        except asyncio.CancelledError:
            pass


@pytest.mark.asyncio
async def test_server_initialization(config, mock_integration_manager):
    """Test that server initializes with correct config."""
    server = EEGWebSocketServer(config, integration_manager=mock_integration_manager)

    assert server.host == 'localhost'
    assert server.port == 8767
    assert server.cors_origins == ['*']
    assert len(server.clients) == 0
    assert server.latest_coherence is None
    assert server.latest_eeg_update is None
    assert server.integration_manager is not None


@pytest.mark.asyncio
async def test_client_connection(server):
    """Test that clients can connect and receive initial state."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        # Should receive initial state immediately
        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(message)

        assert data['type'] == 'initial_state'
        assert 'connection_status' in data
        assert 'latest_coherence' in data
        assert 'buffer_status' in data

        # Server should track the client
        assert len(server.clients) == 1


@pytest.mark.asyncio
async def test_multiple_clients(server):
    """Test that multiple clients can connect simultaneously."""
    uri = f"ws://{server.host}:{server.port}"

    # Connect 3 clients
    async with websockets.connect(uri) as ws1:
        async with websockets.connect(uri) as ws2:
            async with websockets.connect(uri) as ws3:
                # All should receive initial state
                msg1 = await asyncio.wait_for(ws1.recv(), timeout=2.0)
                msg2 = await asyncio.wait_for(ws2.recv(), timeout=2.0)
                msg3 = await asyncio.wait_for(ws3.recv(), timeout=2.0)

                assert json.loads(msg1)['type'] == 'initial_state'
                assert json.loads(msg2)['type'] == 'initial_state'
                assert json.loads(msg3)['type'] == 'initial_state'

                # Server should track all clients
                assert len(server.clients) == 3


@pytest.mark.asyncio
async def test_max_clients_limit(server):
    """Test that server enforces maximum client limit."""
    uri = f"ws://{server.host}:{server.port}"

    # Temporarily reduce limit for testing
    original_limit = server.MAX_CLIENTS
    server.MAX_CLIENTS = 2

    try:
        # Connect up to limit
        ws1 = await websockets.connect(uri)
        ws2 = await websockets.connect(uri)

        # Wait for initial states
        await ws1.recv()
        await ws2.recv()

        assert len(server.clients) == 2

        # Try to connect one more (should be rejected)
        with pytest.raises(websockets.exceptions.ConnectionClosedError) as exc_info:
            async with websockets.connect(uri) as ws3:
                await asyncio.wait_for(ws3.recv(), timeout=2.0)

        # Check close code is 1008 (Policy Violation - server full)
        assert exc_info.value.code == 1008

        await ws1.close()
        await ws2.close()

    finally:
        server.MAX_CLIENTS = original_limit


@pytest.mark.asyncio
async def test_ping_pong(server):
    """Test ping/pong keep-alive mechanism."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        # Receive and discard initial state
        await websocket.recv()

        # Send ping
        await websocket.send(json.dumps({'type': 'ping'}))

        # Should receive pong
        response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(response)

        assert data['type'] == 'pong'
        assert 'timestamp' in data


@pytest.mark.asyncio
async def test_request_status(server):
    """Test status request command."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        # Discard initial state
        await websocket.recv()

        # Request status
        await websocket.send(json.dumps({'type': 'request_status'}))

        # Should receive status
        response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(response)

        assert data['type'] == 'status'
        assert 'connection_status' in data
        assert 'buffer_status' in data
        assert 'connected_clients' in data
        assert data['connected_clients'] == 1


@pytest.mark.asyncio
async def test_switch_protocol_command(server, mock_integration_manager):
    """Test protocol switching command."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Send protocol switch command
        await websocket.send(json.dumps({
            'type': 'switch_protocol',
            'protocol': 'theta_beta_ratio'
        }))

        # Should receive acknowledgment
        response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(response)

        assert data['type'] == 'protocol_switch_requested'
        assert data['protocol'] == 'theta_beta_ratio'

        # Give time for async task to execute
        await asyncio.sleep(0.2)

        # Verify integration manager method was called
        mock_integration_manager.switch_protocol.assert_called_once_with('theta_beta_ratio')


@pytest.mark.asyncio
async def test_baseline_commands(server, mock_integration_manager):
    """Test baseline calibration commands."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Start baseline with custom duration
        await websocket.send(json.dumps({
            'type': 'start_baseline',
            'duration': 30
        }))
        response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(response)
        assert data['type'] == 'baseline_start_requested'
        assert data['duration'] == 30

        # Give time for async task to execute
        await asyncio.sleep(0.2)

        # Verify start baseline was called with correct duration
        mock_integration_manager.start_baseline_calibration.assert_called_once_with(30)

        # Finish baseline
        await websocket.send(json.dumps({'type': 'finish_baseline'}))
        response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(response)
        assert data['type'] == 'baseline_finish_requested'

        # Give time for async task to execute
        await asyncio.sleep(0.2)

        # Verify finish baseline was called
        mock_integration_manager.finish_baseline_calibration.assert_called_once()


@pytest.mark.asyncio
async def test_broadcast_coherence(server):
    """Test broadcasting coherence updates to all clients."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as ws1:
        async with websockets.connect(uri) as ws2:
            # Discard initial states
            await ws1.recv()
            await ws2.recv()

            # Broadcast coherence update
            test_metrics = {
                'protocol': 'alpha_enhancement',
                'score': 75.5,
                'direction': 'higher',
                'feedback_level': 'good',
                'details': {'alpha_power': 45.2},
                'timestamp': time.time()
            }

            await server.broadcast_coherence(test_metrics)

            # Both clients should receive it
            msg1 = await asyncio.wait_for(ws1.recv(), timeout=2.0)
            msg2 = await asyncio.wait_for(ws2.recv(), timeout=2.0)

            data1 = json.loads(msg1)
            data2 = json.loads(msg2)

            assert data1['type'] == 'coherence_update'
            assert data1['data']['score'] == 75.5
            assert data2['type'] == 'coherence_update'
            assert data2['data']['score'] == 75.5


@pytest.mark.asyncio
async def test_broadcast_eeg_update(server):
    """Test broadcasting EEG band power updates."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Broadcast EEG update
        test_band_powers = {
            'delta': 10.5,
            'theta': 15.2,
            'alpha': 45.8,
            'beta': 28.3,
            'gamma': 12.1,
            'channels': {},
            'timestamp': time.time()
        }

        await server.broadcast_eeg_update(test_band_powers)

        # Client should receive it
        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(message)

        assert data['type'] == 'eeg_update'
        assert data['data']['alpha'] == 45.8
        assert data['data']['beta'] == 28.3


@pytest.mark.asyncio
async def test_broadcast_buffer_status(server):
    """Test broadcasting buffer status."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Broadcast buffer status
        test_status = {
            'ready': True,
            'window_size': 512,
            'channels': {
                'TP9': {'samples': 512, 'ready': True},
                'AF7': {'samples': 512, 'ready': True}
            }
        }

        await server.broadcast_buffer_status(test_status)

        # Client should receive it
        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(message)

        assert data['type'] == 'buffer_status'
        assert data['data']['ready'] is True
        assert data['data']['window_size'] == 512


@pytest.mark.asyncio
async def test_broadcast_connection_status(server):
    """Test broadcasting connection status updates."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Broadcast connection status
        test_status = {
            'connected': True,
            'device_name': 'Muse-1234',
            'current_protocol': 'alpha_enhancement',
            'baseline_calibrated': False
        }

        await server.broadcast_connection_status(test_status)

        # Client should receive it
        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(message)

        assert data['type'] == 'connection_status'
        assert data['data']['muse_connected'] is True
        assert data['data']['device_name'] == 'Muse-1234'


@pytest.mark.asyncio
async def test_broadcast_baseline_progress(server):
    """Test broadcasting baseline calibration progress."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Broadcast baseline progress
        test_progress = {
            'state': 'calibrating',
            'samples_collected': 30,
            'samples_required': 60,
            'percent_complete': 50.0
        }

        await server.broadcast_baseline_progress(test_progress)

        # Client should receive it
        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(message)

        assert data['type'] == 'baseline_progress'
        assert data['data']['state'] == 'calibrating'
        assert data['data']['percent_complete'] == 50.0


@pytest.mark.asyncio
async def test_broadcast_protocol_switched(server):
    """Test broadcasting protocol switch confirmation."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Broadcast protocol switch
        await server.broadcast_protocol_switched(
            'theta_beta_ratio',
            success=True,
            message_text='Successfully switched'
        )

        # Client should receive it
        message = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(message)

        assert data['type'] == 'protocol_switched'
        assert data['data']['protocol'] == 'theta_beta_ratio'
        assert data['data']['success'] is True
        assert data['data']['message'] == 'Successfully switched'


@pytest.mark.asyncio
async def test_rate_limiting(server):
    """Test that rate limiting prevents message floods."""
    uri = f"ws://{server.host}:{server.port}"

    # Temporarily reduce limit for testing
    original_limit = server.MAX_MESSAGES_PER_SECOND
    server.MAX_MESSAGES_PER_SECOND = 5

    try:
        async with websockets.connect(uri) as websocket:
            await websocket.recv()  # Initial state

            # Send many messages rapidly
            for i in range(10):
                await websocket.send(json.dumps({'type': 'ping'}))

            # Should receive some pongs but then get disconnected
            with pytest.raises((websockets.exceptions.ConnectionClosedError, asyncio.TimeoutError)):
                for i in range(10):
                    await asyncio.wait_for(websocket.recv(), timeout=1.0)

    finally:
        server.MAX_MESSAGES_PER_SECOND = original_limit


@pytest.mark.asyncio
async def test_message_size_limit(server):
    """Test that oversized messages are rejected."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Send oversized message
        huge_message = json.dumps({'type': 'ping', 'data': 'x' * 2000})

        with pytest.raises(websockets.exceptions.ConnectionClosedError) as exc_info:
            await websocket.send(huge_message)
            # Try to receive (should fail due to disconnection)
            await asyncio.wait_for(websocket.recv(), timeout=2.0)

        # Check close code is 1009 (Message Too Big)
        assert exc_info.value.code == 1009


@pytest.mark.asyncio
async def test_invalid_json(server):
    """Test handling of invalid JSON messages."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Send invalid JSON
        await websocket.send("this is not json {{{")

        # Server should handle gracefully and stay connected
        # Send valid message to verify connection still works
        await websocket.send(json.dumps({'type': 'ping'}))
        response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
        data = json.loads(response)
        assert data['type'] == 'pong'


@pytest.mark.asyncio
async def test_client_disconnect_cleanup(server):
    """Test that disconnected clients are cleaned up properly."""
    uri = f"ws://{server.host}:{server.port}"

    # Connect client
    websocket = await websockets.connect(uri)
    await websocket.recv()  # Initial state

    assert len(server.clients) == 1

    # Disconnect
    await websocket.close()
    await asyncio.sleep(0.2)

    # Should be cleaned up
    assert len(server.clients) == 0


@pytest.mark.asyncio
async def test_get_stats(server):
    """Test server statistics method."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Get stats
        stats = server.get_stats()

        assert stats['connected_clients'] == 1
        assert stats['host'] == 'localhost'
        assert stats['port'] == 8767
        assert stats['has_coherence_data'] is False

        # Broadcast some data
        await server.broadcast_coherence({'score': 75})

        # Stats should update
        stats = server.get_stats()
        assert stats['has_coherence_data'] is True


@pytest.mark.asyncio
async def test_concurrent_broadcasts(server):
    """Test that concurrent broadcasts work correctly."""
    uri = f"ws://{server.host}:{server.port}"

    async with websockets.connect(uri) as websocket:
        await websocket.recv()  # Initial state

        # Broadcast multiple types concurrently
        await asyncio.gather(
            server.broadcast_coherence({'score': 75}),
            server.broadcast_eeg_update({'alpha': 45}),
            server.broadcast_buffer_status({'ready': True})
        )

        # Should receive all three
        messages = []
        for _ in range(3):
            msg = await asyncio.wait_for(websocket.recv(), timeout=2.0)
            messages.append(json.loads(msg))

        types = [msg['type'] for msg in messages]
        assert 'coherence_update' in types
        assert 'eeg_update' in types
        assert 'buffer_status' in types


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
