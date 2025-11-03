"""
Beta Enhancement Protocol for Focus and Alertness

This protocol enhances beta wave activity (12-30 Hz) to promote active
thinking, alertness, problem-solving, and cognitive performance.

Research Background:
- Beta associated with active thinking, alertness, concentration
- Dominant during focused mental activity and problem-solving
- Low beta (12-15 Hz): relaxed yet focused, "soft focus"
- Mid beta (15-20 Hz): engaged thinking, active processing
- High beta (20-30 Hz): complex thinking, high alertness, but also anxiety
- Used for cognitive enhancement, attention training

Applications:
- Cognitive performance enhancement
- Active problem-solving and analysis
- Alertness and wakefulness training
- Peak performance states (with proper regulation)

Caution:
- Excessive beta can indicate stress, anxiety, or over-arousal
- Monitor for tension, anxiety, or "mental chatter"
- Best combined with relaxation training
- Not recommended before sleep

References:
- Egner, T. & Gruzelier, J. H. (2004). EEG biofeedback of low beta band components
- Vernon, D. et al. (2003). The effect of training distinct neurofeedback protocols
- Rasey, H. W. et al. (1996). EEG biofeedback for the enhancement of attentional processing
"""

import numpy as np
from typing import Dict, Tuple
import logging

from .base import NeurofeedbackProtocol


logger = logging.getLogger(__name__)


