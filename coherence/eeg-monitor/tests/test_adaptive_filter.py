"""
Tests for AdaptiveFilter

Tests:
- Line noise detection (50 vs 60 Hz)
- Adaptive notch filtering
- DC drift removal
- Full pipeline
- Configuration
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from adaptive_filter import AdaptiveFilter


@pytest.fixture
def config():
    """Default configuration for tests."""
    return {
        'sample_rate': 256,
        'auto_detect_line_noise': True,
        'force_line_freq': None,
        'notch_q_factor': 30,
        'dc_cutoff': 0.5,
        'dc_order': 2,
        'detection_threshold': 1.5,
        'update_interval': 2560
    }


@pytest.fixture
def adaptive_filter(config):
    """Create AdaptiveFilter instance."""
    return AdaptiveFilter(config)


@pytest.fixture
def clean_signal():
    """Generate clean EEG signal without line noise."""
    sample_rate = 256
    duration = 4  # seconds
    n_samples = sample_rate * duration
    t = np.linspace(0, duration, n_samples)

    # Physiological EEG components
    alpha = 20 * np.sin(2 * np.pi * 10 * t)  # 10 Hz alpha
    theta = 15 * np.sin(2 * np.pi * 6 * t)   # 6 Hz theta
    beta = 10 * np.sin(2 * np.pi * 20 * t)   # 20 Hz beta
    noise = np.random.randn(n_samples) * 3   # Gaussian noise

    return alpha + theta + beta + noise


@pytest.fixture
def signal_with_60hz_noise(clean_signal):
    """Add 60 Hz line noise to clean signal."""
    sample_rate = 256
    duration = len(clean_signal) / sample_rate
    t = np.linspace(0, duration, len(clean_signal))

    line_noise = 25 * np.sin(2 * np.pi * 60 * t)  # Strong 60 Hz component

    return clean_signal + line_noise


@pytest.fixture
def signal_with_50hz_noise(clean_signal):
    """Add 50 Hz line noise to clean signal."""
    sample_rate = 256
    duration = len(clean_signal) / sample_rate
    t = np.linspace(0, duration, len(clean_signal))

    line_noise = 25 * np.sin(2 * np.pi * 50 * t)  # Strong 50 Hz component

    return clean_signal + line_noise


@pytest.fixture
def signal_with_dc_drift(clean_signal):
    """Add DC offset and slow drift to signal."""
    # Add DC offset
    dc_offset = 50

    # Add slow drift (0.1 Hz)
    duration = len(clean_signal) / 256
    t = np.linspace(0, duration, len(clean_signal))
    slow_drift = 20 * np.sin(2 * np.pi * 0.1 * t)

    return clean_signal + dc_offset + slow_drift


class TestAdaptiveFilterInit:
    """Test AdaptiveFilter initialization."""

    def test_init_with_defaults(self):
        """Test initialization with default config."""
        af = AdaptiveFilter({})
        assert af.sample_rate == 256
        assert af.auto_detect is True
        assert af.line_freq is None
        assert af.notch_q_factor == 30

    def test_init_with_custom_config(self, config):
        """Test initialization with custom config."""
        af = AdaptiveFilter(config)
        assert af.sample_rate == 256
        assert af.auto_detect is True
        assert af.dc_cutoff == 0.5

    def test_init_with_forced_line_freq(self):
        """Test initialization with forced line frequency."""
        config = {'sample_rate': 256, 'force_line_freq': 50}
        af = AdaptiveFilter(config)
        assert af.line_freq == 50
        assert af.notch_filter_sos is not None

    def test_get_status(self, adaptive_filter):
        """Test getting filter status."""
        status = adaptive_filter.get_status()
        assert isinstance(status, dict)
        assert 'line_freq' in status
        assert 'auto_detect' in status
        assert status['auto_detect'] is True


class TestLineNoiseDetection:
    """Test line noise frequency detection."""

    def test_detect_60hz_line_noise(self, adaptive_filter, signal_with_60hz_noise):
        """Test detection of 60 Hz line noise."""
        detected_freq = adaptive_filter.detect_line_noise(signal_with_60hz_noise)

        assert detected_freq is not None
        assert 58 <= detected_freq <= 62  # Should be close to 60 Hz

    def test_detect_50hz_line_noise(self, adaptive_filter, signal_with_50hz_noise):
        """Test detection of 50 Hz line noise."""
        detected_freq = adaptive_filter.detect_line_noise(signal_with_50hz_noise)

        assert detected_freq is not None
        assert 48 <= detected_freq <= 52  # Should be close to 50 Hz

    def test_no_detection_on_clean_signal(self, adaptive_filter, clean_signal):
        """Test that clean signal doesn't trigger line noise detection."""
        detected_freq = adaptive_filter.detect_line_noise(clean_signal)

        # Should return None (no significant line noise)
        assert detected_freq is None

    def test_detection_requires_sufficient_data(self, adaptive_filter):
        """Test that detection requires minimum data length."""
        short_signal = np.random.randn(100)  # Too short
        detected_freq = adaptive_filter.detect_line_noise(short_signal)

        assert detected_freq is None

    def test_detection_distinguishes_50_vs_60(self, adaptive_filter):
        """Test that detector can distinguish 50 Hz from 60 Hz."""
        # Create signal with both, but 60 Hz stronger
        sample_rate = 256
        duration = 4
        n_samples = sample_rate * duration
        t = np.linspace(0, duration, n_samples)

        signal_60 = 30 * np.sin(2 * np.pi * 60 * t)  # Stronger
        signal_50 = 10 * np.sin(2 * np.pi * 50 * t)  # Weaker
        noise = np.random.randn(n_samples) * 5

        mixed_signal = signal_60 + signal_50 + noise

        detected_freq = adaptive_filter.detect_line_noise(mixed_signal)

        # Should detect 60 Hz as dominant
        assert detected_freq is not None
        assert 58 <= detected_freq <= 62


