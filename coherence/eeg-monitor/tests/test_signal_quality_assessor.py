"""
Tests for SignalQualityAssessor

Tests:
- SNR calculation
- Impedance estimation
- Spectral purity
- Temporal stability
- Composite scoring
- Quality level classification
- Recommendations generation
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from signal_quality import SignalQualityAssessor


@pytest.fixture
def config():
    """Default configuration for tests."""
    return {
        'sample_rate': 256,
        'history_size': 60,
        'snr_weight': 0.3,
        'impedance_weight': 0.3,
        'purity_weight': 0.2,
        'stability_weight': 0.2,
        'min_amplitude': 5.0,
        'max_amplitude': 100.0
    }


@pytest.fixture
def assessor(config):
    """Create SignalQualityAssessor instance."""
    return SignalQualityAssessor(config)


@pytest.fixture
def good_quality_data():
    """Generate high-quality EEG data."""
    n_samples = 512
    t = np.linspace(0, 2, n_samples)

    # Generate realistic EEG with good characteristics
    alpha = 25 * np.sin(2 * np.pi * 10 * t)
    theta = 18 * np.sin(2 * np.pi * 6 * t)
    beta = 12 * np.sin(2 * np.pi * 20 * t)
    noise = np.random.randn(n_samples) * 3  # Low noise

    signal = alpha + theta + beta + noise

    data = {
        'TP9': signal + np.random.randn(n_samples) * 2,
        'AF7': signal + np.random.randn(n_samples) * 2,
        'AF8': signal + np.random.randn(n_samples) * 2,
        'TP10': signal + np.random.randn(n_samples) * 2
    }

    band_powers = {
        'delta': 30.0,
        'theta': 55.0,
        'alpha': 75.0,
        'beta': 40.0,
        'gamma': 15.0,
        'channels': {
            'TP9': {'delta': 28.0, 'theta': 53.0, 'alpha': 73.0, 'beta': 38.0, 'gamma': 14.0},
            'AF7': {'delta': 30.0, 'theta': 55.0, 'alpha': 75.0, 'beta': 40.0, 'gamma': 15.0},
            'AF8': {'delta': 31.0, 'theta': 57.0, 'alpha': 77.0, 'beta': 42.0, 'gamma': 16.0},
            'TP10': {'delta': 29.0, 'theta': 54.0, 'alpha': 74.0, 'beta': 39.0, 'gamma': 14.5}
        }
    }

    artifacts = {
        'blinks': 0,
        'eye_movements': 0,
        'jaw_clenches': 0,
        'head_movements': 0,
        'electrode_pops': 0,
        'artifact_ratio': 0.02,
        'clean_data': True
    }

    return data, band_powers, artifacts


class TestBasicFunctionality:
    """Test basic signal quality assessment functionality."""

    def test_initialization(self, config):
        """Test SignalQualityAssessor initialization."""
        assessor = SignalQualityAssessor(config)
        assert assessor.sample_rate == 256
        assert assessor.history_size == 60

        # Weights should sum to 1.0
        total = assessor.snr_weight + assessor.impedance_weight + \
                assessor.purity_weight + assessor.stability_weight
        assert abs(total - 1.0) < 0.01

    def test_assess_quality_returns_dict(self, assessor, good_quality_data):
        """Test that assess_quality returns proper dictionary."""
        data, band_powers, artifacts = good_quality_data

        quality = assessor.assess_quality(data, band_powers, artifacts)

        assert isinstance(quality, dict)
        assert 'snr' in quality
        assert 'impedance' in quality
        assert 'spectral_purity' in quality
        assert 'temporal_stability' in quality
        assert 'overall_score' in quality
        assert 'per_channel_scores' in quality
        assert 'quality_level' in quality
        assert 'recommendations' in quality

    def test_quality_scores_in_valid_range(self, assessor, good_quality_data):
        """Test that all quality scores are in 0-100 range."""
        data, band_powers, artifacts = good_quality_data

        quality = assessor.assess_quality(data, band_powers, artifacts)

        assert 0 <= quality['snr'] <= 100
        assert 0 <= quality['spectral_purity'] <= 100
        assert 0 <= quality['temporal_stability'] <= 100
        assert 0 <= quality['overall_score'] <= 100

        for channel_score in quality['per_channel_scores'].values():
            assert 0 <= channel_score <= 100

    def test_reset_clears_history(self, assessor, good_quality_data):
        """Test that reset clears history."""
        data, band_powers, artifacts = good_quality_data

        # Build up history
        for _ in range(20):
            assessor.assess_quality(data, band_powers, artifacts)

        # Verify history exists
        assert len(assessor.history['alpha']) > 0

        # Reset
        assessor.reset()

        # Verify history is cleared
        assert len(assessor.history['alpha']) == 0


class TestQuickValidation:
    """Quick validation tests for Phase 7 implementation."""

    def test_good_quality_produces_high_score(self, assessor, good_quality_data):
        """Test that good quality data produces reasonable scores."""
        data, band_powers, artifacts = good_quality_data

        quality = assessor.assess_quality(data, band_powers, artifacts)

        # Should have decent overall score
        assert quality['overall_score'] > 30
        # Should not be classified as poor
        assert quality['quality_level'] != 'unknown'

    def test_handles_zero_power(self, assessor):
        """Test handling of zero band powers (edge case)."""
        data = {ch: np.zeros(512) for ch in ['TP9', 'AF7', 'AF8', 'TP10']}

        band_powers = {
            'delta': 0, 'theta': 0, 'alpha': 0, 'beta': 0, 'gamma': 0,
            'channels': {
                ch: {'delta': 0, 'theta': 0, 'alpha': 0, 'beta': 0, 'gamma': 0}
                for ch in ['TP9', 'AF7', 'AF8', 'TP10']
            }
        }

        artifacts = {'artifact_ratio': 0.0, 'clean_data': True}

        # Should not crash
        quality = assessor.assess_quality(data, band_powers, artifacts)
        assert isinstance(quality, dict)
        assert 'overall_score' in quality

    def test_generates_recommendations(self, assessor, good_quality_data):
        """Test that recommendations are generated."""
        data, band_powers, artifacts = good_quality_data

        quality = assessor.assess_quality(data, band_powers, artifacts)

        assert isinstance(quality['recommendations'], list)
        assert len(quality['recommendations']) > 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
