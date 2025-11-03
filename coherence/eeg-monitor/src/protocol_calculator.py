"""
Protocol Calculator - Generic Calculator for Any Neurofeedback Protocol

This module provides a high-level calculator that manages protocol state,
baseline calibration, metric calculation, and protocol switching.
"""

import numpy as np
from typing import Dict, List, Optional
import logging
import time

from protocols.base import NeurofeedbackProtocol
from protocols.factory import ProtocolFactory


logger = logging.getLogger(__name__)


class ProtocolCalculator:
    """
    Generic calculator that uses any neurofeedback protocol.

    The calculator manages protocol state, baseline calibration, metric
    calculation, and provides utilities for protocol switching and
    session management.

    Key Features:
    - Protocol-agnostic design (works with any NeurofeedbackProtocol)
    - Baseline calibration with multiple samples
    - Metric calculation with validation
    - Protocol switching at runtime
    - Session history tracking
    - Performance monitoring

    Example:
        >>> # Create calculator with alpha enhancement
        >>> protocol = ProtocolFactory.create('alpha_enhancement', {})
        >>> calculator = ProtocolCalculator(protocol)
        >>>
        >>> # Calibrate baseline
        >>> calculator.start_baseline_calibration()
        >>> for sample in baseline_samples:
        ...     calculator.add_baseline_sample(sample)
        >>> calculator.finish_baseline_calibration()
        >>>
        >>> # Calculate metrics
        >>> metrics = calculator.calculate(band_powers)
        >>> print(f"Score: {metrics['score']}")
    """

    def __init__(self, protocol: NeurofeedbackProtocol):
        """
        Initialize the protocol calculator.

        Args:
            protocol: Neurofeedback protocol instance to use for calculations

        Raises:
            ValueError: If protocol is not a valid NeurofeedbackProtocol
        """
        if not isinstance(protocol, NeurofeedbackProtocol):
            raise ValueError(
                f"protocol must be a NeurofeedbackProtocol instance, "
                f"got {type(protocol).__name__}"
            )

        self.protocol = protocol
        self.baseline_samples: List[Dict] = []
        self.baseline_calibrated = False
        self.metric_history: List[Dict] = []
        self.session_start_time: Optional[float] = None
        self.calculation_count = 0

        logger.info(f"ProtocolCalculator initialized with protocol: {self.protocol.name}")

    def calculate(self, band_powers: Dict) -> Dict:
        """
        Calculate neurofeedback metrics using the current protocol.

        Args:
            band_powers: Dictionary containing frequency band power values:
                {
                    'delta': float,
                    'theta': float,
                    'alpha': float,
                    'beta': float,
                    'gamma': float,
                    'channels': {
                        'TP9': {'delta': float, ...},
                        'AF7': {'delta': float, ...},
                        'AF8': {'delta': float, ...},
                        'TP10': {'delta': float, ...}
                    }
                }

        Returns:
            Dictionary containing protocol metrics with metadata:
                {
                    'protocol': str,         # Protocol name
                    'score': float,          # 0-100 score
                    'direction': str,        # 'higher', 'lower', or 'balanced'
                    'feedback_level': str,   # 'low', 'medium', 'good', 'excellent'
                    'details': dict,         # Protocol-specific details
                    'timestamp': float,      # Unix timestamp
                    'calculation_number': int # Sequential calculation number
                }

        Raises:
            ValueError: If band_powers is invalid
        """
        try:
            # Start session timing on first calculation
            if self.session_start_time is None:
                self.session_start_time = time.time()

            # Calculate metrics using protocol
            metrics = self.protocol.calculate_metrics(band_powers)

            # Add metadata
            metrics['protocol'] = self.protocol.name
            metrics['timestamp'] = time.time()
            metrics['calculation_number'] = self.calculation_count

            # Update history
            self.metric_history.append(metrics)
            self.calculation_count += 1

            return metrics

        except Exception as e:
            logger.error(f"Error calculating metrics: {e}", exc_info=True)
            raise

    def start_baseline_calibration(self) -> None:
        """
        Start collecting baseline data.

        Clears any existing baseline samples and prepares for calibration.
        Typically done at the start of a session with eyes closed, relaxed state.

        Example:
            >>> calculator.start_baseline_calibration()
            >>> # Collect 60-120 seconds of data in relaxed state
        """
        self.baseline_samples = []
        self.baseline_calibrated = False
        logger.info(f"{self.protocol.name}: Started baseline calibration")

    def add_baseline_sample(self, band_powers: Dict) -> None:
        """
        Add a sample to baseline calibration.

        Call this repeatedly during baseline collection period to accumulate
        samples for averaging.

        Args:
            band_powers: Band power measurement in same format as calculate()

        Raises:
            ValueError: If band_powers is invalid
        """
        if self.baseline_calibrated:
            logger.warning("Baseline already calibrated. Call start_baseline_calibration() to recalibrate.")
            return

        try:
            # Validate the sample
            self.protocol._validate_band_powers(band_powers)

            # Add to samples
            self.baseline_samples.append(band_powers.copy())

            logger.debug(f"Added baseline sample {len(self.baseline_samples)}")

        except Exception as e:
            logger.error(f"Error adding baseline sample: {e}")
            raise

    def finish_baseline_calibration(self) -> Optional[Dict]:
        """
        Calculate baseline from collected samples and set it on the protocol.

        Averages all band powers across all collected samples to compute
        a stable baseline for normalization.

        Returns:
            Dictionary containing calculated baseline values:
                {
                    'delta': float,
                    'theta': float,
                    'alpha': float,
                    'beta': float,
                    'gamma': float,
                    'sample_count': int
                }
            Returns None if no samples were collected.

        Example:
            >>> baseline = calculator.finish_baseline_calibration()
            >>> print(f"Baseline alpha: {baseline['alpha']:.2f} µV²")
        """
        if not self.baseline_samples:
            logger.warning("No baseline samples collected")
            return None

        try:
            # Calculate average for each band
            baseline = {}
            band_names = ['delta', 'theta', 'alpha', 'beta', 'gamma']

            for band in band_names:
                values = [sample.get(band, 0) for sample in self.baseline_samples]
                baseline[band] = np.mean(values)

            # Set baseline on protocol
            self.protocol.set_baseline(baseline)
            self.baseline_calibrated = True

            # Add metadata
            baseline['sample_count'] = len(self.baseline_samples)

            logger.info(
                f"{self.protocol.name}: Baseline calibrated from {len(self.baseline_samples)} samples: "
                f"alpha={baseline['alpha']:.2f}, theta={baseline['theta']:.2f}, "
                f"beta={baseline['beta']:.2f}"
            )

            return baseline

        except Exception as e:
            logger.error(f"Error finishing baseline calibration: {e}", exc_info=True)
            return None

    def clear_baseline(self) -> None:
        """
        Clear the current baseline and revert to absolute scoring.

        Example:
            >>> calculator.clear_baseline()
        """
        self.protocol.clear_baseline()
        self.baseline_samples = []
        self.baseline_calibrated = False
        logger.info(f"{self.protocol.name}: Baseline cleared")

    def switch_protocol(self, new_protocol: NeurofeedbackProtocol,
                       transfer_baseline: bool = False) -> None:
        """
        Switch to a different neurofeedback protocol.

        Args:
            new_protocol: New protocol instance to use
            transfer_baseline: If True, transfer baseline from old protocol
                              to new protocol (only if compatible)

        Raises:
            ValueError: If new_protocol is invalid

        Example:
            >>> # Switch from alpha to theta
            >>> theta_protocol = ProtocolFactory.create('theta_enhancement', {})
            >>> calculator.switch_protocol(theta_protocol, transfer_baseline=True)
        """
        if not isinstance(new_protocol, NeurofeedbackProtocol):
            raise ValueError(
                f"new_protocol must be a NeurofeedbackProtocol instance, "
                f"got {type(new_protocol).__name__}"
            )

        old_protocol_name = self.protocol.name

        # Transfer baseline if requested and old protocol has one
        if transfer_baseline and self.protocol.baseline:
            old_baseline = self.protocol.baseline.copy()
            new_protocol.set_baseline(old_baseline)
            logger.info(f"Transferred baseline from {old_protocol_name} to {new_protocol.name}")

        # Switch protocol
        self.protocol = new_protocol

        # Clear baseline samples (they were for the old protocol)
        self.baseline_samples = []

        logger.info(f"Switched protocol from {old_protocol_name} to {self.protocol.name}")

    def switch_protocol_by_name(self, protocol_name: str, config: Optional[Dict] = None,
                               transfer_baseline: bool = False) -> None:
        """
        Switch to a protocol by name (convenience method).

        Args:
            protocol_name: Name of protocol to switch to
            config: Configuration for new protocol
            transfer_baseline: Whether to transfer baseline

        Raises:
            ValueError: If protocol_name is invalid

        Example:
            >>> calculator.switch_protocol_by_name('theta_beta_ratio',
            ...                                     {'target_ratio': 1.5})
        """
        new_protocol = ProtocolFactory.create(protocol_name, config)
        self.switch_protocol(new_protocol, transfer_baseline)

    def get_metric_history(self, last_n: Optional[int] = None) -> List[Dict]:
        """
        Get history of calculated metrics.

        Args:
            last_n: If specified, return only the last N metrics

        Returns:
            List of metric dictionaries in chronological order

        Example:
            >>> # Get last 10 metrics
            >>> recent = calculator.get_metric_history(last_n=10)
            >>> avg_score = np.mean([m['score'] for m in recent])
        """
        if last_n is None:
            return self.metric_history.copy()
        else:
            return self.metric_history[-last_n:] if last_n > 0 else []

    def get_session_stats(self) -> Dict:
        """
        Get statistics about the current session.

        Returns:
            Dictionary containing:
                {
                    'protocol': str,
                    'duration_seconds': float,
                    'calculation_count': int,
                    'baseline_calibrated': bool,
                    'baseline_sample_count': int,
                    'avg_score': float,
                    'min_score': float,
                    'max_score': float,
                    'current_score': float
                }

        Example:
            >>> stats = calculator.get_session_stats()
            >>> print(f"Session duration: {stats['duration_seconds']/60:.1f} minutes")
            >>> print(f"Average score: {stats['avg_score']:.1f}")
        """
        stats = {
            'protocol': self.protocol.name,
            'duration_seconds': 0.0,
            'calculation_count': self.calculation_count,
            'baseline_calibrated': self.baseline_calibrated,
            'baseline_sample_count': len(self.baseline_samples)
        }

        # Calculate session duration
        if self.session_start_time:
            stats['duration_seconds'] = time.time() - self.session_start_time

        # Calculate score statistics
        if self.metric_history:
            scores = [m['score'] for m in self.metric_history]
            stats['avg_score'] = float(np.mean(scores))
            stats['min_score'] = float(np.min(scores))
            stats['max_score'] = float(np.max(scores))
            stats['current_score'] = float(scores[-1])
        else:
            stats['avg_score'] = 0.0
            stats['min_score'] = 0.0
            stats['max_score'] = 0.0
            stats['current_score'] = 0.0

        return stats

    def reset_session(self) -> None:
        """
        Reset session data (history, timing) but keep protocol and baseline.

        Useful for starting a new training session without recalibrating.

        Example:
            >>> # Start new session with same protocol and baseline
            >>> calculator.reset_session()
        """
        self.metric_history = []
        self.session_start_time = None
        self.calculation_count = 0

        logger.info(f"{self.protocol.name}: Session reset")

    def reset_all(self) -> None:
        """
        Reset everything including baseline and history.

        Useful for completely fresh start.

        Example:
            >>> calculator.reset_all()
        """
        self.clear_baseline()
        self.reset_session()

        logger.info(f"{self.protocol.name}: Complete reset")

    def __str__(self) -> str:
        """String representation."""
        return f"ProtocolCalculator({self.protocol.name})"

    def __repr__(self) -> str:
        """Detailed string representation."""
        return (
            f"<ProtocolCalculator: protocol={self.protocol.name}, "
            f"calibrated={self.baseline_calibrated}, "
            f"calculations={self.calculation_count}>"
        )
