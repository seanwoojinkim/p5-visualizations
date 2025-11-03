"""
Tests for Integration Manager

Tests full pipeline with mock LSL stream, protocol switching, baseline
calibration, connection recovery, and error handling.
"""

import pytest
import asyncio
import numpy as np
from unittest.mock import Mock, patch, MagicMock, AsyncMock
import time

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from integration_manager import IntegrationManager


# Mock pylsl components
class MockStreamInfo:
    """Mock LSL StreamInfo."""

    def __init__(self):
        self._name = "Muse-1234"
        self._channel_count = 5

    def name(self):
        return self._name

    def channel_count(self):
        return self._channel_count

    def nominal_srate(self):
        return 256


class MockStreamInlet:
    """Mock LSL StreamInlet for testing."""

    def __init__(self, stream):
        self.stream = stream
        self._info = MockStreamInfo()
        self.sample_count = 0
        self.closed = False

    def info(self):
        return self._info

    def pull_sample(self, timeout=0.0):
        """Return mock EEG sample."""
        if self.closed:
            return None, None

        # Generate realistic EEG data (5 channels including AUX)
        sample = [
            np.random.randn() * 10,  # TP9
            np.random.randn() * 10,  # AF7
            np.random.randn() * 10,  # AF8
            np.random.randn() * 10,  # TP10
            0.0                      # AUX (unused)
        ]
        timestamp = time.time()
        self.sample_count += 1
        return sample, timestamp

    def close_stream(self):
        self.closed = True


@pytest.fixture
def config():
    """Standard test configuration."""
    return {
        'muse': {
            'stream_type': 'EEG',
            'connection_timeout': 1,
            'reconnect_delay': 1,
            'max_reconnect_attempts': 3,
            'sample_rate': 256,
            'channel_count': 4,
            'channel_names': ['TP9', 'AF7', 'AF8', 'TP10']
        },
        'signal_processing': {
            'sample_rate': 256,
            'window_duration': 0.5,  # Short for faster tests
            'window_overlap': 0.5,
            'frequency_bands': {
                'delta': [0.5, 4],
                'theta': [4, 8],
                'alpha': [8, 13],
                'beta': [12, 30],
                'gamma': [30, 50]
            },
            'bandpass': {
                'enabled': True,
                'low_cutoff': 0.5,
                'high_cutoff': 50,
                'order': 4
            },
            'notch': {
                'enabled': True,
                'frequency': 60,
                'quality_factor': 30
            }
        },
        'protocols': {
            'default': 'alpha_enhancement',
            'update_interval': 0.1  # Fast updates for testing
        },
        'websocket': {
            'host': 'localhost',
            'port': 8768,  # Different port to avoid conflicts
            'cors_origins': ['*']
        }
    }


@pytest.fixture
def mock_lsl():
    """Mock pylsl functions."""
    with patch('integration_manager.resolve_byprop') as mock_resolve:
        with patch('integration_manager.StreamInlet', MockStreamInlet):
            # Mock stream resolution
            mock_stream = Mock()
            mock_resolve.return_value = [mock_stream]
            yield mock_resolve


@pytest.mark.asyncio
async def test_initialization(config):
    """Test IntegrationManager initialization."""
    manager = IntegrationManager(config)

    assert manager.config == config
    assert manager.running is False
    assert manager.protocol.name == 'Alpha Enhancement'
    assert manager.signal_processor is not None
    assert manager.protocol_calculator is not None
    assert manager.websocket_server is not None


@pytest.mark.asyncio
async def test_start_and_stop(config, mock_lsl):
    """Test starting and stopping the integration manager."""
    manager = IntegrationManager(config)

    # Start in background
    start_task = asyncio.create_task(manager.start())

    # Give it time to start
    await asyncio.sleep(0.5)

    assert manager.running is True
    assert manager.inlet is not None

    # Stop
    await manager.stop()
    await asyncio.sleep(0.2)

    assert manager.running is False

    # Clean up task
    start_task.cancel()
    try:
        await start_task
    except asyncio.CancelledError:
        pass


@pytest.mark.asyncio
async def test_muse_connection(config, mock_lsl):
    """Test Muse connection via LSL."""
    manager = IntegrationManager(config)

    success = await manager._connect_to_muse()

    assert success is True
    assert manager.inlet is not None
    assert manager.connection_attempts == 0


@pytest.mark.asyncio
async def test_muse_connection_failure(config):
    """Test handling of Muse connection failure."""
    with patch('integration_manager.resolve_byprop') as mock_resolve:
        # Return no streams (connection failure)
        mock_resolve.return_value = []

        manager = IntegrationManager(config)
        success = await manager._connect_to_muse()

        assert success is False
        assert manager.inlet is None
        assert manager.connection_attempts == 1


