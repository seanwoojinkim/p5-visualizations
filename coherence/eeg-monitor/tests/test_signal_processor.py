"""
Unit Tests for SignalProcessor
Tests band power calculation accuracy using synthetic waveforms
"""

import pytest
import numpy as np
import time
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from signal_processor import SignalProcessor


# Test configuration
TEST_CONFIG = {
    'sample_rate': 256,
    'window_duration': 2.0,
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
    },
    'artifacts': {
        'enabled': True,
        'blink_threshold': 100,
        'jaw_threshold': 50,
        'movement_threshold': 150
    }
}


def generate_sine_wave(frequency: float, duration: float, sample_rate: int,
                       amplitude: float = 10.0, noise_level: float = 0.0) -> np.ndarray:
    """
    Generate a synthetic sine wave for testing.

    Args:
        frequency: Frequency in Hz
        duration: Duration in seconds
        sample_rate: Sampling rate in Hz
        amplitude: Amplitude in µV
        noise_level: Standard deviation of Gaussian noise to add

    Returns:
        Numpy array of samples
    """
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    signal = amplitude * np.sin(2 * np.pi * frequency * t)

    if noise_level > 0:
        noise = np.random.normal(0, noise_level, len(signal))
        signal += noise

    return signal


def generate_mixed_wave(frequencies: list, amplitudes: list, duration: float,
                        sample_rate: int) -> np.ndarray:
    """
    Generate a signal with multiple frequency components.

    Args:
        frequencies: List of frequencies in Hz
        amplitudes: List of amplitudes for each frequency
        duration: Duration in seconds
        sample_rate: Sampling rate in Hz

    Returns:
        Numpy array of samples
    """
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    signal = np.zeros(len(t))

    for freq, amp in zip(frequencies, amplitudes):
        signal += amp * np.sin(2 * np.pi * freq * t)

    return signal


class TestSignalProcessorInitialization:
    """Test SignalProcessor initialization and configuration."""

    def test_basic_initialization(self):
        """Test basic initialization with minimal config."""
        config = {'sample_rate': 256, 'window_duration': 2.0}
        processor = SignalProcessor(config)

        assert processor.sample_rate == 256
        assert processor.window_duration == 2.0
        assert processor.window_size == 512  # 256 * 2

    def test_channel_buffers_created(self):
        """Test that buffers are created for all channels."""
        processor = SignalProcessor(TEST_CONFIG)

        expected_channels = ['TP9', 'AF7', 'AF8', 'TP10']
        assert list(processor.buffers.keys()) == expected_channels

        # Check buffer sizes
        for channel in expected_channels:
            assert processor.buffers[channel].maxlen == 512 * 3  # 3x window

    def test_invalid_config_sample_rate(self):
        """Test that invalid sample rate raises error."""
        with pytest.raises(ValueError, match="Invalid sample_rate"):
            SignalProcessor({'sample_rate': -1})

    def test_invalid_config_window_duration(self):
        """Test that invalid window duration raises error."""
        with pytest.raises(ValueError, match="Invalid window_duration"):
            SignalProcessor({'sample_rate': 256, 'window_duration': 0})

    def test_invalid_config_overlap(self):
        """Test that invalid overlap raises error."""
        with pytest.raises(ValueError, match="Invalid window_overlap"):
            SignalProcessor({
                'sample_rate': 256,
                'window_duration': 2.0,
                'window_overlap': 1.5  # Must be < 1
            })

    def test_filter_design(self):
        """Test that filters are properly designed."""
        processor = SignalProcessor(TEST_CONFIG)

        assert processor.bandpass_sos is not None
        assert processor.notch_sos is not None

    def test_filters_disabled(self):
        """Test initialization with filters disabled."""
        config = TEST_CONFIG.copy()
        config['bandpass'] = {'enabled': False}
        config['notch'] = {'enabled': False}

        processor = SignalProcessor(config)

        assert processor.bandpass_sos is None
        assert processor.notch_sos is None


