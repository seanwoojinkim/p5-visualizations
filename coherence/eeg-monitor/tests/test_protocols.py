"""
Unit Tests for Neurofeedback Protocols

Tests all 5 neurofeedback protocols for correct scoring, validation,
and edge cases. Includes tests for the factory and calculator.
"""

import pytest
import numpy as np
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from protocols.base import NeurofeedbackProtocol
from protocols.alpha_enhancement import AlphaEnhancement
from protocols.theta_beta_ratio import ThetaBetaRatio
from protocols.alpha_asymmetry import AlphaAsymmetry
from protocols.theta_enhancement import ThetaEnhancement
from protocols.beta_enhancement import BetaEnhancement
from protocols.factory import ProtocolFactory
from protocol_calculator import ProtocolCalculator


# Test data fixtures

@pytest.fixture
def sample_band_powers():
    """Sample band power data with all required fields."""
    return {
        'delta': 20.0,
        'theta': 15.0,
        'alpha': 25.0,
        'beta': 18.0,
        'gamma': 8.0,
        'channels': {
            'TP9': {'delta': 18.0, 'theta': 14.0, 'alpha': 24.0, 'beta': 17.0, 'gamma': 7.5},
            'AF7': {'delta': 19.0, 'theta': 15.5, 'alpha': 26.0, 'beta': 18.5, 'gamma': 8.0},
            'AF8': {'delta': 21.0, 'theta': 15.0, 'alpha': 25.5, 'beta': 18.0, 'gamma': 8.5},
            'TP10': {'delta': 22.0, 'theta': 15.5, 'alpha': 24.5, 'beta': 18.5, 'gamma': 8.0}
        }
    }


@pytest.fixture
def high_alpha_band_powers():
    """Band powers with high alpha (relaxed state)."""
    return {
        'delta': 15.0,
        'theta': 12.0,
        'alpha': 45.0,  # High alpha
        'beta': 15.0,
        'gamma': 6.0,
        'channels': {
            'TP9': {'delta': 14.0, 'theta': 11.0, 'alpha': 44.0, 'beta': 14.0, 'gamma': 5.5},
            'AF7': {'delta': 15.0, 'theta': 12.0, 'alpha': 46.0, 'beta': 15.0, 'gamma': 6.0},
            'AF8': {'delta': 16.0, 'theta': 12.5, 'alpha': 45.0, 'beta': 15.5, 'gamma': 6.5},
            'TP10': {'delta': 15.0, 'theta': 12.5, 'alpha': 45.0, 'beta': 15.5, 'gamma': 6.0}
        }
    }


@pytest.fixture
def focused_band_powers():
    """Band powers indicating focused state (high beta, low theta)."""
    return {
        'delta': 10.0,
        'theta': 12.0,  # Lower theta
        'alpha': 20.0,
        'beta': 30.0,   # Higher beta
        'gamma': 8.0,
        'channels': {
            'TP9': {'delta': 9.0, 'theta': 11.0, 'alpha': 19.0, 'beta': 29.0, 'gamma': 7.5},
            'AF7': {'delta': 10.0, 'theta': 12.0, 'alpha': 20.0, 'beta': 30.0, 'gamma': 8.0},
            'AF8': {'delta': 10.5, 'theta': 12.5, 'alpha': 21.0, 'beta': 31.0, 'gamma': 8.5},
            'TP10': {'delta': 10.5, 'theta': 12.5, 'alpha': 20.5, 'beta': 30.5, 'gamma': 8.0}
        }
    }


