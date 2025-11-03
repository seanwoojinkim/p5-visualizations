"""
Theta/Beta Ratio Protocol for Attention Training

This protocol reduces the theta/beta ratio to improve attention, focus, and
reduce ADHD symptoms. Lower ratios indicate better attentional control.

Research Background:
- Most validated protocol for ADHD (67+ controlled studies)
- Typical ADHD ratio: 2.5-3.5, Neurotypical: 1.5-2.5
- Target ratio: < 1.5 for optimal focus
- FDA-approved for ADHD treatment (2013)
- Uses frontal electrodes (AF7, AF8) for best results

CRITICAL: This protocol uses INVERSE SCORING
- Lower theta/beta ratio = HIGHER score (better focus)
- Higher theta/beta ratio = LOWER score (poorer focus)

References:
- Arns, M. et al. (2009). Efficacy of neurofeedback in ADHD
- Monastra, V. J. et al. (2002). Quantitative EEG and ADHD
- FDA approval: Class II device for ADHD (2013)
"""

import numpy as np
from typing import Dict, Tuple
import logging

from .base import NeurofeedbackProtocol


logger = logging.getLogger(__name__)


class ThetaBetaRatio(NeurofeedbackProtocol):
    """
    Theta/Beta Ratio Protocol - Attention and focus training.

    This protocol trains users to reduce their theta/beta ratio, which
    improves attention, concentration, and reduces ADHD symptoms. The
    protocol uses frontal channels (AF7, AF8) for maximum effectiveness.

    CRITICAL - INVERSE SCORING:
        Lower theta/beta ratio = HIGHER score = BETTER focus

    Scoring:
        - Ratio <= 1.5: Excellent focus (score: 100)
        - Ratio 1.5-2.0: Good focus (score: 80)
        - Ratio 2.0-2.5: Medium focus (score: 50)
        - Ratio > 2.5: Low focus (score: decreasing)

    Training Goal:
        Reduce theta/beta ratio from ~2.5 to <1.5 over 20-40 sessions.

    Channel Selection:
        Uses frontal channels ONLY (AF7, AF8) as they show strongest
        correlation with attentional control.

    Example:
        >>> config = {'target_ratio': 1.5}
        >>> protocol = ThetaBetaRatio(config)
        >>> metrics = protocol.calculate_metrics(band_powers)
        >>> print(f"Ratio: {metrics['details']['ratio']:.2f}")
        >>> print(f"Score: {metrics['score']:.1f}/100 (lower ratio is better)")
    """

    @property
    def name(self) -> str:
        """Protocol name."""
        return "Theta/Beta Ratio"

    @property
    def description(self) -> str:
        """Protocol description."""
        return "Attention and focus training (ADHD) - reduces theta/beta ratio"

    @property
    def frequency_bands(self) -> Dict[str, Tuple[float, float]]:
        """Frequency bands used by this protocol."""
        return {
            'theta': (4, 8),
            'beta': (12, 30)
        }

    def calculate_metrics(self, band_powers: Dict) -> Dict:
        """
        Calculate theta/beta ratio metrics with INVERSE scoring.

        Algorithm:
        1. Extract theta and beta power from FRONTAL channels only (AF7, AF8)
        2. Calculate ratio: theta / beta
        3. INVERSE SCORING: Lower ratio gets higher score
        4. Determine feedback level based on ratio thresholds

        Args:
            band_powers: Dictionary containing band powers:
                {
                    'theta': float,  # Average theta power (µV²)
                    'beta': float,   # Average beta power (µV²)
                    'channels': {
                        'TP9': {'theta': float, 'beta': float, ...},
                        'AF7': {'theta': float, 'beta': float, ...},
                        'AF8': {'theta': float, 'beta': float, ...},
                        'TP10': {'theta': float, 'beta': float, ...}
                    }
                }

        Returns:
            {
                'score': float,          # 0-100, INVERSE: lower ratio = higher score
                'direction': 'lower',    # LOWER ratio is better!
                'feedback_level': str,   # 'low', 'medium', 'good', 'excellent'
                'details': {
                    'theta_power': float,     # Frontal theta power (µV²)
                    'beta_power': float,      # Frontal beta power (µV²)
                    'ratio': float,           # Theta/beta ratio
                    'target_ratio': float,    # Target ratio from config
                    'channels_used': list,    # ['AF7', 'AF8']
                    'channel_ratios': dict    # Per-channel ratios
                }
            }

        Raises:
            ValueError: If band_powers is missing required data
        """
        # Validate input
        self._validate_band_powers(band_powers)

        # CRITICAL: Use FRONTAL channels only (AF7, AF8)
        # These show strongest correlation with attentional control
        channels = band_powers.get('channels', {})

        if not channels or 'AF7' not in channels or 'AF8' not in channels:
            raise ValueError("Theta/Beta Ratio protocol requires per-channel data with AF7 and AF8")

        # Extract frontal theta and beta powers
        af7_theta = channels['AF7'].get('theta', 0.0)
        af7_beta = channels['AF7'].get('beta', 0.0)
        af8_theta = channels['AF8'].get('theta', 0.0)
        af8_beta = channels['AF8'].get('beta', 0.0)

        # Average across frontal channels
        theta_power = np.mean([af7_theta, af8_theta])
        beta_power = np.mean([af7_beta, af8_beta])

        # Calculate ratio (avoid division by zero)
        if beta_power > 0:
            ratio = theta_power / beta_power
        else:
            logger.warning("Beta power is zero, using maximum ratio")
            ratio = 10.0  # Very high ratio indicates very poor focus

        # Get target ratio from config
        target_ratio = self.config.get('target_ratio', 1.5)

        # INVERSE SCORING: Lower ratio = higher score
        # Target ratio: 1.5 = excellent (100 points)
        # Ratio 2.0 = good (80 points)
        # Ratio 2.5 = medium (50 points)
        # Ratio 3.0+ = low (decreasing)

        if ratio <= 1.5:
            score = 100
            level = 'excellent'
        elif ratio <= 2.0:
            # Linear interpolation: 1.5->100, 2.0->80
            score = 100 - ((ratio - 1.5) / 0.5) * 20
            level = 'good'
        elif ratio <= 2.5:
            # Linear interpolation: 2.0->80, 2.5->50
            score = 80 - ((ratio - 2.0) / 0.5) * 30
            level = 'medium'
        else:
            # Ratio > 2.5: score decreases rapidly
            score = max(0, 50 - (ratio - 2.5) * 20)
            level = 'low'

        # Calculate per-channel ratios for detailed feedback
        channel_ratios = {
            'AF7': af7_theta / af7_beta if af7_beta > 0 else 10.0,
            'AF8': af8_theta / af8_beta if af8_beta > 0 else 10.0
        }

        # Compile detailed results
        details = {
            'theta_power': float(theta_power),
            'beta_power': float(beta_power),
            'ratio': float(ratio),
            'target_ratio': float(target_ratio),
            'channels_used': ['AF7', 'AF8'],
            'channel_ratios': channel_ratios
        }

        return {
            'score': float(score),
            'direction': 'lower',  # CRITICAL: Lower ratio is better!
            'feedback_level': level,
            'details': details
        }

    def _validate_config(self) -> None:
        """
        Validate protocol-specific configuration.

        Raises:
            ValueError: If configuration is invalid
        """
        super()._validate_config()

        # Validate target_ratio if provided
        if 'target_ratio' in self.config:
            target = self.config['target_ratio']

            if not isinstance(target, (int, float)):
                raise ValueError("target_ratio must be numeric")

            if target <= 0 or target > 10:
                raise ValueError("target_ratio must be between 0 and 10")

            if target < 0.5:
                logger.warning(f"target_ratio {target} is very low - typical range is 1.0-2.0")