@pytest.mark.asyncio
async def test_sample_processing(config, mock_lsl):
    """Test processing samples from Muse."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Process some samples
    for _ in range(200):  # Enough to fill buffer
        sample, timestamp = manager.inlet.pull_sample()
        if sample:
            for i, channel in enumerate(manager.expected_channels):
                manager.signal_processor.add_samples(channel, [sample[i]])

    # Check buffer status
    status = manager.signal_processor.get_buffer_status()
    assert status['ready'] is True


@pytest.mark.asyncio
async def test_calculate_and_broadcast(config, mock_lsl):
    """Test metric calculation and broadcasting."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Start WebSocket server
    asyncio.create_task(manager.websocket_server.start())
    await asyncio.sleep(0.3)

    # Fill buffer with samples
    for _ in range(200):
        sample, timestamp = manager.inlet.pull_sample()
        for i, channel in enumerate(manager.expected_channels):
            manager.signal_processor.add_samples(channel, [sample[i]])

    # Calculate and broadcast
    await manager._calculate_and_broadcast()

    # Check that data was cached in WebSocket server
    assert manager.websocket_server.latest_coherence is not None
    assert manager.websocket_server.latest_eeg_update is not None

    # Verify metrics structure
    metrics = manager.websocket_server.latest_coherence
    assert 'score' in metrics
    assert 'protocol' in metrics
    assert 'feedback_level' in metrics

    # Stop WebSocket
    await manager.websocket_server.stop()


@pytest.mark.asyncio
async def test_protocol_switching(config, mock_lsl):
    """Test switching between protocols at runtime."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Start WebSocket
    asyncio.create_task(manager.websocket_server.start())
    await asyncio.sleep(0.3)

    # Initial protocol
    assert manager.protocol.name == 'Alpha Enhancement'

    # Switch protocol
    success = await manager.switch_protocol('theta_beta_ratio')

    assert success is True
    assert manager.protocol.name == 'Theta/Beta Ratio'

    # Check that WebSocket was notified
    connection_status = manager.websocket_server.connection_status
    assert connection_status['current_protocol'] == 'theta_beta_ratio'

    # Stop WebSocket
    await manager.websocket_server.stop()


@pytest.mark.asyncio
async def test_protocol_switching_invalid(config, mock_lsl):
    """Test switching to invalid protocol."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Start WebSocket
    asyncio.create_task(manager.websocket_server.start())
    await asyncio.sleep(0.3)

    # Try invalid protocol
    success = await manager.switch_protocol('invalid_protocol')

    assert success is False
    assert manager.protocol.name == 'Alpha Enhancement'  # Should stay unchanged

    # Stop WebSocket
    await manager.websocket_server.stop()


@pytest.mark.asyncio
async def test_baseline_calibration(config, mock_lsl):
    """Test baseline calibration workflow."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Start WebSocket
    asyncio.create_task(manager.websocket_server.start())
    await asyncio.sleep(0.3)

    # Start baseline calibration (short duration for testing)
    await manager.start_baseline_calibration(duration_seconds=1)

    assert manager.baseline_state == 'calibrating'
    assert manager.baseline_target_count > 0

    # Fill buffer
    for _ in range(200):
        sample, timestamp = manager.inlet.pull_sample()
        for i, channel in enumerate(manager.expected_channels):
            manager.signal_processor.add_samples(channel, [sample[i]])

    # Process baseline samples
    for _ in range(manager.baseline_target_count):
        await manager._calculate_and_broadcast()
        await asyncio.sleep(0.01)

    # Should auto-finish
    assert manager.baseline_state == 'complete'
    assert manager.protocol_calculator.baseline_calibrated is True

    # Stop WebSocket
    await manager.websocket_server.stop()


@pytest.mark.asyncio
async def test_baseline_finish_without_start(config, mock_lsl):
    """Test finishing baseline when not started."""
    manager = IntegrationManager(config)

    # Try to finish without starting
    await manager.finish_baseline_calibration()

    # Should handle gracefully
    assert manager.baseline_state == 'idle'


@pytest.mark.asyncio
async def test_pause_and_resume(config, mock_lsl):
    """Test pausing and resuming processing."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    assert manager.paused is False

    # Pause
    manager.pause()
    assert manager.paused is True

    # Resume
    manager.resume()
    assert manager.paused is False