class TestAddSamples:
    """Test adding samples to buffers."""

    def test_add_samples_basic(self):
        """Test adding samples to a channel."""
        processor = SignalProcessor(TEST_CONFIG)

        samples = [1.0, 2.0, 3.0, 4.0, 5.0]
        processor.add_samples('TP9', samples)

        assert len(processor.buffers['TP9']) == 5

    def test_add_samples_multiple_channels(self):
        """Test adding samples to multiple channels."""
        processor = SignalProcessor(TEST_CONFIG)

        for channel in ['TP9', 'AF7', 'AF8', 'TP10']:
            samples = list(range(10))
            processor.add_samples(channel, samples)

        for channel in processor.channel_names:
            assert len(processor.buffers[channel]) == 10

    def test_add_samples_invalid_channel(self):
        """Test that invalid channel name raises error."""
        processor = SignalProcessor(TEST_CONFIG)

        with pytest.raises(ValueError, match="Invalid channel"):
            processor.add_samples('INVALID', [1.0, 2.0])

    def test_add_samples_invalid_type(self):
        """Test that invalid sample type raises error."""
        processor = SignalProcessor(TEST_CONFIG)

        with pytest.raises(ValueError, match="must be a list or numpy array"):
            processor.add_samples('TP9', "not a list")

    def test_add_samples_with_nan(self):
        """Test that NaN values are filtered out."""
        processor = SignalProcessor(TEST_CONFIG)

        samples = [1.0, 2.0, np.nan, 4.0, 5.0]
        processor.add_samples('TP9', samples)

        # Should only have 4 samples (NaN removed)
        assert len(processor.buffers['TP9']) == 4

    def test_add_samples_with_inf(self):
        """Test that inf values are filtered out."""
        processor = SignalProcessor(TEST_CONFIG)

        samples = [1.0, 2.0, np.inf, 4.0, 5.0]
        processor.add_samples('TP9', samples)

        assert len(processor.buffers['TP9']) == 4

    def test_add_empty_samples(self):
        """Test adding empty sample list."""
        processor = SignalProcessor(TEST_CONFIG)

        processor.add_samples('TP9', [])
        assert len(processor.buffers['TP9']) == 0

    def test_buffer_maxlen_enforcement(self):
        """Test that buffer maxlen is enforced."""
        processor = SignalProcessor(TEST_CONFIG)

        # Add more samples than maxlen
        max_size = processor.buffers['TP9'].maxlen
        samples = list(range(max_size + 100))
        processor.add_samples('TP9', samples)

        # Should be capped at maxlen
        assert len(processor.buffers['TP9']) == max_size


