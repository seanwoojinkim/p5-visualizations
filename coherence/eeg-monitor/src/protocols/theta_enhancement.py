"""
Theta Enhancement Protocol for Deep Meditation and Creativity

This protocol enhances theta wave activity (4-8 Hz) to promote deep meditation,
creativity, intuition, and access to subconscious processes.

Research Background:
- Theta associated with deep meditation, hypnagogic states, creativity
- Prominent during REM sleep, deep relaxation, creative problem-solving
- Linked to memory consolidation and emotional processing
- Used for creativity enhancement, insight generation, trauma processing
- Common in experienced meditators during deep states

Applications:
- Creative problem-solving and insight generation
- Deep meditation and spiritual experiences
- Memory enhancement and learning consolidation
- Emotional processing and trauma work
- Access to subconscious material

References:
- Klimesch, W. (1999). EEG alpha and theta oscillations reflect cognitive and memory performance
- Raghavachari, S. et al. (2001). Gating of human theta oscillations by a working memory task
- Baijal, S. & Srinivasan, N. (2010). Theta activity and meditative states
"""

import numpy as np
from typing import Dict, Tuple
import logging

from .base import NeurofeedbackProtocol


logger = logging.getLogger(__name__)


class ThetaEnhancement(NeurofeedbackProtocol):
    """
    Theta Enhancement Protocol - Deep meditation and creativity training.

    This protocol trains users to increase theta wave power (4-8 Hz), which
    is associated with deep meditative states, enhanced creativity, intuition,
    and access to subconscious processes. Similar to alpha enhancement but
    targets deeper states.

    Scoring:
        - Direction: HIGHER is better
        - 0-30: Low theta (alert, analytical state)
        - 30-50: Medium theta (relaxed state)
        - 50-70: Good theta (meditative state)
        - 70-100: Excellent theta (deep meditation/hypnagogic)

    Training Goal:
        Increase theta power by 30-60% above baseline for deep states.
        Higher increases than alpha as theta is typically lower amplitude.

    Note:
        Theta enhancement is more challenging than alpha enhancement as it
        requires deeper relaxation. May be easier with eyes closed or during
        drowsiness. Be cautious of drowsiness/sleep during training.

    Example:
        >>> config = {
        ...     'thresholds': {
        ...         'low': 30,
        ...         'medium': 50,
        ...         'good': 70,
        ...         'excellent': 85
        ...     }
        ... }
        >>> protocol = ThetaEnhancement(config)
        >>> metrics = protocol.calculate_metrics(band_powers)
        >>> print(f"Theta score: {metrics['score']:.1f}/100")
    """

    @property
    def name(self) -> str:
        """Protocol name."""
        return "Theta Enhancement"

    @property
    def description(self) -> str:
        """Protocol description."""
        return "Deep meditation and creativity training through theta wave enhancement"

    @property
    def frequency_bands(self) -> Dict[str, Tuple[float, float]]:
        """Frequency bands used by this protocol."""
        return {'theta': (4, 8)}

    def calculate_metrics(self, band_powers: Dict) -> Dict:
        """
        Calculate theta enhancement metrics.

        Algorithm:
        1. Extract theta power from all 4 channels (averaged)
        2. Normalize to baseline if available
        3. Calculate score (0-100)
        4. Determine feedback level based on thresholds
        5. Check for excessive drowsiness

        Args:
            band_powers: Dictionary containing band powers:
                {
                    'theta': float,  # Average theta power (µV²)
                    'delta': float,  # Delta power for drowsiness check
                    'channels': {
                        'TP9': {'theta': float, ...},
                        'AF7': {'theta': float, ...},
                        'AF8': {'theta': float, ...},
                        'TP10': {'theta': float, ...}
                    }
                }

        Returns:
            {
                'score': float,          # 0-100, higher is better
                'direction': 'higher',   # Higher theta is better
                'feedback_level': str,   # 'low', 'medium', 'good', 'excellent'
                'details': {
                    'theta_power': float,         # Current theta power (µV²)
                    'baseline': float or None,    # Baseline theta power (µV²)
                    'theta_relative': float,      # Percentage of baseline
                    'channel_powers': dict,       # Per-channel theta powers
                    'drowsiness_warning': bool,   # True if may be too drowsy
                    'delta_ratio': float          # Delta/theta ratio
                }
            }

        Raises:
            ValueError: If band_powers is missing required data
        """
        # Validate input
        self._validate_band_powers(band_powers)

        # Extract theta power (already averaged across channels)
        theta_power = band_powers['theta']

        # Get delta power for drowsiness detection
        delta_power = band_powers.get('delta', 0)

        # Get per-channel theta powers for detailed feedback
        channel_powers = {}
        if 'channels' in band_powers:
            for channel in ['TP9', 'AF7', 'AF8', 'TP10']:
                if channel in band_powers['channels']:
                    channel_powers[channel] = band_powers['channels'][channel].get('theta', 0.0)

        # Calculate relative theta power if baseline is available
        if self.baseline and 'theta' in self.baseline:
            baseline_theta = self.baseline['theta']

            # Avoid division by zero
            if baseline_theta > 0:
                # Calculate as percentage of baseline (100 = baseline level)
                theta_relative = (theta_power / baseline_theta) * 100
            else:
                logger.warning("Baseline theta power is zero, using absolute scoring")
                theta_relative = theta_power
        else:
            # No baseline - use absolute power
            # Scale to reasonable range (assume typical theta: 5-30 µV²)
            # Map 5 µV² -> 33, 15 µV² -> 100, 30 µV² -> 200
            theta_relative = theta_power * 6.67  # Rough scaling factor

        # Calculate score (0-100)
        # If using baseline: 100 = baseline, 150+ = excellent
        # If absolute: scaled to typical theta range
        score = min(100, max(0, theta_relative))

        # Get threshold configuration
        thresholds = self.config.get('thresholds', {
            'low': 30,
            'medium': 50,
            'good': 70,
            'excellent': 85
        })

        # Determine feedback level
        feedback_level = self._get_feedback_level(score, thresholds)

        # Check for drowsiness warning
        # High theta + high delta may indicate sleep rather than meditation
        delta_theta_ratio = delta_power / theta_power if theta_power > 0 else 0
        drowsiness_warning = False

        if delta_theta_ratio > 1.5:
            # Delta significantly higher than theta - may be falling asleep
            drowsiness_warning = True
            logger.info(f"Drowsiness detected: delta/theta ratio = {delta_theta_ratio:.2f}")

        # Compile detailed results
        details = {
            'theta_power': float(theta_power),
            'baseline': self.baseline.get('theta') if self.baseline else None,
            'theta_relative': float(theta_relative),
            'channel_powers': channel_powers,
            'drowsiness_warning': drowsiness_warning,
            'delta_ratio': float(delta_theta_ratio)
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

        # Validate thresholds if provided (same as alpha enhancement)
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