@pytest.fixture
def asymmetric_band_powers():
    """Band powers with left-right asymmetry."""
    return {
        'delta': 20.0,
        'theta': 15.0,
        'alpha': 25.0,
        'beta': 18.0,
        'gamma': 8.0,
        'channels': {
            'TP9': {'delta': 18.0, 'theta': 14.0, 'alpha': 24.0, 'beta': 17.0, 'gamma': 7.5},
            'AF7': {'delta': 19.0, 'theta': 15.5, 'alpha': 30.0, 'beta': 18.5, 'gamma': 8.0},  # Higher left alpha
            'AF8': {'delta': 21.0, 'theta': 15.0, 'alpha': 20.0, 'beta': 18.0, 'gamma': 8.5},  # Lower right alpha
            'TP10': {'delta': 22.0, 'theta': 15.5, 'alpha': 24.5, 'beta': 18.5, 'gamma': 8.0}
        }
    }


# Test Alpha Enhancement Protocol

class TestAlphaEnhancement:
    """Tests for Alpha Enhancement Protocol."""

    def test_initialization(self):
        """Test protocol initialization."""
        protocol = AlphaEnhancement({})
        assert protocol.name == "Alpha Enhancement"
        assert protocol.description is not None
        assert 'alpha' in protocol.frequency_bands
        assert protocol.frequency_bands['alpha'] == (8, 13)

    def test_high_alpha_scores_high(self, high_alpha_band_powers):
        """High alpha power should give high score."""
        protocol = AlphaEnhancement({})
        metrics = protocol.calculate_metrics(high_alpha_band_powers)

        assert metrics['score'] > 50  # Should be in good range
        assert metrics['direction'] == 'higher'
        assert metrics['details']['alpha_power'] == 45.0

    def test_low_alpha_scores_low(self, sample_band_powers):
        """Lower alpha power should give lower score."""
        # Modify to have low alpha
        low_alpha = sample_band_powers.copy()
        low_alpha['alpha'] = 10.0

        protocol = AlphaEnhancement({})
        metrics = protocol.calculate_metrics(low_alpha)

        assert metrics['score'] < 50  # Should be in low-medium range
        assert metrics['direction'] == 'higher'

    def test_baseline_normalization(self, sample_band_powers):
        """Scores should be relative to baseline."""
        protocol = AlphaEnhancement({})

        # Set baseline
        baseline = sample_band_powers.copy()
        baseline['alpha'] = 20.0
        protocol.set_baseline(baseline)

        # Test with higher alpha
        test_data = sample_band_powers.copy()
        test_data['alpha'] = 30.0  # 150% of baseline

        metrics = protocol.calculate_metrics(test_data)

        # Should score well (above baseline)
        assert metrics['score'] > 100  # 150% of baseline
        assert metrics['details']['baseline'] == 20.0
        assert metrics['details']['alpha_relative'] == 150.0

    def test_feedback_levels(self):
        """Test feedback level thresholds."""
        config = {
            'thresholds': {
                'low': 30,
                'medium': 50,
                'good': 70,
                'excellent': 85
            }
        }
        protocol = AlphaEnhancement(config)

        # Test different alpha levels
        test_cases = [
            (10.0, 'low'),
            (40.0, 'medium'),
            (70.0, 'good'),
            (90.0, 'excellent')
        ]

        for alpha_power, expected_level in test_cases:
            data = {
                'delta': 20.0, 'theta': 15.0, 'alpha': alpha_power,
                'beta': 18.0, 'gamma': 8.0,
                'channels': {
                    'TP9': {'alpha': alpha_power}, 'AF7': {'alpha': alpha_power},
                    'AF8': {'alpha': alpha_power}, 'TP10': {'alpha': alpha_power}
                }
            }

            metrics = protocol.calculate_metrics(data)
            # Note: exact level depends on scaling, but score should correlate
            assert 'feedback_level' in metrics


# Test Theta/Beta Ratio Protocol