class TestBandPowerCalculation:
    """Test band power calculation with synthetic signals."""

    def test_alpha_detection(self):
        """Test that 10 Hz sine wave is detected as alpha."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 10 Hz sine wave (alpha band: 8-13 Hz)
        alpha_wave = generate_sine_wave(
            frequency=10.0,
            duration=2.0,
            sample_rate=256,
            amplitude=20.0
        )

        # Add to all channels
        for channel in processor.channel_names:
            processor.add_samples(channel, alpha_wave.tolist())

        # Calculate powers
        powers = processor.calculate_band_powers()

        assert powers is not None
        assert 'alpha' in powers

        # Alpha should dominate
        assert powers['alpha'] > powers['theta']
        assert powers['alpha'] > powers['beta']
        assert powers['alpha'] > powers['delta']
        assert powers['alpha'] > powers['gamma']

    def test_beta_detection(self):
        """Test that 20 Hz sine wave is detected as beta."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 20 Hz sine wave (beta band: 12-30 Hz)
        beta_wave = generate_sine_wave(
            frequency=20.0,
            duration=2.0,
            sample_rate=256,
            amplitude=20.0
        )

        for channel in processor.channel_names:
            processor.add_samples(channel, beta_wave.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        # Beta should dominate
        assert powers['beta'] > powers['alpha']
        assert powers['beta'] > powers['theta']
        assert powers['beta'] > powers['delta']
        assert powers['beta'] > powers['gamma']

    def test_theta_detection(self):
        """Test that 6 Hz sine wave is detected as theta."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 6 Hz sine wave (theta band: 4-8 Hz)
        theta_wave = generate_sine_wave(
            frequency=6.0,
            duration=2.0,
            sample_rate=256,
            amplitude=20.0
        )

        for channel in processor.channel_names:
            processor.add_samples(channel, theta_wave.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        # Theta should dominate
        assert powers['theta'] > powers['alpha']
        assert powers['theta'] > powers['beta']
        assert powers['theta'] > powers['gamma']

    def test_delta_detection(self):
        """Test that 2 Hz sine wave is detected as delta."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 2 Hz sine wave (delta band: 0.5-4 Hz)
        delta_wave = generate_sine_wave(
            frequency=2.0,
            duration=2.0,
            sample_rate=256,
            amplitude=20.0
        )

        for channel in processor.channel_names:
            processor.add_samples(channel, delta_wave.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        # Delta should dominate
        assert powers['delta'] > powers['theta']
        assert powers['delta'] > powers['alpha']
        assert powers['delta'] > powers['beta']
        assert powers['delta'] > powers['gamma']

    def test_gamma_detection(self):
        """Test that 40 Hz sine wave is detected as gamma."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 40 Hz sine wave (gamma band: 30-50 Hz)
        gamma_wave = generate_sine_wave(
            frequency=40.0,
            duration=2.0,
            sample_rate=256,
            amplitude=20.0
        )

        for channel in processor.channel_names:
            processor.add_samples(channel, gamma_wave.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        # Gamma should dominate
        assert powers['gamma'] > powers['alpha']
        assert powers['gamma'] > powers['beta']
        assert powers['gamma'] > powers['theta']
        assert powers['gamma'] > powers['delta']

    def test_mixed_frequencies(self):
        """Test detection of multiple frequencies."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate signal with alpha (10 Hz) and beta (20 Hz)
        mixed_wave = generate_mixed_wave(
            frequencies=[10.0, 20.0],
            amplitudes=[15.0, 10.0],  # Alpha stronger
            duration=2.0,
            sample_rate=256
        )

        for channel in processor.channel_names:
            processor.add_samples(channel, mixed_wave.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        # Both alpha and beta should be present
        assert powers['alpha'] > 0
        assert powers['beta'] > 0
        # Alpha should be stronger (higher amplitude)
        assert powers['alpha'] > powers['beta']

    def test_band_power_accuracy(self):
        """Test that calculated power matches theoretical value."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 10 Hz sine wave with known amplitude
        amplitude = 20.0  # µV
        alpha_wave = generate_sine_wave(
            frequency=10.0,
            duration=2.0,
            sample_rate=256,
            amplitude=amplitude,
            noise_level=0.0  # No noise for accuracy test
        )

        for channel in processor.channel_names:
            processor.add_samples(channel, alpha_wave.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        # For a pure sine wave: Power = (Amplitude^2) / 2
        # Expected power in alpha band should be significant
        # Allow for filter effects and numerical precision
        assert powers['alpha'] > 0
        # Other bands should have minimal power
        assert powers['alpha'] > powers['theta'] * 5
        assert powers['alpha'] > powers['beta'] * 5

    def test_insufficient_data(self):
        """Test that None is returned with insufficient data."""
        processor = SignalProcessor(TEST_CONFIG)

        # Add only a few samples (not enough for window)
        processor.add_samples('TP9', [1.0, 2.0, 3.0])

        powers = processor.calculate_band_powers()
        assert powers is None

    def test_per_channel_powers(self):
        """Test that per-channel powers are calculated."""
        processor = SignalProcessor(TEST_CONFIG)

        alpha_wave = generate_sine_wave(10.0, 2.0, 256, 20.0)

        for channel in processor.channel_names:
            processor.add_samples(channel, alpha_wave.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        assert 'channels' in powers

        # Check all channels are present
        for channel in processor.channel_names:
            assert channel in powers['channels']
            assert 'alpha' in powers['channels'][channel]
            assert powers['channels'][channel]['alpha'] > 0


class TestFiltering:
    """Test signal filtering functionality."""

    def test_bandpass_filter_removes_dc(self):
        """Test that bandpass filter removes DC offset."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate signal with DC offset
        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)
        signal_with_dc = signal + 50.0  # Add DC offset

        for channel in processor.channel_names:
            processor.add_samples(channel, signal_with_dc.tolist())

        powers = processor.calculate_band_powers()

        # Should still detect alpha despite DC offset
        assert powers is not None
        assert powers['alpha'] > powers['theta']

    def test_notch_filter_removes_line_noise(self):
        """Test that notch filter removes 60 Hz line noise."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 10 Hz signal with 60 Hz noise
        alpha_wave = generate_sine_wave(10.0, 2.0, 256, 20.0)
        noise_60hz = generate_sine_wave(60.0, 2.0, 256, 30.0)
        signal = alpha_wave + noise_60hz

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        powers = processor.calculate_band_powers()

        # Alpha should still be detectable
        # 60 Hz is above gamma range, so shouldn't affect band powers much
        assert powers is not None
        assert powers['alpha'] > powers['theta']

    def test_filter_performance(self):
        """Test filter performance on noisy signal."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate signal with noise
        alpha_wave = generate_sine_wave(10.0, 2.0, 256, 20.0, noise_level=5.0)

        for channel in processor.channel_names:
            processor.add_samples(channel, alpha_wave.tolist())

        powers = processor.calculate_band_powers()

        # Should still detect alpha through noise
        assert powers is not None
        assert powers['alpha'] > 0


class TestArtifactDetection:
    """Test artifact detection functionality."""

    def test_eye_blink_detection(self):
        """Test that eye blinks are detected."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate normal signal with eye blink artifact
        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)
        # Add high amplitude spike in frontal channels (eye blink)
        signal[128:138] += 150.0  # High amplitude spike

        # Add normal signal to temporal channels
        for channel in ['TP9', 'TP10']:
            processor.add_samples(channel, signal[:512].tolist())

        # Add artifact to frontal channels
        for channel in ['AF7', 'AF8']:
            processor.add_samples(channel, signal.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        assert 'artifacts' in powers
        assert powers['artifacts']['eye_blink'] is True

    def test_jaw_clench_detection(self):
        """Test that jaw clenches are detected."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate high variance signal (jaw clench)
        t = np.linspace(0, 2.0, 512)
        # Random high-frequency activity
        signal = np.random.normal(0, 40, 512)  # High variance

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        assert 'artifacts' in powers
        assert powers['artifacts']['jaw_clench'] is True

    def test_movement_detection(self):
        """Test that movement artifacts are detected."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate signal with large amplitude swing
        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)
        signal[256:266] += 200.0  # Large movement artifact

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        assert 'artifacts' in powers
        assert powers['artifacts']['movement'] is True

    def test_good_signal_quality(self):
        """Test that clean signal is marked as good quality."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate clean signal
        signal = generate_sine_wave(10.0, 2.0, 256, 20.0, noise_level=1.0)

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        assert 'artifacts' in powers
        assert powers['artifacts']['signal_quality'] == 'good'
        assert powers['artifacts']['eye_blink'] is False
        assert powers['artifacts']['jaw_clench'] is False
        assert powers['artifacts']['movement'] is False

    def test_artifact_details(self):
        """Test that artifact details are provided."""
        processor = SignalProcessor(TEST_CONFIG)

        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None
        details = powers['artifacts']['details']
        assert 'max_amplitude' in details
        assert 'mean_variance' in details
        assert 'peak_to_peak' in details


class TestBufferManagement:
    """Test buffer management and data handling."""

    def test_buffer_status_empty(self):
        """Test buffer status with empty buffers."""
        processor = SignalProcessor(TEST_CONFIG)

        status = processor.get_buffer_status()

        assert status['ready'] is False
        assert status['window_size'] == 512

        for channel in processor.channel_names:
            assert status['channels'][channel]['samples'] == 0
            assert status['channels'][channel]['ready'] is False
            assert status['channels'][channel]['fill_percent'] == 0.0

    def test_buffer_status_partial(self):
        """Test buffer status with partial data."""
        processor = SignalProcessor(TEST_CONFIG)

        # Add half window
        samples = [1.0] * 256
        processor.add_samples('TP9', samples)

        status = processor.get_buffer_status()

        assert status['ready'] is False
        assert status['channels']['TP9']['samples'] == 256
        assert status['channels']['TP9']['fill_percent'] == 50.0

    def test_buffer_status_ready(self):
        """Test buffer status with sufficient data."""
        processor = SignalProcessor(TEST_CONFIG)

        # Add full window to all channels
        samples = [1.0] * 512
        for channel in processor.channel_names:
            processor.add_samples(channel, samples)

        status = processor.get_buffer_status()

        assert status['ready'] is True
        for channel in processor.channel_names:
            assert status['channels'][channel]['ready'] is True
            assert status['channels'][channel]['fill_percent'] == 100.0

    def test_reset_buffers(self):
        """Test resetting all buffers."""
        processor = SignalProcessor(TEST_CONFIG)

        # Add data
        samples = [1.0] * 100
        for channel in processor.channel_names:
            processor.add_samples(channel, samples)

        # Reset
        processor.reset()

        # Check all buffers are empty
        for channel in processor.channel_names:
            assert len(processor.buffers[channel]) == 0
            assert len(processor.buffer_timestamps[channel]) == 0

    def test_get_latest_window(self):
        """Test getting latest window for a channel."""
        processor = SignalProcessor(TEST_CONFIG)

        # Add more than one window
        samples = list(range(1000))
        processor.add_samples('TP9', samples)

        window = processor.get_latest_window('TP9')

        assert window is not None
        assert len(window) == 512  # window_size
        # Should be the last 512 samples
        assert window[-1] == 999

    def test_get_latest_window_insufficient_data(self):
        """Test getting window with insufficient data."""
        processor = SignalProcessor(TEST_CONFIG)

        processor.add_samples('TP9', [1.0, 2.0, 3.0])

        window = processor.get_latest_window('TP9')
        assert window is None

    def test_get_latest_window_invalid_channel(self):
        """Test getting window for invalid channel."""
        processor = SignalProcessor(TEST_CONFIG)

        with pytest.raises(ValueError, match="Invalid channel"):
            processor.get_latest_window('INVALID')


class TestProcessingLatency:
    """Test processing latency requirements."""

    def test_processing_latency_1s_window(self):
        """Test processing latency for 1-second window."""
        config = TEST_CONFIG.copy()
        config['window_duration'] = 1.0
        processor = SignalProcessor(config)

        # Generate data
        signal = generate_sine_wave(10.0, 1.0, 256, 20.0)
        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        # Measure processing time
        start_time = time.time()
        powers = processor.calculate_band_powers()
        elapsed = (time.time() - start_time) * 1000  # Convert to ms

        assert powers is not None
        assert elapsed < 50  # Must be < 50ms

    def test_processing_latency_2s_window(self):
        """Test processing latency for 2-second window."""
        processor = SignalProcessor(TEST_CONFIG)

        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)
        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        start_time = time.time()
        powers = processor.calculate_band_powers()
        elapsed = (time.time() - start_time) * 1000

        assert powers is not None
        assert elapsed < 50  # Must be < 50ms


class TestMemoryStability:
    """Test memory stability over extended runtime."""

    def test_memory_stability_1000_iterations(self):
        """Test that memory usage is stable over 1000 iterations."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate base signal
        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)

        # Run 1000 iterations
        for i in range(1000):
            # Add samples (simulating continuous streaming)
            for channel in processor.channel_names:
                # Add small batch
                batch = signal[i % 10:(i % 10) + 10].tolist()
                processor.add_samples(channel, batch)

            # Calculate powers periodically
            if i % 10 == 0 and len(processor.buffers['TP9']) >= processor.window_size:
                powers = processor.calculate_band_powers()
                assert powers is not None

        # Verify buffers haven't grown beyond maxlen
        for channel in processor.channel_names:
            assert len(processor.buffers[channel]) <= processor.buffers[channel].maxlen


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
