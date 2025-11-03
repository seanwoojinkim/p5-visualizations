"""
Base Protocol Interface for Neurofeedback Protocols

This module defines the abstract base class that all neurofeedback protocols
must implement. It establishes a plugin architecture for easy protocol extension.
"""

from abc import ABC, abstractmethod
from typing import Dict, Optional, List, Tuple
import logging


logger = logging.getLogger(__name__)


class NeurofeedbackProtocol(ABC):
    """
    Abstract base class for all neurofeedback protocols.

    A neurofeedback protocol defines how to calculate training metrics from
    EEG band powers. Each protocol targets specific brainwave patterns for
    different training goals (e.g., relaxation, focus, mood regulation).

    Attributes:
        name: Human-readable protocol name
        description: Brief description of protocol purpose
        frequency_bands: Dictionary of frequency band ranges used by this protocol
        config: Protocol-specific configuration parameters
    """

    def __init__(self, config: Dict):
        """
        Initialize the neurofeedback protocol.

        Args:
            config: Protocol-specific configuration dictionary containing
                   parameters, thresholds, and other settings
        """
        self.config = config
        self.baseline: Optional[Dict] = None
        self._validate_config()

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable protocol name (e.g., 'Alpha Enhancement')."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Brief description of the protocol's purpose and method."""
        pass

    @property
    @abstractmethod
    def frequency_bands(self) -> Dict[str, Tuple[float, float]]:
        """
        Frequency bands used by this protocol.

        Returns:
            Dictionary mapping band names to (min_freq, max_freq) tuples in Hz.
            Example: {'alpha': (8, 13), 'beta': (12, 30)}
        """
        pass

    @abstractmethod
    def calculate_metrics(self, band_powers: Dict) -> Dict:
        """
        Calculate protocol-specific neurofeedback metrics from band powers.

        This is the core method that implements the protocol's algorithm.

        Args:
            band_powers: Dictionary containing frequency band power values:
                {
                    'delta': float,  # 0.5-4 Hz
                    'theta': float,  # 4-8 Hz
                    'alpha': float,  # 8-13 Hz
                    'beta': float,   # 12-30 Hz
                    'gamma': float,  # 30-50 Hz
                    'channels': {    # Per-channel band powers
                        'TP9': {'delta': float, 'theta': float, ...},
                        'AF7': {'delta': float, 'theta': float, ...},
                        'AF8': {'delta': float, 'theta': float, ...},
                        'TP10': {'delta': float, 'theta': float, ...}
                    }
                }

        Returns:
            Dictionary containing protocol metrics:
                {
                    'score': float,          # 0-100, normalized score
                    'direction': str,        # 'higher', 'lower', or 'balanced'
                    'feedback_level': str,   # 'low', 'medium', 'good', 'excellent'
                    'details': dict          # Protocol-specific additional data
                }

        Raises:
            ValueError: If band_powers is missing required data
        """
        pass

    def set_baseline(self, band_powers: Dict) -> None:
        """
        Set baseline measurements for relative scoring.

        Many protocols benefit from normalizing against a baseline collected
        during a calm, eyes-closed resting state.

        Args:
            band_powers: Baseline band power measurements in same format
                        as calculate_metrics() input
        """
        self.baseline = band_powers.copy()
        logger.info(f"{self.name}: Baseline set")

    def clear_baseline(self) -> None:
        """Clear the baseline, reverting to absolute scoring."""
        self.baseline = None
        logger.info(f"{self.name}: Baseline cleared")

    def get_baseline(self) -> Optional[Dict]:
        """
        Get the current baseline.

        Returns:
            Baseline band powers dictionary, or None if no baseline set
        """
        return self.baseline

    def _validate_config(self) -> None:
        """
        Validate protocol configuration.

        Subclasses should override this to add protocol-specific validation.

        Raises:
            ValueError: If configuration is invalid
        """
        if not isinstance(self.config, dict):
            raise ValueError(f"{self.name}: config must be a dictionary")

    def _validate_band_powers(self, band_powers: Dict) -> None:
        """
        Validate band_powers input structure.

        Args:
            band_powers: Band powers dictionary to validate

        Raises:
            ValueError: If band_powers is missing required keys or malformed
        """
        if not isinstance(band_powers, dict):
            raise ValueError("band_powers must be a dictionary")

        # Check for required band power keys
        required_bands = ['delta', 'theta', 'alpha', 'beta', 'gamma']
        missing_bands = [band for band in required_bands if band not in band_powers]

        if missing_bands:
            raise ValueError(f"Missing required band powers: {missing_bands}")

        # Validate band power values are numeric
        for band in required_bands:
            if not isinstance(band_powers[band], (int, float)):
                raise ValueError(f"Band power '{band}' must be numeric, got {type(band_powers[band])}")

            if band_powers[band] < 0:
                raise ValueError(f"Band power '{band}' must be non-negative")

        # Validate channels structure if present
        if 'channels' in band_powers:
            if not isinstance(band_powers['channels'], dict):
                raise ValueError("band_powers['channels'] must be a dictionary")

            expected_channels = ['TP9', 'AF7', 'AF8', 'TP10']
            for channel in expected_channels:
                if channel not in band_powers['channels']:
                    raise ValueError(f"Missing channel: {channel}")

                channel_data = band_powers['channels'][channel]
                if not isinstance(channel_data, dict):
                    raise ValueError(f"Channel '{channel}' data must be a dictionary")

    def _get_feedback_level(self, score: float, thresholds: Dict) -> str:
        """
        Determine feedback level based on score and thresholds.

        Args:
            score: Calculated score (0-100)
            thresholds: Dictionary with keys 'low', 'medium', 'good', 'excellent'

        Returns:
            Feedback level string: 'low', 'medium', 'good', or 'excellent'
        """
        if score >= thresholds.get('excellent', 85):
            return 'excellent'
        elif score >= thresholds.get('good', 70):
            return 'good'
        elif score >= thresholds.get('medium', 50):
            return 'medium'
        else:
            return 'low'

    def __str__(self) -> str:
        """String representation of protocol."""
        return f"{self.name}"

    def __repr__(self) -> str:
        """Detailed string representation."""
        return f"<{self.__class__.__name__}: {self.name}>"
