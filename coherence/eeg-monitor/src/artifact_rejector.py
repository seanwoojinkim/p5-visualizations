"""
Artifact Rejector for EEG Data

Detects and flags common EEG artifacts:
- Eye blinks (frontal channels)
- Eye movements (asymmetric frontal changes)
- Jaw clenches (high-frequency muscle activity)
- Head movements (large amplitude changes)
- Electrode pops (sharp transients from poor contact)

Uses multiple detection strategies including:
- Amplitude thresholding
- Frequency domain analysis
- Cross-channel correlation
- Temporal gradient analysis
"""

import numpy as np
from scipy import signal
from scipy.stats import zscore
from typing import Dict, List, Optional, Tuple
import logging


logger = logging.getLogger(__name__)


class ArtifactRejector:
    """
    Detects artifacts in multi-channel EEG data.

    Implements research-validated detection methods for common EEG artifacts
    that can contaminate neurofeedback signals. Each artifact type has
    specific signatures in amplitude, frequency, or spatial characteristics.

    Attributes:
        sample_rate: EEG sampling rate in Hz
        blink_threshold: Amplitude threshold for blink detection (µV)
        movement_threshold: Amplitude threshold for movement (µV)
        jaw_freq_range: Frequency range for jaw muscle activity (Hz)
        pop_gradient_threshold: Temporal gradient for electrode pops (µV/sample)
        window_size: Analysis window size in samples

    Example:
        >>> config = {'sample_rate': 256, 'blink_threshold': 150}
        >>> rejector = ArtifactRejector(config)
        >>> data = {
        ...     'AF7': np.random.randn(512),
        ...     'AF8': np.random.randn(512),
        ...     'TP9': np.random.randn(512),
        ...     'TP10': np.random.randn(512)
        ... }
        >>> artifacts = rejector.detect_artifacts(data)
        >>> if artifacts['blinks'] > 0:
        ...     print(f"Detected {artifacts['blinks']} blinks")
    """

    def __init__(self, config: Dict):
        """
        Initialize the artifact rejector.

        Args:
            config: Configuration dictionary containing:
                - sample_rate: Sampling rate in Hz (default: 256)
                - blink_threshold: Blink detection threshold in µV (default: 150)
                - movement_threshold: Movement threshold in µV (default: 100)
                - jaw_freq_range: Frequency range for jaw detection (default: [30, 100])
                - jaw_power_threshold: Power threshold for jaw detection (default: 2.0)
                - pop_gradient_threshold: Gradient for electrode pops (default: 50)
                - eye_movement_correlation: Correlation threshold (default: -0.5)
                - rejection_threshold: Max acceptable artifact ratio (default: 0.15)
        """
        self.sample_rate = config.get('sample_rate', 256)
        self.blink_threshold = config.get('blink_threshold', 150)
        self.movement_threshold = config.get('movement_threshold', 100)
        self.jaw_freq_range = tuple(config.get('jaw_freq_range', [30, 100]))
        self.jaw_power_threshold = config.get('jaw_power_threshold', 2.0)
        self.pop_gradient_threshold = config.get('pop_gradient_threshold', 50)
        self.eye_movement_correlation = config.get('eye_movement_correlation', -0.5)
        self.rejection_threshold = config.get('rejection_threshold', 0.15)

        # Calculate window size for frequency analysis (500ms)
        self.window_size = int(self.sample_rate * 0.5)

        logger.info(f"ArtifactRejector initialized: blink={self.blink_threshold}µV, "
                   f"movement={self.movement_threshold}µV, "
                   f"jaw_freq={self.jaw_freq_range}Hz")

    def detect_artifacts(self, data: Dict[str, np.ndarray]) -> Dict:
        """
        Detect artifacts in multi-channel EEG data.

        Performs comprehensive artifact detection using multiple strategies:
        1. Eye blinks - large amplitude spikes in frontal channels
        2. Eye movements - correlated changes in left/right frontal
        3. Jaw clenches - high-frequency power (muscle artifact)
        4. Head movements - large amplitude changes across all channels
        5. Electrode pops - sharp transient spikes (poor contact)

        Args:
            data: Dictionary with channel names as keys, samples as values.
                  Expected channels: 'TP9', 'AF7', 'AF8', 'TP10'
                  Values should be numpy arrays of equal length.

        Returns:
            Dictionary with artifact detection results:
            {
                'blinks': int,              # Number of blink events detected
                'eye_movements': int,       # Number of eye movement events
                'jaw_clenches': int,        # Number of jaw clench events
                'head_movements': int,      # Number of head movement events
                'electrode_pops': int,      # Number of electrode pop events
                'total_artifacts': int,     # Total artifact count
                'artifact_ratio': float,    # Ratio of artifact samples (0-1)
                'clean_data': bool,         # True if below rejection threshold
                'details': {                # Detailed diagnostic information
                    'blink_amplitudes': List[float],
                    'jaw_power': float,
                    'max_gradient': float,
                    'eye_correlation': float
                }
            }

        Raises:
            ValueError: If data format is invalid or channels are missing
        """
        # Validate input data
        self._validate_data(data)

        artifacts = {
            'blinks': 0,
            'eye_movements': 0,
            'jaw_clenches': 0,
            'head_movements': 0,
            'electrode_pops': 0,
            'details': {}
        }

        try:
            # Get channel data (convert lists to arrays if needed)
            af7_data = np.asarray(data.get('AF7', []))
            af8_data = np.asarray(data.get('AF8', []))
            tp9_data = np.asarray(data.get('TP9', []))
            tp10_data = np.asarray(data.get('TP10', []))

            # Eye blink detection (frontal channels)
            if len(af7_data) > 0 and len(af8_data) > 0:
                blinks, blink_amps = self._detect_blinks(af7_data, af8_data)
                artifacts['blinks'] = blinks
                artifacts['details']['blink_amplitudes'] = blink_amps

            # Eye movement detection (asymmetric frontal changes)
            if len(af7_data) > 0 and len(af8_data) > 0:
                eye_movements, correlation = self._detect_eye_movements(af7_data, af8_data)
                artifacts['eye_movements'] = eye_movements
                artifacts['details']['eye_correlation'] = correlation

            # Jaw clench detection (high frequency power)
            if len(af7_data) >= self.window_size:
                jaw_clenches, jaw_power = self._detect_jaw_clenches(data)
                artifacts['jaw_clenches'] = jaw_clenches
                artifacts['details']['jaw_power'] = jaw_power

            # Head movement detection (all channels)
            head_movements = self._detect_head_movements(data)
            artifacts['head_movements'] = head_movements

            # Electrode pop detection (sharp transients)
            pops, max_gradient = self._detect_electrode_pops(data)
            artifacts['electrode_pops'] = pops
            artifacts['details']['max_gradient'] = max_gradient

            # Calculate totals
            artifacts['total_artifacts'] = sum([
                artifacts['blinks'],
                artifacts['eye_movements'],
                artifacts['jaw_clenches'],
                artifacts['head_movements'],
                artifacts['electrode_pops']
            ])

            # Calculate artifact ratio
            total_samples = len(next(iter(data.values())))
            if total_samples > 0:
                artifacts['artifact_ratio'] = artifacts['total_artifacts'] / total_samples
            else:
                artifacts['artifact_ratio'] = 0.0

            # Determine if data should be rejected
            artifacts['clean_data'] = not self.should_reject_epoch(artifacts)

            logger.debug(f"Artifacts detected: blinks={artifacts['blinks']}, "
                        f"eye_mvmt={artifacts['eye_movements']}, "
                        f"jaw={artifacts['jaw_clenches']}, "
                        f"head={artifacts['head_movements']}, "
                        f"pops={artifacts['electrode_pops']}, "
                        f"ratio={artifacts['artifact_ratio']:.3f}")

            return artifacts

        except Exception as e:
            logger.error(f"Error detecting artifacts: {e}", exc_info=True)
            # Return safe default
            return {
                'blinks': 0,
                'eye_movements': 0,
                'jaw_clenches': 0,
                'head_movements': 0,
                'electrode_pops': 0,
                'total_artifacts': 0,
                'artifact_ratio': 0.0,
                'clean_data': True,
                'details': {'error': str(e)}
            }

    def _validate_data(self, data: Dict) -> None:
        """
        Validate input data format.

        Args:
            data: Channel data dictionary

        Raises:
            ValueError: If data format is invalid
        """
        if not isinstance(data, dict):
            raise ValueError("Data must be a dictionary")

        if len(data) == 0:
            raise ValueError("Data dictionary is empty")

        # Check that all channels have same length
        lengths = [len(samples) for samples in data.values()]
        if len(set(lengths)) > 1:
            raise ValueError(f"All channels must have same length, got: {lengths}")

        # Check for minimum data
        if lengths[0] == 0:
            raise ValueError("Data arrays are empty")

    def _detect_blinks(self, af7_data: np.ndarray, af8_data: np.ndarray) -> Tuple[int, List[float]]:
        """
        Detect eye blinks as simultaneous large amplitude spikes in frontal channels.

        Eye blinks produce large-amplitude, brief voltage deflections that appear
        simultaneously in both frontal electrodes (AF7 and AF8) with similar polarity.

        Args:
            af7_data: Left frontal channel data
            af8_data: Right frontal channel data

        Returns:
            Tuple of (blink_count, blink_amplitudes)
        """
        if len(af7_data) == 0 or len(af8_data) == 0:
            return 0, []

        # Find samples where both channels exceed threshold
        af7_exceed = np.abs(af7_data) > self.blink_threshold
        af8_exceed = np.abs(af8_data) > self.blink_threshold

        # Blinks are simultaneous in both channels
        simultaneous = np.logical_and(af7_exceed, af8_exceed)

        # Count contiguous regions as single blinks (debouncing)
        if np.sum(simultaneous) == 0:
            return 0, []

        # Find blink events (contiguous regions)
        blink_events = []
        in_blink = False
        blink_start = 0

        for i, is_blink in enumerate(simultaneous):
            if is_blink and not in_blink:
                # Start of new blink
                in_blink = True
                blink_start = i
            elif not is_blink and in_blink:
                # End of blink
                in_blink = False
                # Record max amplitude during blink
                blink_amp = max(
                    np.max(np.abs(af7_data[blink_start:i])),
                    np.max(np.abs(af8_data[blink_start:i]))
                )
                blink_events.append(blink_amp)

        # Handle case where blink extends to end
        if in_blink:
            blink_amp = max(
                np.max(np.abs(af7_data[blink_start:])),
                np.max(np.abs(af8_data[blink_start:]))
            )
            blink_events.append(blink_amp)

        return len(blink_events), blink_events

    def _detect_eye_movements(self, af7_data: np.ndarray, af8_data: np.ndarray) -> Tuple[int, float]:
        """
        Detect eye movements via asymmetric changes in frontal channels.

        Horizontal eye movements (saccades) produce opposite-polarity signals
        in left and right frontal channels due to the corneoretinal dipole.

        Args:
            af7_data: Left frontal channel data
            af8_data: Right frontal channel data

        Returns:
            Tuple of (movement_count, correlation_coefficient)
        """
        if len(af7_data) < 10 or len(af8_data) < 10:
            return 0, 0.0

        try:
            # Calculate correlation between channels
            # Eye movements produce negative correlation (opposite polarity)
            correlation = np.corrcoef(af7_data, af8_data)[0, 1]

            # Strong negative correlation indicates eye movements
            if correlation < self.eye_movement_correlation:
                # Count regions with sustained negative correlation
                # Use sliding window
                window = 32  # ~125ms at 256 Hz
                movement_count = 0

                for i in range(0, len(af7_data) - window, window // 2):
                    window_corr = np.corrcoef(
                        af7_data[i:i+window],
                        af8_data[i:i+window]
                    )[0, 1]

                    if window_corr < self.eye_movement_correlation:
                        movement_count += 1

                return movement_count, float(correlation)
            else:
                return 0, float(correlation)

        except Exception as e:
            logger.warning(f"Error detecting eye movements: {e}")
            return 0, 0.0

    def _detect_jaw_clenches(self, data: Dict[str, np.ndarray]) -> Tuple[int, float]:
        """
        Detect jaw clenches via high-frequency power (muscle artifact).

        Jaw muscle activity (EMG) produces high-frequency contamination in the
        EEG signal, typically concentrated in the 30-100 Hz range, particularly
        visible in temporal channels (TP9, TP10).

        Args:
            data: Dictionary of channel data

        Returns:
            Tuple of (clench_count, average_high_freq_power)
        """
        # Focus on temporal channels (closest to jaw muscles)
        temporal_channels = ['TP9', 'TP10']

        jaw_power_values = []

        for channel in temporal_channels:
            if channel not in data:
                continue

            channel_data = np.asarray(data[channel])

            if len(channel_data) < self.window_size:
                continue

            try:
                # Calculate power spectral density
                freqs, psd = signal.welch(
                    channel_data,
                    fs=self.sample_rate,
                    nperseg=min(len(channel_data), self.window_size),
                    noverlap=self.window_size // 2
                )

                # Extract power in jaw frequency range (30-100 Hz)
                jaw_mask = np.logical_and(
                    freqs >= self.jaw_freq_range[0],
                    freqs <= self.jaw_freq_range[1]
                )
                jaw_power = np.trapz(psd[jaw_mask], freqs[jaw_mask])

                # Extract baseline power in alpha/beta range (8-30 Hz)
                baseline_mask = np.logical_and(freqs >= 8, freqs <= 30)
                baseline_power = np.trapz(psd[baseline_mask], freqs[baseline_mask])

                # Calculate ratio (muscle artifact elevates high frequencies)
                if baseline_power > 0:
                    power_ratio = jaw_power / baseline_power
                    jaw_power_values.append(power_ratio)

            except Exception as e:
                logger.warning(f"Error analyzing {channel} for jaw clenches: {e}")

        if not jaw_power_values:
            return 0, 0.0

        avg_jaw_power = np.mean(jaw_power_values)

        # Count as jaw clench if ratio exceeds threshold
        clench_count = int(avg_jaw_power > self.jaw_power_threshold)

        return clench_count, float(avg_jaw_power)

    def _detect_head_movements(self, data: Dict[str, np.ndarray]) -> int:
        """
        Detect head movements as large amplitude changes across all channels.

        Head movements produce correlated, large-amplitude deflections across
        all channels due to electrode displacement and cable movement.

        Args:
            data: Dictionary of channel data

        Returns:
            Number of movement events detected
        """
        movement_count = 0

        # Check all channels for large excursions
        for channel, channel_data in data.items():
            if len(channel_data) == 0:
                continue

            channel_array = np.asarray(channel_data)

            # Look for samples exceeding movement threshold
            exceeds_threshold = np.abs(channel_array) > self.movement_threshold

            if np.any(exceeds_threshold):
                # Count contiguous regions as single movements
                movements = np.diff(exceeds_threshold.astype(int))
                # Count rising edges (start of movement)
                movement_count += np.sum(movements == 1)

        return movement_count

    def _detect_electrode_pops(self, data: Dict[str, np.ndarray]) -> Tuple[int, float]:
        """
        Detect electrode pops as sharp transient spikes from poor contact.

        Electrode pops (or "spikes") occur when an electrode momentarily loses
        contact with the scalp, producing sharp, isolated voltage spikes.
        Detected using temporal gradient analysis.

        Args:
            data: Dictionary of channel data

        Returns:
            Tuple of (pop_count, max_gradient_observed)
        """
        pop_count = 0
        max_gradient = 0.0

        for channel, channel_data in data.items():
            if len(channel_data) < 2:
                continue

            channel_array = np.asarray(channel_data)

            # Calculate temporal gradient (rate of change)
            gradient = np.abs(np.diff(channel_array))

            # Find sharp spikes (large gradient)
            pop_samples = gradient > self.pop_gradient_threshold

            if np.any(pop_samples):
                # Count discrete pop events
                pops = np.diff(pop_samples.astype(int))
                pop_count += np.sum(pops == 1)

                # Track maximum gradient
                channel_max_grad = np.max(gradient)
                if channel_max_grad > max_gradient:
                    max_gradient = channel_max_grad

        return pop_count, float(max_gradient)

    def should_reject_epoch(self, artifacts: Dict, threshold: Optional[float] = None) -> bool:
        """
        Determine if an epoch should be rejected based on artifact content.

        Uses configurable threshold to decide if artifact contamination
        is too severe for reliable neurofeedback metrics.

        Args:
            artifacts: Artifact detection results from detect_artifacts()
            threshold: Maximum acceptable artifact ratio (default: use config value)

        Returns:
            True if epoch should be rejected (too many artifacts)
            False if epoch is acceptable for analysis

        Example:
            >>> artifacts = rejector.detect_artifacts(data)
            >>> if rejector.should_reject_epoch(artifacts):
            ...     print("Data quality too poor - skipping this epoch")
        """
        if threshold is None:
            threshold = self.rejection_threshold

        artifact_ratio = artifacts.get('artifact_ratio', 0.0)

        # Additional strict rejection criteria
        # Reject if any single blink is extremely large
        blink_amps = artifacts.get('details', {}).get('blink_amplitudes', [])
        if blink_amps and max(blink_amps) > self.blink_threshold * 2:
            logger.debug(f"Rejecting due to extreme blink: {max(blink_amps):.1f}µV")
            return True

        # Reject if jaw power ratio is very high
        jaw_power = artifacts.get('details', {}).get('jaw_power', 0.0)
        if jaw_power > self.jaw_power_threshold * 2:
            logger.debug(f"Rejecting due to extreme jaw clench: {jaw_power:.2f}")
            return True

        # Standard rejection based on overall artifact ratio
        should_reject = artifact_ratio > threshold

        if should_reject:
            logger.debug(f"Rejecting epoch: artifact_ratio={artifact_ratio:.3f} > {threshold:.3f}")

        return should_reject

    def get_config(self) -> Dict:
        """
        Get current configuration.

        Returns:
            Dictionary of configuration parameters
        """
        return {
            'sample_rate': self.sample_rate,
            'blink_threshold': self.blink_threshold,
            'movement_threshold': self.movement_threshold,
            'jaw_freq_range': self.jaw_freq_range,
            'jaw_power_threshold': self.jaw_power_threshold,
            'pop_gradient_threshold': self.pop_gradient_threshold,
            'eye_movement_correlation': self.eye_movement_correlation,
            'rejection_threshold': self.rejection_threshold
        }