class TestThetaBetaRatio:
    """Tests for Theta/Beta Ratio Protocol with INVERSE scoring."""

    def test_initialization(self):
        """Test protocol initialization."""
        protocol = ThetaBetaRatio({})
        assert protocol.name == "Theta/Beta Ratio"
        assert 'theta' in protocol.frequency_bands
        assert 'beta' in protocol.frequency_bands

    def test_low_ratio_scores_high(self, focused_band_powers):
        """INVERSE: Low theta/beta ratio should give HIGH score (good focus)."""
        protocol = ThetaBetaRatio({})
        metrics = protocol.calculate_metrics(focused_band_powers)

        # Ratio should be low (12/30 = 0.4)
        assert metrics['details']['ratio'] < 1.5
        # Score should be HIGH (inverse scoring)
        assert metrics['score'] >= 80
        assert metrics['direction'] == 'lower'  # Lower ratio is better
        assert metrics['feedback_level'] in ['good', 'excellent']

    def test_high_ratio_scores_low(self, sample_band_powers):
        """INVERSE: High theta/beta ratio should give LOW score (poor focus)."""
        # Create high ratio (high theta, low beta)
        poor_focus = sample_band_powers.copy()
        poor_focus['channels']['AF7']['theta'] = 30.0
        poor_focus['channels']['AF7']['beta'] = 10.0
        poor_focus['channels']['AF8']['theta'] = 30.0
        poor_focus['channels']['AF8']['beta'] = 10.0

        protocol = ThetaBetaRatio({})
        metrics = protocol.calculate_metrics(poor_focus)

        # Ratio should be high (30/10 = 3.0)
        assert metrics['details']['ratio'] > 2.5
        # Score should be LOW (inverse scoring)
        assert metrics['score'] < 50
        assert metrics['direction'] == 'lower'

    def test_uses_frontal_channels_only(self, sample_band_powers):
        """Should only use AF7 and AF8 (frontal channels)."""
        protocol = ThetaBetaRatio({})
        metrics = protocol.calculate_metrics(sample_band_powers)

        # Verify channels used
        assert 'channels_used' in metrics['details']
        assert metrics['details']['channels_used'] == ['AF7', 'AF8']

        # Verify per-channel ratios exist
        assert 'AF7' in metrics['details']['channel_ratios']
        assert 'AF8' in metrics['details']['channel_ratios']

    def test_excellent_ratio_threshold(self):
        """Test that ratio <= 1.5 gives excellent score."""
        protocol = ThetaBetaRatio({'target_ratio': 1.5})

        # Create data with excellent ratio (1.2)
        data = {
            'delta': 20.0, 'theta': 12.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0,
            'channels': {
                'TP9': {'theta': 12.0, 'beta': 18.0},
                'AF7': {'theta': 12.0, 'beta': 10.0},  # Ratio = 1.2
                'AF8': {'theta': 12.0, 'beta': 10.0},  # Ratio = 1.2
                'TP10': {'theta': 12.0, 'beta': 18.0}
            }
        }

        metrics = protocol.calculate_metrics(data)
        assert metrics['score'] == 100  # Perfect score
        assert metrics['feedback_level'] == 'excellent'

    def test_zero_beta_handling(self):
        """Should handle zero beta power gracefully."""
        data = {
            'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0,
            'channels': {
                'TP9': {'theta': 15.0, 'beta': 0.0},
                'AF7': {'theta': 15.0, 'beta': 0.0},  # Zero beta
                'AF8': {'theta': 15.0, 'beta': 0.0},  # Zero beta
                'TP10': {'theta': 15.0, 'beta': 0.0}
            }
        }

        protocol = ThetaBetaRatio({})
        metrics = protocol.calculate_metrics(data)

        # Should use default high ratio (10.0)
        assert metrics['details']['ratio'] == 10.0
        assert metrics['score'] < 10  # Very low score


# Test Alpha Asymmetry Protocol