@pytest.mark.asyncio
async def test_get_status(config, mock_lsl):
    """Test getting manager status."""
    manager = IntegrationManager(config)

    # Get status before connection
    status = manager.get_status()

    assert status['running'] is False
    assert status['muse_connected'] is False
    assert status['current_protocol'] == 'Alpha Enhancement'
    assert status['baseline_state'] == 'idle'

    # Connect
    await manager._connect_to_muse()

    # Get status after connection
    status = manager.get_status()

    assert status['muse_connected'] is True


@pytest.mark.asyncio
async def test_connection_recovery(config):
    """Test connection recovery after loss."""
    with patch('integration_manager.resolve_byprop') as mock_resolve:
        with patch('integration_manager.StreamInlet', MockStreamInlet):
            # First call succeeds, second fails, third succeeds
            mock_stream = Mock()
            mock_resolve.side_effect = [
                [mock_stream],  # Initial connection
                [],             # Reconnect fails
                [mock_stream]   # Reconnect succeeds
            ]

            manager = IntegrationManager(config)

            # Initial connection
            success = await manager._connect_to_muse()
            assert success is True

            # Simulate connection loss
            manager.inlet.close()
            manager.inlet = None

            # Trigger reconnect
            await manager._handle_reconnect()

            # Should have reconnected
            assert manager.inlet is not None


@pytest.mark.asyncio
async def test_error_handling_in_processing(config, mock_lsl):
    """Test error handling during processing."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Create a mock inlet that raises an exception
    def pull_sample_error(timeout=0.0):
        raise Exception("Test error")

    manager.inlet.pull_sample = pull_sample_error

    # Processing loop should handle errors gracefully
    # We'll just test that _calculate_and_broadcast handles errors
    try:
        await manager._calculate_and_broadcast()
        # Should not crash
    except Exception:
        pytest.fail("Error not handled in _calculate_and_broadcast")


@pytest.mark.asyncio
async def test_websocket_stats(config, mock_lsl):
    """Test WebSocket server stats integration."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Get WebSocket stats
    stats = manager.websocket_server.get_stats()

    assert 'connected_clients' in stats
    assert 'muse_connected' in stats
    assert 'current_protocol' in stats


@pytest.mark.asyncio
async def test_buffer_status_broadcast(config, mock_lsl):
    """Test periodic buffer status broadcasting."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Start WebSocket
    asyncio.create_task(manager.websocket_server.start())
    await asyncio.sleep(0.3)

    # Get buffer status
    buffer_status = manager.signal_processor.get_buffer_status()

    # Broadcast it
    await manager.websocket_server.broadcast_buffer_status(buffer_status)

    # Check it was cached
    assert manager.websocket_server.latest_buffer_status is not None

    # Stop WebSocket
    await manager.websocket_server.stop()


@pytest.mark.asyncio
async def test_signal_quality_checking(config, mock_lsl):
    """Test signal quality is included in metrics."""
    manager = IntegrationManager(config)

    # Connect
    await manager._connect_to_muse()

    # Start WebSocket
    asyncio.create_task(manager.websocket_server.start())
    await asyncio.sleep(0.3)

    # Fill buffer with samples
    for _ in range(200):
        sample, timestamp = manager.inlet.pull_sample()
        for i, channel in enumerate(manager.expected_channels):
            manager.signal_processor.add_samples(channel, [sample[i]])

    # Calculate and broadcast
    await manager._calculate_and_broadcast()

    # Check metrics include signal quality
    metrics = manager.websocket_server.latest_coherence
    assert 'signal_quality' in metrics
    assert metrics['signal_quality'] in ['good', 'fair', 'poor', 'unknown']

    # Stop WebSocket
    await manager.websocket_server.stop()


@pytest.mark.asyncio
async def test_integration_with_all_protocols(config, mock_lsl):
    """Test integration with all available protocols."""
    protocols = [
        'alpha_enhancement',
        'theta_beta_ratio',
        'alpha_asymmetry',
        'theta_enhancement',
        'beta_enhancement'
    ]

    for protocol_name in protocols:
        # Set protocol in config
        config['protocols']['default'] = protocol_name

        manager = IntegrationManager(config)

        # Connect
        await manager._connect_to_muse()

        # Verify protocol is set
        assert manager.protocol is not None

        # Fill buffer
        for _ in range(200):
            sample, timestamp = manager.inlet.pull_sample()
            for i, channel in enumerate(manager.expected_channels):
                manager.signal_processor.add_samples(channel, [sample[i]])

        # Calculate metrics
        band_powers = manager.signal_processor.calculate_band_powers()
        assert band_powers is not None

        metrics = manager.protocol_calculator.calculate(band_powers)
        assert metrics is not None
        assert 'score' in metrics
        assert 'protocol' in metrics


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
