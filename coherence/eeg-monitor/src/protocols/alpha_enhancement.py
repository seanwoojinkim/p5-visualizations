"""
Alpha Enhancement Protocol for Neurofeedback Training

This protocol enhances alpha wave activity (8-13 Hz) to promote relaxation,
reduce anxiety, and support meditation practice.

Research Background:
- Most widely validated neurofeedback protocol
- Associated with relaxed alertness and reduced anxiety
- Effective for stress reduction and meditation training
- Typical alpha increase of 20-50% after 10-20 sessions

References:
- Gruzelier, J. H. (2014). EEG-neurofeedback for optimizing performance
- Ros, T. et al. (2010). Tuning pathological brain oscillations with neurofeedback
"""

import numpy as np
from typing import Dict, Tuple
import logging

from .base import NeurofeedbackProtocol


logger = logging.getLogger(__name__)


class AlphaEnhancement(NeurofeedbackProtocol):
    """
    Alpha Enhancement Protocol - Promotes relaxation and meditation.

    This protocol trains users to increase alpha wave power (8-13 Hz),
    which is associated with relaxed, meditative states. Higher alpha
    power typically indicates reduced anxiety and improved mental calmness.

    Scoring:
        - Direction: HIGHER is better
        - 0-30: Low alpha (tense, anxious state)
        - 30-50: Medium alpha (normal state)
        - 50-70: Good alpha (relaxed state)
        - 70-100: Excellent alpha (deep relaxation/meditation)

    Training Goal:
        Increase alpha power by 20-50% above baseline over multiple sessions.

    Example:
        >>> config = {
        ...     'thresholds': {
        ...         'low': 30,
        ...         'medium': 50,
        ...         'good': 70,
        ...         'excellent': 85
        ...     }
        ... }
        >>> protocol = AlphaEnhancement(config)
        >>> metrics = protocol.calculate_metrics(band_powers)
        >>> print(f"Alpha score: {metrics['score']:.1f}/100")
    """

    @property
    def name(self) -> str:
        """Protocol name."""
        return "Alpha Enhancement"

    @property
    def description(self) -> str:
        """Protocol description."""
        return "Relaxation and meditation training through alpha wave enhancement"

    @property
    def frequency_bands(self) -> Dict[str, Tuple[float, float]]:
        """Frequency bands used by this protocol."""
        return {'alpha': (8, 13)}

    def calculate_metrics(self, band_powers: Dict) -> Dict:
        """
        Calculate alpha enhancement metrics.

        Algorithm:
        1. Extract alpha power from all 4 channels (averaged)
        2. Normalize to baseline if available
        3. Calculate score (0-100)
        4. Determine feedback level based on thresholds

        Args:
            band_powers: Dictionary containing band powers:
                {
                    'alpha': float,  # Average alpha power (µV²)
                    'channels': {
                        'TP9': {'alpha': float, ...},
                        'AF7': {'alpha': float, ...},
                        'AF8': {'alpha': float, ...},
                        'TP10': {'alpha': float, ...}
                    }
                }

        Returns:
            {
                'score': float,          # 0-100, higher is better
                'direction': 'higher',   # Higher alpha is better
                'feedback_level': str,   # 'low', 'medium', 'good', 'excellent'
                'details': {
                    'alpha_power': float,        # Current alpha power (µV²)
                    'baseline': float or None,   # Baseline alpha power (µV²)
                    'alpha_relative': float,     # Percentage of baseline
                    'channel_powers': dict       # Per-channel alpha powers
                }
            }

        Raises:
            ValueError: If band_powers is missing required data
        """
        # Validate input
        self._validate_band_powers(band_powers)

        # Extract alpha power (already averaged across channels)
        alpha_power = band_powers['alpha']

        # Get per-channel alpha powers for detailed feedback
        channel_powers = {}
        if 'channels' in band_powers:
            for channel in ['TP9', 'AF7', 'AF8', 'TP10']:
                if channel in band_powers['channels']:
                    channel_powers[channel] = band_powers['channels'][channel].get('alpha', 0.0)

        # Calculate relative alpha power if baseline is available
        if self.baseline and 'alpha' in self.baseline:
            baseline_alpha = self.baseline['alpha']

            # Avoid division by zero
            if baseline_alpha > 0:
                # Calculate as percentage of baseline (100 = baseline level)
                alpha_relative = (alpha_power / baseline_alpha) * 100
            else:
                logger.warning("Baseline alpha power is zero, using absolute scoring")
                alpha_relative = alpha_power
        else:
            # No baseline - use absolute power
            # Scale to reasonable range (assume typical alpha: 10-50 µV²)
            # Map 10 µV² -> 50, 30 µV² -> 100, 50 µV² -> 150
            alpha_relative = alpha_power * 2.5  # Rough scaling factor

        # Calculate score (0-100)
        # If using baseline: 100 = baseline, 150+ = excellent
        # If absolute: scaled to typical alpha range
        score = min(100, max(0, alpha_relative))

        # Get threshold configuration
        thresholds = self.config.get('thresholds', {
            'low': 30,
            'medium': 50,
            'good': 70,
            'excellent': 85
        })

        # Determine feedback level
        feedback_level = self._get_feedback_level(score, thresholds)

        # Compile detailed results
        details = {
            'alpha_power': float(alpha_power),
            'baseline': self.baseline.get('alpha') if self.baseline else None,
            'alpha_relative': float(alpha_relative),
            'channel_powers': channel_powers
        }

        return {
            'score': float(score),
            'direction': 'higher',
            'feedback_level': feedback_level,
            'details': details
        }

    def _validate_config(self) -> None:
        """
        Validate protocol-specific configuration.

        Raises:
            ValueError: If configuration is invalid
        """
        super()._validate_config()

        # Validate thresholds if provided
        if 'thresholds' in self.config:
            thresholds = self.config['thresholds']

            if not isinstance(thresholds, dict):
                raise ValueError("thresholds must be a dictionary")

            # Check that thresholds are in ascending order
            expected_keys = ['low', 'medium', 'good', 'excellent']
            values = []

            for key in expected_keys:
                if key in thresholds:
                    value = thresholds[key]

                    if not isinstance(value, (int, float)):
                        raise ValueError(f"Threshold '{key}' must be numeric")

                    if not (0 <= value <= 100):
                        raise ValueError(f"Threshold '{key}' must be between 0 and 100")

                    values.append(value)

            # Verify ascending order
            if len(values) > 1 and values != sorted(values):
                raise ValueError("Thresholds must be in ascending order: low < medium < good < excellent")