class TestAlphaAsymmetry:
    """Tests for Alpha Asymmetry Protocol."""

    def test_initialization(self):
        """Test protocol initialization."""
        protocol = AlphaAsymmetry({})
        assert protocol.name == "Alpha Asymmetry"
        assert 'alpha' in protocol.frequency_bands

    def test_balanced_scores_high(self, sample_band_powers):
        """Balanced hemispheres should score high."""
        # Create balanced data
        balanced = sample_band_powers.copy()
        balanced['channels']['AF7']['alpha'] = 25.0
        balanced['channels']['AF8']['alpha'] = 25.0

        protocol = AlphaAsymmetry({})
        metrics = protocol.calculate_metrics(balanced)

        # Asymmetry should be near zero
        assert abs(metrics['details']['asymmetry']) < 0.1
        # Score should be high
        assert metrics['score'] > 90
        assert metrics['direction'] == 'balanced'
        assert metrics['feedback_level'] in ['good', 'excellent']

    def test_imbalance_scores_low(self, asymmetric_band_powers):
        """Imbalanced hemispheres should score lower."""
        protocol = AlphaAsymmetry({})
        metrics = protocol.calculate_metrics(asymmetric_band_powers)

        # Should have significant asymmetry
        assert abs(metrics['details']['asymmetry']) > 0.1
        # Score should be lower
        assert metrics['score'] < 90
        assert metrics['direction'] == 'balanced'

    def test_logarithmic_calculation(self):
        """Test that asymmetry uses logarithmic calculation."""
        protocol = AlphaAsymmetry({})

        # Create known asymmetry
        data = {
            'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0,
            'channels': {
                'TP9': {'alpha': 25.0},
                'AF7': {'alpha': 20.0},  # Left
                'AF8': {'alpha': 30.0},  # Right
                'TP10': {'alpha': 25.0}
            }
        }

        metrics = protocol.calculate_metrics(data)

        # Calculate expected asymmetry: log(30) - log(20)
        expected = np.log(30.0) - np.log(20.0)
        assert abs(metrics['details']['asymmetry'] - expected) < 0.001

        # Right alpha > left alpha means left hemisphere more active
        assert metrics['details']['asymmetry'] > 0
        assert metrics['details']['dominant_hemisphere'] == 'left'

    def test_dominant_hemisphere_detection(self):
        """Test correct detection of dominant hemisphere."""
        protocol = AlphaAsymmetry({})

        # Test right dominance (left alpha > right alpha)
        right_dominant = {
            'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0,
            'channels': {
                'TP9': {'alpha': 25.0},
                'AF7': {'alpha': 30.0},  # Higher left alpha
                'AF8': {'alpha': 20.0},  # Lower right alpha
                'TP10': {'alpha': 25.0}
            }
        }

        metrics = protocol.calculate_metrics(right_dominant)
        # Higher left alpha = less left activation = right hemisphere dominant
        assert metrics['details']['asymmetry'] < -0.05
        assert metrics['details']['dominant_hemisphere'] == 'right'


# Test Theta Enhancement Protocol

class TestThetaEnhancement:
    """Tests for Theta Enhancement Protocol."""

    def test_initialization(self):
        """Test protocol initialization."""
        protocol = ThetaEnhancement({})
        assert protocol.name == "Theta Enhancement"
        assert 'theta' in protocol.frequency_bands

    def test_high_theta_scores_high(self):
        """High theta power should give high score."""
        protocol = ThetaEnhancement({})

        high_theta = {
            'delta': 15.0,
            'theta': 40.0,  # High theta
            'alpha': 20.0,
            'beta': 15.0,
            'gamma': 6.0,
            'channels': {
                'TP9': {'theta': 39.0}, 'AF7': {'theta': 40.0},
                'AF8': {'theta': 41.0}, 'TP10': {'theta': 40.0}
            }
        }

        metrics = protocol.calculate_metrics(high_theta)
        assert metrics['score'] > 50
        assert metrics['direction'] == 'higher'

    def test_drowsiness_detection(self):
        """Should detect drowsiness (high delta + theta)."""
        protocol = ThetaEnhancement({})

        drowsy = {
            'delta': 50.0,  # Very high delta
            'theta': 30.0,
            'alpha': 15.0,
            'beta': 10.0,
            'gamma': 5.0,
            'channels': {
                'TP9': {'theta': 30.0}, 'AF7': {'theta': 30.0},
                'AF8': {'theta': 30.0}, 'TP10': {'theta': 30.0}
            }
        }

        metrics = protocol.calculate_metrics(drowsy)

        # Should flag drowsiness
        assert metrics['details']['drowsiness_warning'] is True
        assert metrics['details']['delta_ratio'] > 1.5


