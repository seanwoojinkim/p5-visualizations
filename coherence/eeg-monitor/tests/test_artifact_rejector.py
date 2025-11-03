"""
Tests for ArtifactRejector

Tests artifact detection for:
- Eye blinks
- Eye movements
- Jaw clenches
- Head movements
- Electrode pops
- Epoch rejection logic
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from artifact_rejector import ArtifactRejector


@pytest.fixture
def config():
    """Default configuration for tests."""
    return {
        'sample_rate': 256,
        'blink_threshold': 150,
        'movement_threshold': 100,
        'jaw_freq_range': [30, 100],
        'jaw_power_threshold': 2.0,
        'pop_gradient_threshold': 50,
        'eye_movement_correlation': -0.5,
        'rejection_threshold': 0.15
    }


@pytest.fixture
def rejector(config):
    """Create ArtifactRejector instance."""
    return ArtifactRejector(config)


@pytest.fixture
def clean_data():
    """Generate clean synthetic EEG data."""
    n_samples = 512
    t = np.linspace(0, 2, n_samples)

    # Generate realistic EEG: alpha (10 Hz) + theta (6 Hz) + some noise
    alpha = 20 * np.sin(2 * np.pi * 10 * t)
    theta = 15 * np.sin(2 * np.pi * 6 * t)
    noise = np.random.randn(n_samples) * 5

    signal = alpha + theta + noise

    return {
        'TP9': signal + np.random.randn(n_samples) * 2,
        'AF7': signal + np.random.randn(n_samples) * 2,
        'AF8': signal + np.random.randn(n_samples) * 2,
        'TP10': signal + np.random.randn(n_samples) * 2
    }


class TestArtifactRejectorInit:
    """Test ArtifactRejector initialization."""

    def test_init_with_defaults(self):
        """Test initialization with default config."""
        rejector = ArtifactRejector({})
        assert rejector.sample_rate == 256
        assert rejector.blink_threshold == 150
        assert rejector.rejection_threshold == 0.15

    def test_init_with_custom_config(self, config):
        """Test initialization with custom config."""
        rejector = ArtifactRejector(config)
        assert rejector.sample_rate == 256
        assert rejector.blink_threshold == 150
        assert rejector.jaw_power_threshold == 2.0

    def test_get_config(self, rejector):
        """Test getting configuration."""
        config = rejector.get_config()
        assert isinstance(config, dict)
        assert 'sample_rate' in config
        assert 'blink_threshold' in config
        assert config['sample_rate'] == 256


class TestBlinkDetection:
    """Test eye blink detection."""

    def test_no_blinks_in_clean_data(self, rejector, clean_data):
        """Test that clean data has no blinks."""
        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['blinks'] == 0
        assert len(artifacts['details'].get('blink_amplitudes', [])) == 0

    def test_detect_single_blink(self, rejector, clean_data):
        """Test detection of single blink."""
        # Add blink artifact to frontal channels (simultaneous spike)
        blink_amplitude = 200  # µV
        blink_start = 100
        blink_duration = 20

        for i in range(blink_start, blink_start + blink_duration):
            clean_data['AF7'][i] += blink_amplitude
            clean_data['AF8'][i] += blink_amplitude

        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['blinks'] >= 1
        assert len(artifacts['details']['blink_amplitudes']) >= 1
        assert max(artifacts['details']['blink_amplitudes']) >= blink_amplitude * 0.9

    def test_detect_multiple_blinks(self, rejector, clean_data):
        """Test detection of multiple blinks."""
        # Add two separate blinks
        blink_amplitude = 180

        # First blink
        for i in range(100, 120):
            clean_data['AF7'][i] += blink_amplitude
            clean_data['AF8'][i] += blink_amplitude

        # Second blink (well separated)
        for i in range(300, 320):
            clean_data['AF7'][i] += blink_amplitude
            clean_data['AF8'][i] += blink_amplitude

        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['blinks'] >= 2

    def test_no_blink_if_only_one_channel(self, rejector, clean_data):
        """Test that blink requires both frontal channels."""
        # Add spike to only one channel
        clean_data['AF7'][100:120] += 200

        artifacts = rejector.detect_artifacts(clean_data)
        # Should not detect as blink (needs both channels)
        # Might still be flagged as movement
        assert artifacts['blinks'] == 0


class TestEyeMovementDetection:
    """Test eye movement detection."""

    def test_no_eye_movements_in_clean_data(self, rejector, clean_data):
        """Test that clean data has no eye movements."""
        artifacts = rejector.detect_artifacts(clean_data)
        # Clean data should have positive or near-zero correlation
        assert artifacts['eye_movements'] == 0

    def test_detect_eye_movements(self, rejector, clean_data):
        """Test detection of eye movements (saccades)."""
        # Simulate eye movement: opposite polarity in left/right frontal
        movement_amplitude = 50
        movement_start = 100
        movement_duration = 40

        # Left eye movement (positive in AF7, negative in AF8)
        for i in range(movement_start, movement_start + movement_duration):
            clean_data['AF7'][i] += movement_amplitude
            clean_data['AF8'][i] -= movement_amplitude

        artifacts = rejector.detect_artifacts(clean_data)

        # Should detect negative correlation
        correlation = artifacts['details'].get('eye_correlation', 0)
        assert correlation < -0.3  # Strong negative correlation
        assert artifacts['eye_movements'] > 0


class TestJawClenchDetection:
    """Test jaw clench detection."""

    def test_no_jaw_clenches_in_clean_data(self, rejector, clean_data):
        """Test that clean data has no jaw clenches."""
        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['jaw_clenches'] == 0
        assert artifacts['details']['jaw_power'] < rejector.jaw_power_threshold

    def test_detect_jaw_clench(self, rejector, clean_data):
        """Test detection of jaw clench (high frequency artifact)."""
        # Add high-frequency muscle artifact (50 Hz)
        n_samples = len(clean_data['TP9'])
        t = np.linspace(0, n_samples / rejector.sample_rate, n_samples)

        high_freq_artifact = 30 * np.sin(2 * np.pi * 50 * t)

        # Add to temporal channels (closest to jaw muscles)
        clean_data['TP9'] += high_freq_artifact
        clean_data['TP10'] += high_freq_artifact

        artifacts = rejector.detect_artifacts(clean_data)

        # Should detect elevated high-frequency power
        assert artifacts['details']['jaw_power'] > rejector.jaw_power_threshold
        assert artifacts['jaw_clenches'] >= 1


class TestHeadMovementDetection:
    """Test head movement detection."""

    def test_no_head_movements_in_clean_data(self, rejector, clean_data):
        """Test that clean data has no head movements."""
        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['head_movements'] == 0

    def test_detect_head_movement(self, rejector, clean_data):
        """Test detection of head movement."""
        # Add large amplitude excursion to all channels
        movement_amplitude = 150
        movement_start = 100
        movement_duration = 30

        for channel in clean_data.keys():
            for i in range(movement_start, movement_start + movement_duration):
                clean_data[channel][i] += movement_amplitude

        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['head_movements'] > 0


class TestElectrodePopDetection:
    """Test electrode pop detection."""

    def test_no_pops_in_clean_data(self, rejector, clean_data):
        """Test that clean data has no electrode pops."""
        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['electrode_pops'] == 0
        assert artifacts['details']['max_gradient'] < rejector.pop_gradient_threshold

    def test_detect_electrode_pop(self, rejector, clean_data):
        """Test detection of electrode pop (sharp transient)."""
        # Add sharp spike (pop) to one channel
        pop_amplitude = 200
        pop_index = 100

        clean_data['TP9'][pop_index] += pop_amplitude
        clean_data['TP9'][pop_index + 1] -= pop_amplitude  # Sharp return

        artifacts = rejector.detect_artifacts(clean_data)

        # Should detect high gradient
        assert artifacts['details']['max_gradient'] > rejector.pop_gradient_threshold
        assert artifacts['electrode_pops'] > 0


class TestArtifactRatioCalculation:
    """Test artifact ratio calculation."""

    def test_artifact_ratio_clean_data(self, rejector, clean_data):
        """Test artifact ratio for clean data."""
        artifacts = rejector.detect_artifacts(clean_data)
        assert artifacts['artifact_ratio'] < 0.1  # Less than 10%
        assert artifacts['clean_data'] is True

    def test_artifact_ratio_contaminated_data(self, rejector, clean_data):
        """Test artifact ratio for contaminated data."""
        # Add multiple artifacts
        # Blink
        clean_data['AF7'][100:120] += 200
        clean_data['AF8'][100:120] += 200

        # Movement
        for channel in clean_data.keys():
            clean_data[channel][200:230] += 150

        # Pop
        clean_data['TP9'][300] += 250
        clean_data['TP9'][301] -= 250

        artifacts = rejector.detect_artifacts(clean_data)

        assert artifacts['total_artifacts'] > 0
        assert artifacts['artifact_ratio'] > 0
        # With multiple artifacts, ratio should be significant
        assert artifacts['artifact_ratio'] >= 0.05


class TestEpochRejection:
    """Test epoch rejection logic."""

    def test_should_not_reject_clean_data(self, rejector, clean_data):
        """Test that clean data is not rejected."""
        artifacts = rejector.detect_artifacts(clean_data)
        should_reject = rejector.should_reject_epoch(artifacts)
        assert should_reject is False

    def test_should_reject_contaminated_data(self, rejector, clean_data):
        """Test that heavily contaminated data is rejected."""
        # Add extreme artifacts
        clean_data['AF7'][100:200] += 300  # Extreme blink
        clean_data['AF8'][100:200] += 300

        for channel in clean_data.keys():
            clean_data[channel][250:350] += 200  # Extreme movement

        artifacts = rejector.detect_artifacts(clean_data)
        should_reject = rejector.should_reject_epoch(artifacts)
        assert should_reject is True

    def test_reject_extreme_blink(self, rejector, clean_data):
        """Test rejection based on extreme blink amplitude."""
        # Add very large blink (2x threshold)
        extreme_amplitude = rejector.blink_threshold * 2.5
        clean_data['AF7'][100:120] += extreme_amplitude
        clean_data['AF8'][100:120] += extreme_amplitude

        artifacts = rejector.detect_artifacts(clean_data)
        should_reject = rejector.should_reject_epoch(artifacts)
        assert should_reject is True

    def test_reject_extreme_jaw_clench(self, rejector, clean_data):
        """Test rejection based on extreme jaw clench."""
        # Add very strong high-frequency artifact
        n_samples = len(clean_data['TP9'])
        t = np.linspace(0, n_samples / rejector.sample_rate, n_samples)

        strong_artifact = 50 * np.sin(2 * np.pi * 60 * t)

        clean_data['TP9'] += strong_artifact
        clean_data['TP10'] += strong_artifact

        artifacts = rejector.detect_artifacts(clean_data)
        jaw_power = artifacts['details'].get('jaw_power', 0)

        # Extreme jaw power should trigger rejection
        if jaw_power > rejector.jaw_power_threshold * 2:
            should_reject = rejector.should_reject_epoch(artifacts)
            assert should_reject is True

    def test_custom_rejection_threshold(self, rejector, clean_data):
        """Test rejection with custom threshold."""
        # Add moderate artifact
        clean_data['AF7'][100:120] += 160
        clean_data['AF8'][100:120] += 160

        artifacts = rejector.detect_artifacts(clean_data)

        # Should not reject with high threshold
        assert rejector.should_reject_epoch(artifacts, threshold=0.5) is False

        # Should reject with low threshold
        assert rejector.should_reject_epoch(artifacts, threshold=0.01) is True


class TestDataValidation:
    """Test input data validation."""

    def test_empty_data_raises_error(self, rejector):
        """Test that empty data raises error."""
        with pytest.raises(ValueError, match="empty"):
            rejector.detect_artifacts({})

    def test_mismatched_channel_lengths_raises_error(self, rejector):
        """Test that mismatched channel lengths raise error."""
        data = {
            'TP9': np.zeros(100),
            'AF7': np.zeros(200),  # Different length
            'AF8': np.zeros(100),
            'TP10': np.zeros(100)
        }
        with pytest.raises(ValueError, match="same length"):
            rejector.detect_artifacts(data)

    def test_handles_empty_arrays_gracefully(self, rejector):
        """Test handling of empty arrays."""
        data = {
            'TP9': np.array([]),
            'AF7': np.array([]),
            'AF8': np.array([]),
            'TP10': np.array([])
        }
        with pytest.raises(ValueError):
            rejector.detect_artifacts(data)


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_handles_all_zeros(self, rejector):
        """Test handling of all-zero data."""
        data = {
            'TP9': np.zeros(512),
            'AF7': np.zeros(512),
            'AF8': np.zeros(512),
            'TP10': np.zeros(512)
        }
        artifacts = rejector.detect_artifacts(data)
        assert isinstance(artifacts, dict)
        assert artifacts['total_artifacts'] == 0

    def test_handles_very_small_data(self, rejector):
        """Test handling of very small data arrays."""
        data = {
            'TP9': np.random.randn(10),
            'AF7': np.random.randn(10),
            'AF8': np.random.randn(10),
            'TP10': np.random.randn(10)
        }
        artifacts = rejector.detect_artifacts(data)
        assert isinstance(artifacts, dict)

    def test_handles_missing_channels(self, rejector):
        """Test handling of missing channels."""
        data = {
            'TP9': np.random.randn(512),
            'AF7': np.random.randn(512)
            # Missing AF8 and TP10
        }
        # Should still work, but some detections may not be possible
        artifacts = rejector.detect_artifacts(data)
        assert isinstance(artifacts, dict)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