class TestAdaptiveNotchFilter:
    """Test adaptive notch filtering."""

    def test_removes_60hz_noise(self, adaptive_filter, signal_with_60hz_noise):
        """Test that adaptive notch removes 60 Hz line noise."""
        # Apply notch filter
        filtered = adaptive_filter.apply_adaptive_notch(signal_with_60hz_noise)

        # Calculate power at 60 Hz before and after
        from scipy.signal import welch

        freqs_before, psd_before = welch(signal_with_60hz_noise, fs=256, nperseg=256)
        freqs_after, psd_after = welch(filtered, fs=256, nperseg=256)

        # Find power near 60 Hz
        idx_60 = np.argmin(np.abs(freqs_after - 60))
        power_before = psd_before[idx_60]
        power_after = psd_after[idx_60]

        # Power at 60 Hz should be significantly reduced
        assert power_after < power_before * 0.5  # At least 50% reduction

    def test_removes_50hz_noise(self, adaptive_filter, signal_with_50hz_noise):
        """Test that adaptive notch removes 50 Hz line noise."""
        # Apply notch filter (will detect 50 Hz)
        filtered = adaptive_filter.apply_adaptive_notch(signal_with_50hz_noise)

        # Verify 50 Hz was detected
        assert adaptive_filter.line_freq is not None
        assert 48 <= adaptive_filter.line_freq <= 52

        # Calculate power at 50 Hz
        from scipy.signal import welch

        freqs_after, psd_after = welch(filtered, fs=256, nperseg=256)
        idx_50 = np.argmin(np.abs(freqs_after - 50))
        power_after = psd_after[idx_50]

        # Power at 50 Hz should be reduced
        assert power_after < 100  # Arbitrary threshold for notched signal

    def test_preserves_physiological_frequencies(self, adaptive_filter, signal_with_60hz_noise):
        """Test that notch filter preserves physiological EEG bands."""
        filtered = adaptive_filter.apply_adaptive_notch(signal_with_60hz_noise)

        from scipy.signal import welch

        # Calculate power in alpha band (8-13 Hz)
        freqs_before, psd_before = welch(signal_with_60hz_noise, fs=256, nperseg=256)
        freqs_after, psd_after = welch(filtered, fs=256, nperseg=256)

        # Extract alpha power
        alpha_mask = (freqs_before >= 8) & (freqs_before <= 13)
        alpha_before = np.mean(psd_before[alpha_mask])
        alpha_after = np.mean(psd_after[alpha_mask])

        # Alpha power should be largely preserved (within 20%)
        assert alpha_after > alpha_before * 0.8
        assert alpha_after < alpha_before * 1.2

    def test_does_nothing_without_line_noise(self, adaptive_filter, clean_signal):
        """Test that filter doesn't alter clean signal without line noise."""
        filtered = adaptive_filter.apply_adaptive_notch(clean_signal)

        # Without detected line noise, should return similar signal
        # (May be unchanged if no filter is applied)
        correlation = np.corrcoef(clean_signal, filtered)[0, 1]
        assert correlation > 0.95  # Very high correlation

    def test_adapts_over_time(self, adaptive_filter):
        """Test that filter adapts when line frequency changes."""
        sample_rate = 256
        duration = 4
        n_samples = sample_rate * duration
        t = np.linspace(0, duration, n_samples)

        # First signal with 60 Hz
        signal_60 = 25 * np.sin(2 * np.pi * 60 * t) + np.random.randn(n_samples) * 5
        adaptive_filter.apply_adaptive_notch(signal_60)

        assert adaptive_filter.line_freq is not None
        first_freq = adaptive_filter.line_freq

        # Second signal with 50 Hz (force re-detection)
        adaptive_filter.samples_since_detection = adaptive_filter.update_interval
        signal_50 = 25 * np.sin(2 * np.pi * 50 * t) + np.random.randn(n_samples) * 5
        adaptive_filter.apply_adaptive_notch(signal_50)

        # Frequency should have changed
        assert adaptive_filter.line_freq != first_freq