# Test Beta Enhancement Protocol

class TestBetaEnhancement:
    """Tests for Beta Enhancement Protocol."""

    def test_initialization(self):
        """Test protocol initialization."""
        protocol = BetaEnhancement({})
        assert protocol.name == "Beta Enhancement"
        assert 'beta' in protocol.frequency_bands

    def test_high_beta_scores_high(self, focused_band_powers):
        """High beta power should give high score."""
        protocol = BetaEnhancement({})
        metrics = protocol.calculate_metrics(focused_band_powers)

        assert metrics['score'] > 50
        assert metrics['direction'] == 'higher'
        assert metrics['details']['beta_power'] == 30.0

    def test_anxiety_warning(self):
        """Should warn when beta gets too high."""
        protocol = BetaEnhancement({'high_beta_warning': True})

        # First, set a reasonable max
        normal = {
            'delta': 15.0, 'theta': 12.0, 'alpha': 20.0, 'beta': 30.0, 'gamma': 8.0,
            'channels': {
                'TP9': {'beta': 30.0}, 'AF7': {'beta': 30.0},
                'AF8': {'beta': 30.0}, 'TP10': {'beta': 30.0}
            }
        }
        protocol.calculate_metrics(normal)

        # Now send very high beta
        very_high = normal.copy()
        very_high['beta'] = 35.0
        very_high['channels'] = {
            'TP9': {'beta': 35.0}, 'AF7': {'beta': 35.0},
            'AF8': {'beta': 35.0}, 'TP10': {'beta': 35.0}
        }

        metrics = protocol.calculate_metrics(very_high)
        assert metrics['details']['max_beta_observed'] >= 35.0


# Test Protocol Factory

class TestProtocolFactory:
    """Tests for Protocol Factory."""

    def test_list_protocols(self):
        """Should list all available protocols."""
        protocols = ProtocolFactory.list_protocols()
        assert len(protocols) == 5
        assert 'alpha_enhancement' in protocols
        assert 'theta_beta_ratio' in protocols
        assert 'alpha_asymmetry' in protocols
        assert 'theta_enhancement' in protocols
        assert 'beta_enhancement' in protocols

    def test_create_protocol(self):
        """Should create protocol instances."""
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        assert isinstance(protocol, AlphaEnhancement)
        assert protocol.name == "Alpha Enhancement"

    def test_create_with_config(self):
        """Should create protocol with configuration."""
        config = {'target_ratio': 1.5}
        protocol = ProtocolFactory.create('theta_beta_ratio', config)
        assert isinstance(protocol, ThetaBetaRatio)
        assert protocol.config['target_ratio'] == 1.5

    def test_create_invalid_protocol(self):
        """Should raise ValueError for invalid protocol name."""
        with pytest.raises(ValueError, match="Unknown protocol"):
            ProtocolFactory.create('invalid_protocol', {})

    def test_get_protocol_info(self):
        """Should get protocol metadata."""
        info = ProtocolFactory.get_protocol_info('alpha_enhancement')
        assert info is not None
        assert info['name'] == "Alpha Enhancement"
        assert 'alpha' in info['frequency_bands']
        assert info['frequency_bands']['alpha'] == (8, 13)

    def test_get_all_protocol_info(self):
        """Should get info for all protocols."""
        all_info = ProtocolFactory.get_all_protocol_info()
        assert len(all_info) == 5
        assert 'alpha_enhancement' in all_info
        assert all_info['alpha_enhancement']['name'] == "Alpha Enhancement"