class BetaEnhancement(NeurofeedbackProtocol):
    """
    Beta Enhancement Protocol - Focus and alertness training.

    This protocol trains users to increase beta wave power (12-30 Hz), which
    is associated with active thinking, alertness, and cognitive performance.
    Useful for enhancing concentration and mental clarity.

    CAUTION: Beta enhancement should be used carefully as excessive beta
    can lead to anxiety, tension, and mental fatigue. The protocol includes
    a warning system for excessive beta activity.

    Scoring:
        - Direction: HIGHER is better (up to a point)
        - 0-30: Low beta (drowsy, unfocused)
        - 30-50: Medium beta (normal alertness)
        - 50-70: Good beta (focused, alert)
        - 70-85: Excellent beta (peak performance)
        - 85-100: Warning zone (possible over-arousal)

    Training Goal:
        Increase beta power by 20-40% above baseline for optimal focus,
        but avoid excessive increases that may indicate anxiety.

    Warning System:
        - Beta > 80% of historical maximum: Caution (may be over-aroused)
        - Beta > 90% of historical maximum: Warning (likely anxious/tense)

    Example:
        >>> config = {
        ...     'thresholds': {
        ...         'low': 30,
        ...         'medium': 50,
        ...         'good': 70,
        ...         'excellent': 85
        ...     },
        ...     'high_beta_warning': True
        ... }
        >>> protocol = BetaEnhancement(config)
        >>> metrics = protocol.calculate_metrics(band_powers)
        >>> if metrics['details']['anxiety_warning']:
        ...     print("Beta too high - relax!")
    """

    def __init__(self, config: Dict):
        """
        Initialize Beta Enhancement Protocol.

        Args:
            config: Protocol configuration including thresholds
        """
        super().__init__(config)

        # Track historical maximum beta for warning system
        self.max_beta_observed = 0.0

    @property
    def name(self) -> str:
        """Protocol name."""
        return "Beta Enhancement"

    @property
    def description(self) -> str:
        """Protocol description."""
        return "Focus and alertness training through beta wave enhancement"

    @property
    def frequency_bands(self) -> Dict[str, Tuple[float, float]]:
        """Frequency bands used by this protocol."""
        return {'beta': (12, 30)}

    def calculate_metrics(self, band_powers: Dict) -> Dict:
        """
        Calculate beta enhancement metrics with anxiety detection.

        Algorithm:
        1. Extract beta power from all 4 channels (averaged)
        2. Normalize to baseline if available
        3. Calculate score (0-100)
        4. Determine feedback level based on thresholds
        5. Check for excessive beta (anxiety warning)
        6. Update historical maximum

        Args:
            band_powers: Dictionary containing band powers:
                {
                    'beta': float,  # Average beta power (µV²)
                    'channels': {
                        'TP9': {'beta': float, ...},
                        'AF7': {'beta': float, ...},
                        'AF8': {'beta': float, ...},
                        'TP10': {'beta': float, ...}
                    }
                }

        Returns:
            {
                'score': float,          # 0-100, higher is better (with caution)
                'direction': 'higher',   # Higher beta is better (up to a point)
                'feedback_level': str,   # 'low', 'medium', 'good', 'excellent'
                'details': {
                    'beta_power': float,          # Current beta power (µV²)
                    'baseline': float or None,    # Baseline beta power (µV²)
                    'beta_relative': float,       # Percentage of baseline
                    'channel_powers': dict,       # Per-channel beta powers
                    'anxiety_warning': bool,      # True if beta too high
                    'max_beta_observed': float,   # Historical maximum
                    'percent_of_max': float       # Current as % of max
                }
            }

        Raises:
            ValueError: If band_powers is missing required data
        """
        # Validate input
        self._validate_band_powers(band_powers)

        # Extract beta power (already averaged across channels)
        beta_power = band_powers['beta']

        # Update historical maximum
        if beta_power > self.max_beta_observed:
            self.max_beta_observed = beta_power

        # Get per-channel beta powers for detailed feedback
        channel_powers = {}
        if 'channels' in band_powers:
            for channel in ['TP9', 'AF7', 'AF8', 'TP10']:
                if channel in band_powers['channels']:
                    channel_powers[channel] = band_powers['channels'][channel].get('beta', 0.0)

        # Calculate relative beta power if baseline is available
        if self.baseline and 'beta' in self.baseline:
            baseline_beta = self.baseline['beta']

            # Avoid division by zero
            if baseline_beta > 0:
                # Calculate as percentage of baseline (100 = baseline level)
                beta_relative = (beta_power / baseline_beta) * 100
            else:
                logger.warning("Baseline beta power is zero, using absolute scoring")
                beta_relative = beta_power
        else:
            # No baseline - use absolute power
            # Scale to reasonable range (assume typical beta: 5-25 µV²)
            # Map 5 µV² -> 33, 15 µV² -> 100, 30 µV² -> 200
            beta_relative = beta_power * 6.67  # Rough scaling factor

        # Calculate score (0-100)
        # If using baseline: 100 = baseline, 150+ = excellent
        # If absolute: scaled to typical beta range
        score = min(100, max(0, beta_relative))

        # Get threshold configuration
        thresholds = self.config.get('thresholds', {
            'low': 30,
            'medium': 50,
            'good': 70,
            'excellent': 85
        })

        # Determine feedback level
        feedback_level = self._get_feedback_level(score, thresholds)

        # Check for anxiety warning if enabled
        anxiety_warning = False
        percent_of_max = 0.0

        if self.config.get('high_beta_warning', True) and self.max_beta_observed > 0:
            percent_of_max = (beta_power / self.max_beta_observed) * 100

            # Warning thresholds
            if percent_of_max > 90:
                anxiety_warning = True
                logger.warning(f"Beta too high: {beta_power:.1f} µV² ({percent_of_max:.0f}% of max) "
                             f"- possible anxiety/over-arousal")
            elif percent_of_max > 80:
                logger.info(f"Beta elevated: {beta_power:.1f} µV² ({percent_of_max:.0f}% of max) "
                           f"- monitor for tension")

        # Alternative: check if score is too high
        if score > 85:
            if not anxiety_warning:  # Don't double-warn
                anxiety_warning = True
                logger.info(f"Beta score very high ({score:.0f}) - monitor for over-arousal")

        # Compile detailed results
        details = {
            'beta_power': float(beta_power),
            'baseline': self.baseline.get('beta') if self.baseline else None,
            'beta_relative': float(beta_relative),
            'channel_powers': channel_powers,
            'anxiety_warning': anxiety_warning,
            'max_beta_observed': float(self.max_beta_observed),
            'percent_of_max': float(percent_of_max) if self.max_beta_observed > 0 else 0.0
        }

        return {
            'score': float(score),
            'direction': 'higher',
            'feedback_level': feedback_level,
            'details': details
        }

    def reset_max_beta(self) -> None:
        """
        Reset the historical maximum beta value.

        Useful when starting a new session or after recalibration.
        """
        self.max_beta_observed = 0.0
        logger.info("Beta Enhancement: Historical maximum reset")

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

        # Validate high_beta_warning if provided
        if 'high_beta_warning' in self.config:
            if not isinstance(self.config['high_beta_warning'], bool):
                raise ValueError("high_beta_warning must be boolean")