class TestDCDriftRemoval:
    """Test DC drift removal."""

    def test_removes_dc_offset(self, adaptive_filter, clean_signal):
        """Test removal of DC offset."""
        # Add large DC offset
        signal_with_dc = clean_signal + 100

        # Remove DC drift
        filtered = adaptive_filter.remove_dc_drift(signal_with_dc)

        # Mean should be close to zero
        assert abs(np.mean(filtered)) < 5  # Much less than original offset

    def test_removes_slow_drift(self, adaptive_filter, signal_with_dc_drift):
        """Test removal of slow baseline drift."""
        filtered = adaptive_filter.remove_dc_drift(signal_with_dc_drift)

        # Slow drift should be significantly reduced
        # Compare variance in very low frequencies
        from scipy.signal import welch

        freqs, psd = welch(filtered, fs=256, nperseg=256)

        # Power below 0.5 Hz should be minimal
        low_freq_mask = freqs < 0.5
        low_freq_power = np.mean(psd[low_freq_mask])

        # Should be much less than before
        assert low_freq_power < 10  # Arbitrary threshold

    def test_preserves_delta_band(self, adaptive_filter, clean_signal):
        """Test that DC removal preserves delta band (0.5-4 Hz)."""
        # Add delta wave
        duration = len(clean_signal) / 256
        t = np.linspace(0, duration, len(clean_signal))
        delta = 25 * np.sin(2 * np.pi * 2 * t)  # 2 Hz delta

        signal = clean_signal + delta

        filtered = adaptive_filter.remove_dc_drift(signal)

        from scipy.signal import welch

        # Calculate delta power
        freqs_before, psd_before = welch(signal, fs=256, nperseg=256)
        freqs_after, psd_after = welch(filtered, fs=256, nperseg=256)

        delta_mask = (freqs_before >= 0.5) & (freqs_before <= 4)
        delta_before = np.mean(psd_before[delta_mask])
        delta_after = np.mean(psd_after[delta_mask])

        # Delta power should be largely preserved
        assert delta_after > delta_before * 0.7

    def test_handles_very_short_data(self, adaptive_filter):
        """Test handling of very short data for DC removal."""
        short_signal = np.random.randn(10)
        filtered = adaptive_filter.remove_dc_drift(short_signal)

        # Should return original for too-short data
        assert len(filtered) == len(short_signal)