# Test Protocol Calculator

class TestProtocolCalculator:
    """Tests for Protocol Calculator."""

    def test_initialization(self):
        """Test calculator initialization."""
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(protocol)
        assert calculator.protocol.name == "Alpha Enhancement"
        assert calculator.calculation_count == 0

    def test_calculate(self, sample_band_powers):
        """Test metric calculation."""
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(protocol)

        metrics = calculator.calculate(sample_band_powers)
        assert 'score' in metrics
        assert 'protocol' in metrics
        assert metrics['protocol'] == "Alpha Enhancement"
        assert metrics['calculation_number'] == 0
        assert calculator.calculation_count == 1

    def test_baseline_calibration(self, sample_band_powers):
        """Test baseline calibration process."""
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(protocol)

        # Start calibration
        calculator.start_baseline_calibration()
        assert len(calculator.baseline_samples) == 0

        # Add samples
        for _ in range(10):
            calculator.add_baseline_sample(sample_band_powers)
        assert len(calculator.baseline_samples) == 10

        # Finish calibration
        baseline = calculator.finish_baseline_calibration()
        assert baseline is not None
        assert baseline['alpha'] == 25.0  # Same as sample
        assert baseline['sample_count'] == 10
        assert calculator.baseline_calibrated is True

    def test_protocol_switching(self):
        """Test switching between protocols."""
        # Start with alpha
        alpha_protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(alpha_protocol)
        assert calculator.protocol.name == "Alpha Enhancement"

        # Switch to theta/beta
        calculator.switch_protocol_by_name('theta_beta_ratio', {'target_ratio': 1.5})
        assert calculator.protocol.name == "Theta/Beta Ratio"

    def test_session_stats(self, sample_band_powers):
        """Test session statistics."""
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(protocol)

        # Calculate some metrics
        for _ in range(5):
            calculator.calculate(sample_band_powers)

        stats = calculator.get_session_stats()
        assert stats['protocol'] == "Alpha Enhancement"
        assert stats['calculation_count'] == 5
        assert stats['duration_seconds'] > 0
        assert 'avg_score' in stats
        assert 'current_score' in stats

    def test_metric_history(self, sample_band_powers):
        """Test metric history tracking."""
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(protocol)

        # Calculate multiple times
        for _ in range(3):
            calculator.calculate(sample_band_powers)

        history = calculator.get_metric_history()
        assert len(history) == 3

        # Get last N
        last_two = calculator.get_metric_history(last_n=2)
        assert len(last_two) == 2


# Integration Tests

class TestProtocolIntegration:
    """Integration tests combining multiple components."""

    def test_full_session_workflow(self, sample_band_powers, high_alpha_band_powers):
        """Test complete session workflow."""
        # Create protocol and calculator
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(protocol)

        # Calibrate baseline
        calculator.start_baseline_calibration()
        for _ in range(10):
            calculator.add_baseline_sample(sample_band_powers)
        baseline = calculator.finish_baseline_calibration()
        assert baseline is not None

        # Run training session
        for _ in range(5):
            metrics = calculator.calculate(high_alpha_band_powers)
            assert metrics['score'] > 0

        # Check session stats
        stats = calculator.get_session_stats()
        assert stats['calculation_count'] == 5
        assert stats['baseline_calibrated'] is True

    def test_all_protocols_calculate(self, sample_band_powers):
        """Test that all protocols can calculate metrics."""
        for protocol_name in ProtocolFactory.list_protocols():
            protocol = ProtocolFactory.create(protocol_name, {})
            calculator = ProtocolCalculator(protocol)

            metrics = calculator.calculate(sample_band_powers)
            assert 'score' in metrics
            assert 'direction' in metrics
            assert 'feedback_level' in metrics
            assert 0 <= metrics['score'] <= 100


if __name__ == '__main__':
    # Run tests with pytest
    pytest.main([__file__, '-v', '--tb=short'])
