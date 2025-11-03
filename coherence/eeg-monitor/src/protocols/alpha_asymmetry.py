"""
Alpha Asymmetry Protocol for Mood Regulation

This protocol balances left vs right hemisphere alpha activity to regulate
mood and emotional state. Based on Davidson's frontal alpha asymmetry model.

Research Background:
- Left frontal activation (less alpha) = approach motivation, positive affect
- Right frontal activation (less alpha) = withdrawal motivation, negative affect
- Alpha power is INVERSELY related to cortical activity
- Target: Balanced hemispheres or slight left bias for positive mood
- Clinical applications: depression, anxiety, mood disorders

IMPORTANT: Alpha power is inversely related to activation
- Higher alpha = LESS activation (inhibited)
- Lower alpha = MORE activation (active)
- Right > Left alpha = LEFT hemisphere more active = approach/positive
- Left > Right alpha = RIGHT hemisphere more active = withdrawal/negative

Calculation:
- Asymmetry = log(right_alpha) - log(left_alpha)
- Positive asymmetry = right alpha dominant (left more active) = approach
- Negative asymmetry = left alpha dominant (right more active) = withdrawal
- Zero = balanced hemispheres (ideal for training)

References:
- Davidson, R. J. (2004). What does the prefrontal cortex do in affect?
- Allen, J. J. et al. (2004). Regional EEG asymmetries in bipolar disorder
- Henriques, J. B. & Davidson, R. J. (1991). Left frontal hypoactivation in depression
"""

import numpy as np
from typing import Dict, Tuple
import logging

from .base import NeurofeedbackProtocol


logger = logging.getLogger(__name__)


class AlphaAsymmetry(NeurofeedbackProtocol):
    """
    Alpha Asymmetry Protocol - Mood regulation through hemispheric balance.

    This protocol trains users to balance alpha activity between left and
    right frontal hemispheres, promoting emotional regulation and positive
    mood. Based on Richard Davidson's pioneering research on frontal EEG
    asymmetry and affect.

    Key Concept - Alpha Power is INVERSE to Activation:
        - Higher alpha = LESS cortical activation
        - Lower alpha = MORE cortical activation

    Asymmetry Interpretation:
        - Positive (right > left alpha): Left hemisphere MORE active = approach/positive
        - Negative (left > right alpha): Right hemisphere MORE active = withdrawal/negative
        - Zero (balanced): Ideal emotional regulation

    Scoring:
        - Balanced hemispheres (asymmetry near 0): High score
        - Imbalanced hemispheres: Lower score
        - Extreme imbalance: Low score

    Channel Selection:
        Uses AF7 (left frontal) and AF8 (right frontal) exclusively.

    Example:
        >>> config = {}
        >>> protocol = AlphaAsymmetry(config)
        >>> metrics = protocol.calculate_metrics(band_powers)
        >>> print(f"Asymmetry: {metrics['details']['asymmetry']:.3f}")
        >>> print(f"Dominant: {metrics['details']['dominant_hemisphere']}")
    """

    @property
    def name(self) -> str:
        """Protocol name."""
        return "Alpha Asymmetry"

    @property
    def description(self) -> str:
        """Protocol description."""
        return "Mood regulation through left-right brain balance (Davidson's model)"

    @property
    def frequency_bands(self) -> Dict[str, Tuple[float, float]]:
        """Frequency bands used by this protocol."""
        return {'alpha': (8, 13)}

    def calculate_metrics(self, band_powers: Dict) -> Dict:
        """
        Calculate alpha asymmetry metrics using logarithmic difference.

        Algorithm:
        1. Extract alpha power from AF7 (left) and AF8 (right)
        2. Calculate asymmetry: log(right) - log(left)
        3. Calculate imbalance magnitude: abs(asymmetry)
        4. Score based on balance (0 = perfect, higher = worse)

        Args:
            band_powers: Dictionary containing band powers:
                {
                    'alpha': float,  # Average alpha power (µV²)
                    'channels': {
                        'TP9': {'alpha': float, ...},
                        'AF7': {'alpha': float, ...},  # LEFT frontal
                        'AF8': {'alpha': float, ...},  # RIGHT frontal
                        'TP10': {'alpha': float, ...}
                    }
                }

        Returns:
            {
                'score': float,          # 0-100, higher = more balanced
                'direction': 'balanced', # Balance around zero is ideal
                'feedback_level': str,   # 'low', 'medium', 'good', 'excellent'
                'details': {
                    'left_alpha': float,           # AF7 alpha power (µV²)
                    'right_alpha': float,          # AF8 alpha power (µV²)
                    'asymmetry': float,            # log(R) - log(L)
                    'imbalance': float,            # abs(asymmetry)
                    'dominant_hemisphere': str,    # 'left' or 'right'
                    'interpretation': str          # Detailed interpretation
                }
            }

        Raises:
            ValueError: If band_powers is missing required data
        """
        # Validate input
        self._validate_band_powers(band_powers)

        # Extract per-channel data
        channels = band_powers.get('channels', {})

        if not channels or 'AF7' not in channels or 'AF8' not in channels:
            raise ValueError("Alpha Asymmetry protocol requires per-channel data with AF7 and AF8")

        # Extract left and right frontal alpha
        left_alpha = channels['AF7'].get('alpha', 1.0)
        right_alpha = channels['AF8'].get('alpha', 1.0)

        # Ensure positive values for logarithm
        left_alpha = max(left_alpha, 0.001)  # Prevent log(0)
        right_alpha = max(right_alpha, 0.001)

        # Calculate asymmetry using logarithmic difference (standard method)
        # Positive = right alpha > left alpha = left hemisphere more active
        # Negative = left alpha > right alpha = right hemisphere more active
        asymmetry = np.log(right_alpha) - np.log(left_alpha)

        # Calculate imbalance magnitude (distance from zero)
        imbalance = abs(asymmetry)

        # Determine dominant hemisphere
        # Remember: Higher alpha = LESS activation
        # So if right alpha > left alpha, LEFT hemisphere is MORE active
        if asymmetry > 0.05:
            dominant = 'left'  # Left more active (approach/positive)
            interpretation = 'Left hemisphere more active (approach motivation, positive affect)'
        elif asymmetry < -0.05:
            dominant = 'right'  # Right more active (withdrawal/negative)
            interpretation = 'Right hemisphere more active (withdrawal motivation, negative affect)'
        else:
            dominant = 'balanced'
            interpretation = 'Balanced hemispheric activity (ideal for emotional regulation)'

        # Calculate score based on balance
        # Perfect balance (asymmetry = 0) = 100 points
        # Imbalance of 0.1 = ~95 points
        # Imbalance of 0.2 = ~90 points
        # Imbalance of 0.5+ = <75 points
        #
        # Score decreases as imbalance increases
        score = max(0, 100 - imbalance * 50)

        # Determine feedback level
        if imbalance < 0.1:
            level = 'excellent'
        elif imbalance < 0.2:
            level = 'good'
        elif imbalance < 0.3:
            level = 'medium'
        else:
            level = 'low'

        # Compile detailed results
        details = {
            'left_alpha': float(left_alpha),
            'right_alpha': float(right_alpha),
            'asymmetry': float(asymmetry),
            'imbalance': float(imbalance),
            'dominant_hemisphere': dominant,
            'interpretation': interpretation
        }

        return {
            'score': float(score),
            'direction': 'balanced',
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

        # Alpha asymmetry doesn't require specific config parameters
        # but we could add customization for target asymmetry, etc.
        pass