class TestFullPipeline:
    """Test complete adaptive filtering pipeline."""

    def test_full_pipeline(self, adaptive_filter):
        """Test full pipeline: notch + DC removal."""
        sample_rate = 256
        duration = 4
        n_samples = sample_rate * duration
        t = np.linspace(0, duration, n_samples)

        # Create signal with multiple issues
        clean = 20 * np.sin(2 * np.pi * 10 * t)  # Alpha
        line_noise = 25 * np.sin(2 * np.pi * 60 * t)  # 60 Hz
        dc_offset = 50
        slow_drift = 15 * np.sin(2 * np.pi * 0.2 * t)  # 0.2 Hz drift

        contaminated = clean + line_noise + dc_offset + slow_drift

        # Apply full pipeline
        cleaned = adaptive_filter.apply_full_pipeline(contaminated)

        # Check improvements
        from scipy.signal import welch

        freqs_clean, psd_clean = welch(cleaned, fs=256, nperseg=256)

        # Line noise should be reduced
        idx_60 = np.argmin(np.abs(freqs_clean - 60))
        assert psd_clean[idx_60] < 50  # Threshold for notched signal

        # DC should be removed
        assert abs(np.mean(cleaned)) < 10

        # Alpha should be preserved
        alpha_mask = (freqs_clean >= 8) & (freqs_clean <= 13)
        alpha_power = np.mean(psd_clean[alpha_mask])
        assert alpha_power > 10  # Should still have signal


class TestManualControl:
    """Test manual control of filter parameters."""

    def test_set_line_frequency_manually(self, adaptive_filter):
        """Test manually setting line frequency."""
        adaptive_filter.set_line_frequency(50)

        assert adaptive_filter.line_freq == 50
        assert adaptive_filter.force_line_freq == 50
        assert adaptive_filter.auto_detect is False
        assert adaptive_filter.notch_filter_sos is not None

    def test_manual_freq_rejects_invalid(self, adaptive_filter):
        """Test that invalid frequencies are rejected."""
        with pytest.raises(ValueError):
            adaptive_filter.set_line_frequency(100)  # Too high

        with pytest.raises(ValueError):
            adaptive_filter.set_line_frequency(30)  # Too low

    def test_enable_auto_detection(self, adaptive_filter):
        """Test re-enabling auto-detection."""
        # First set manual
        adaptive_filter.set_line_frequency(60)
        assert adaptive_filter.auto_detect is False

        # Re-enable auto
        adaptive_filter.enable_auto_detection()
        assert adaptive_filter.auto_detect is True
        assert adaptive_filter.force_line_freq is None
        assert adaptive_filter.line_freq is None

    def test_reset_state(self, adaptive_filter, signal_with_60hz_noise):
        """Test resetting filter state."""
        # Detect line noise
        adaptive_filter.apply_adaptive_notch(signal_with_60hz_noise)
        assert adaptive_filter.line_freq is not None

        # Reset
        adaptive_filter.reset()
        assert adaptive_filter.line_freq is None
        assert len(adaptive_filter.line_freq_history) == 0


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_handles_empty_signal(self, adaptive_filter):
        """Test handling of empty signal."""
        empty = np.array([])
        filtered = adaptive_filter.apply_adaptive_notch(empty)
        assert len(filtered) == 0

    def test_handles_nan_values(self, adaptive_filter):
        """Test handling of NaN values."""
        signal = np.random.randn(512)
        signal[100:110] = np.nan

        # Should not crash
        try:
            filtered = adaptive_filter.apply_adaptive_notch(signal)
            # Result may contain NaNs or be handled gracefully
            assert len(filtered) == len(signal)
        except:
            # It's acceptable to raise an error on invalid input
            pass

    def test_handles_constant_signal(self, adaptive_filter):
        """Test handling of constant (zero variance) signal."""
        constant = np.ones(512) * 50

        filtered = adaptive_filter.remove_dc_drift(constant)
        # Should remove DC, leaving near-zero
        assert abs(np.mean(filtered)) < 5


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
