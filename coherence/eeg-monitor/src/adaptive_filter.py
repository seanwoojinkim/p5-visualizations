"""
Adaptive Filter for EEG Data

Implements adaptive filtering techniques that automatically adjust to signal characteristics:
- Adaptive notch filtering for line noise (50/60 Hz auto-detection)
- Adaptive baseline correction (DC drift removal)
- Automatic parameter tuning based on signal properties

Key features:
- Auto-detects power line frequency (50 Hz Europe/Asia vs 60 Hz Americas)
- Adapts to signal characteristics over time
- Preserves important low-frequency content
- Numerically stable using second-order sections
"""

import numpy as np
from scipy import signal
from scipy.signal import butter, iirnotch, filtfilt, welch
from typing import Optional, Tuple, Dict
import logging


logger = logging.getLogger(__name__)


class AdaptiveFilter:
    """
    Adaptive filtering for EEG signals.

    Automatically detects and removes line noise, corrects baseline drift,
    and adapts filter parameters based on signal characteristics.

    The filter "learns" from the signal:
    - Detects whether 50 Hz or 60 Hz line noise is present
    - Adjusts notch frequency to track slow drifts in line frequency
    - Adapts baseline correction to signal dynamics

    Attributes:
        sample_rate: Sampling rate in Hz
        line_freq: Detected line noise frequency (50 or 60 Hz)
        notch_filter: IIR notch filter coefficients (SOS format)
        highpass_filter: High-pass filter for DC drift removal
        line_freq_history: History of detected line frequencies
        detection_window: Number of samples for line frequency detection

    Example:
        >>> config = {'sample_rate': 256, 'auto_detect_line_noise': True}
        >>> adaptive_filter = AdaptiveFilter(config)
        >>>
        >>> # Process EEG data
        >>> clean_data = adaptive_filter.apply_adaptive_notch(raw_data)
        >>> clean_data = adaptive_filter.remove_dc_drift(clean_data)
        >>>
        >>> # Check detected line frequency
        >>> print(f"Line noise: {adaptive_filter.line_freq} Hz")
    """

    def __init__(self, config: Dict):
        """
        Initialize adaptive filter.

        Args:
            config: Configuration dictionary containing:
                - sample_rate: Sampling rate in Hz (default: 256)
                - auto_detect_line_noise: Enable auto-detection (default: True)
                - force_line_freq: Force specific frequency, None = auto (default: None)
                - notch_q_factor: Quality factor for notch filter (default: 30)
                - dc_cutoff: High-pass cutoff for DC removal in Hz (default: 0.5)
                - dc_order: Filter order for DC removal (default: 2)
                - detection_threshold: Power threshold for line noise (default: 1.5)
                - update_interval: Samples between detection updates (default: 2560)
        """
        self.sample_rate = config.get('sample_rate', 256)
        self.auto_detect = config.get('auto_detect_line_noise', True)
        self.force_line_freq = config.get('force_line_freq', None)
        self.notch_q_factor = config.get('notch_q_factor', 30)
        self.dc_cutoff = config.get('dc_cutoff', 0.5)
        self.dc_order = config.get('dc_order', 2)
        self.detection_threshold = config.get('detection_threshold', 1.5)
        self.update_interval = config.get('update_interval', 2560)  # ~10 seconds at 256 Hz

        # State variables
        self.line_freq: Optional[float] = self.force_line_freq
        self.notch_filter_sos: Optional[np.ndarray] = None
        self.highpass_filter_sos: Optional[np.ndarray] = None
        self.line_freq_history: list = []
        self.samples_since_detection = 0
        self.detection_window = min(self.sample_rate * 4, 1024)  # 4 seconds or 1024 samples

        # Design static filters
        self._design_highpass_filter()

        # Design initial notch filter if frequency is forced
        if self.force_line_freq:
            self._design_notch_filter(self.force_line_freq)
            logger.info(f"AdaptiveFilter initialized with forced {self.force_line_freq} Hz notch")
        else:
            logger.info(f"AdaptiveFilter initialized with auto-detection enabled")

    def _design_notch_filter(self, frequency: float) -> None:
        """
        Design IIR notch filter for specified frequency.

        Args:
            frequency: Center frequency to notch (Hz)
        """
        try:
            # Design notch filter
            b, a = iirnotch(frequency, self.notch_q_factor, self.sample_rate)

            # Convert to second-order sections for numerical stability
            self.notch_filter_sos = signal.tf2sos(b, a)

            logger.debug(f"Designed notch filter at {frequency} Hz (Q={self.notch_q_factor})")

        except Exception as e:
            logger.error(f"Error designing notch filter: {e}")
            self.notch_filter_sos = None

    def _design_highpass_filter(self) -> None:
        """
        Design high-pass filter for DC drift removal.

        Uses Butterworth filter with configurable cutoff frequency.
        Preserves important low-frequency EEG content (delta, theta).
        """
        try:
            # Design high-pass Butterworth filter
            nyquist = self.sample_rate / 2
            normalized_cutoff = self.dc_cutoff / nyquist

            # Ensure cutoff is valid (must be < 1.0 for digital filters)
            if normalized_cutoff >= 1.0:
                logger.warning(f"DC cutoff {self.dc_cutoff} Hz too high for sample rate "
                             f"{self.sample_rate} Hz, using 0.5 Hz")
                normalized_cutoff = 0.5 / nyquist

            self.highpass_filter_sos = butter(
                self.dc_order,
                normalized_cutoff,
                btype='high',
                output='sos'
            )

            logger.debug(f"Designed high-pass filter at {self.dc_cutoff} Hz (order {self.dc_order})")

        except Exception as e:
            logger.error(f"Error designing high-pass filter: {e}")
            self.highpass_filter_sos = None

    def detect_line_noise(self, data: np.ndarray) -> Optional[float]:
        """
        Detect dominant line noise frequency (50 or 60 Hz).

        Analyzes power spectral density to identify peaks near standard
        power line frequencies. Returns the frequency with highest power
        if it exceeds the detection threshold.

        Args:
            data: EEG data array (at least 1 second recommended)

        Returns:
            Detected frequency (50.0 or 60.0) or None if no significant line noise

        Example:
            >>> freq = adaptive_filter.detect_line_noise(eeg_data)
            >>> if freq:
            ...     print(f"Detected {freq} Hz line noise")
        """
        if len(data) < self.detection_window:
            logger.debug(f"Insufficient data for line noise detection: {len(data)} < {self.detection_window}")
            return None

        try:
            # Calculate power spectral density
            freqs, psd = welch(
                data,
                fs=self.sample_rate,
                nperseg=min(len(data), self.detection_window),
                noverlap=self.detection_window // 2,
                scaling='spectrum'  # Power spectrum for amplitude
            )

            # Define search windows around 50 and 60 Hz
            # Use wider windows to catch frequency drift
            window_50 = (freqs >= 48) & (freqs <= 52)
            window_60 = (freqs >= 58) & (freqs <= 62)

            if not np.any(window_50) or not np.any(window_60):
                logger.warning("Frequency resolution insufficient for line noise detection")
                return None

            # Calculate total power in each window
            power_50 = np.sum(psd[window_50])
            power_60 = np.sum(psd[window_60])

            # Calculate baseline power (exclude line noise regions)
            baseline_mask = ((freqs >= 40) & (freqs < 48)) | ((freqs > 52) & (freqs < 58))
            if np.any(baseline_mask):
                baseline_power = np.mean(psd[baseline_mask])
            else:
                baseline_power = np.mean(psd)

            # Detect significant line noise
            if baseline_power == 0:
                return None

            ratio_50 = power_50 / baseline_power
            ratio_60 = power_60 / baseline_power

            logger.debug(f"Line noise ratios: 50Hz={ratio_50:.2f}, 60Hz={ratio_60:.2f}, "
                        f"threshold={self.detection_threshold}")

            # Return frequency with highest power ratio if above threshold
            if ratio_50 > ratio_60 and ratio_50 > self.detection_threshold:
                # Find exact peak in 50 Hz window
                peak_idx = np.argmax(psd[window_50])
                detected_freq = freqs[window_50][peak_idx]
                # Round to nearest 0.1 Hz
                return round(detected_freq, 1)

            elif ratio_60 > self.detection_threshold:
                # Find exact peak in 60 Hz window
                peak_idx = np.argmax(psd[window_60])
                detected_freq = freqs[window_60][peak_idx]
                # Round to nearest 0.1 Hz
                return round(detected_freq, 1)

            else:
                # No significant line noise detected
                return None

        except Exception as e:
            logger.error(f"Error detecting line noise: {e}", exc_info=True)
            return None

    def apply_adaptive_notch(self, data: np.ndarray) -> np.ndarray:
        """
        Apply adaptive notch filter to remove line noise.

        Automatically detects line frequency on first call or periodically,
        then applies IIR notch filter. Adapts to frequency drift over time.

        Args:
            data: Raw EEG data array

        Returns:
            Filtered EEG data with line noise removed

        Notes:
            - First call triggers line noise detection
            - Periodic re-detection adapts to frequency drift
            - If no line noise detected, returns original data
            - Uses zero-phase filtering (filtfilt) to preserve timing

        Example:
            >>> clean = adaptive_filter.apply_adaptive_notch(raw_eeg)
        """
        if len(data) < 10:
            return data

        # Periodic line frequency detection/update
        self.samples_since_detection += len(data)

        if self.auto_detect and (self.line_freq is None or
                                 self.samples_since_detection >= self.update_interval):

            # Attempt to detect line frequency
            detected_freq = self.detect_line_noise(data)

            if detected_freq is not None:
                # Update if frequency changed significantly (> 0.5 Hz)
                if self.line_freq is None or abs(detected_freq - self.line_freq) > 0.5:
                    logger.info(f"Line noise detected: {detected_freq} Hz "
                               f"(was {self.line_freq} Hz)")
                    self.line_freq = detected_freq
                    self._design_notch_filter(detected_freq)

                # Track frequency history
                self.line_freq_history.append(detected_freq)
                if len(self.line_freq_history) > 100:
                    self.line_freq_history.pop(0)

            self.samples_since_detection = 0

        # Apply notch filter if available
        if self.notch_filter_sos is not None:
            try:
                # Zero-phase filtering (no time delay)
                filtered = signal.sosfiltfilt(self.notch_filter_sos, data)
                return filtered
            except Exception as e:
                logger.error(f"Error applying notch filter: {e}")
                return data
        else:
            # No filter available, return original data
            return data

    def remove_dc_drift(self, data: np.ndarray) -> np.ndarray:
        """
        Remove DC offset and slow baseline drifts using adaptive high-pass filter.

        Removes very low frequency components (< 0.5 Hz) that represent
        electrode drift, skin potential changes, and DC offsets, while
        preserving important EEG content including delta waves.

        Args:
            data: Raw or notch-filtered EEG data

        Returns:
            Data with DC drift removed

        Notes:
            - Preserves delta band (0.5-4 Hz) and all higher frequencies
            - Uses zero-phase filtering to prevent signal delay
            - Handles edge artifacts gracefully

        Example:
            >>> baseline_corrected = adaptive_filter.remove_dc_drift(eeg_data)
        """
        if len(data) < 20:  # Need minimum samples for filtfilt
            return data

        if self.highpass_filter_sos is None:
            return data

        try:
            # Zero-phase filtering
            filtered = signal.sosfiltfilt(self.highpass_filter_sos, data)
            return filtered

        except Exception as e:
            logger.error(f"Error removing DC drift: {e}")
            return data

    def apply_full_pipeline(self, data: np.ndarray) -> np.ndarray:
        """
        Apply complete adaptive filtering pipeline.

        Sequentially applies:
        1. Adaptive notch filtering (line noise removal)
        2. DC drift removal (baseline correction)

        This is the recommended method for complete adaptive filtering.

        Args:
            data: Raw EEG data

        Returns:
            Fully filtered EEG data

        Example:
            >>> clean_eeg = adaptive_filter.apply_full_pipeline(raw_eeg)
        """
        # Step 1: Remove line noise
        data = self.apply_adaptive_notch(data)

        # Step 2: Remove DC drift
        data = self.remove_dc_drift(data)

        return data

    def get_status(self) -> Dict:
        """
        Get current filter status and detected parameters.

        Returns:
            Dictionary containing:
                - line_freq: Detected line frequency (Hz) or None
                - auto_detect: Whether auto-detection is enabled
                - notch_enabled: Whether notch filter is active
                - dc_cutoff: High-pass cutoff frequency (Hz)
                - samples_since_detection: Samples since last detection
                - freq_history_mean: Mean of detected frequencies
                - freq_history_std: Standard deviation of frequencies

        Example:
            >>> status = adaptive_filter.get_status()
            >>> print(f"Using {status['line_freq']} Hz notch filter")
        """
        status = {
            'line_freq': self.line_freq,
            'auto_detect': self.auto_detect,
            'notch_enabled': self.notch_filter_sos is not None,
            'dc_cutoff': self.dc_cutoff,
            'samples_since_detection': self.samples_since_detection,
            'update_interval': self.update_interval
        }

        # Add history statistics if available
        if self.line_freq_history:
            status['freq_history_mean'] = float(np.mean(self.line_freq_history))
            status['freq_history_std'] = float(np.std(self.line_freq_history))
            status['freq_history_count'] = len(self.line_freq_history)
        else:
            status['freq_history_mean'] = None
            status['freq_history_std'] = None
            status['freq_history_count'] = 0

        return status

    def reset(self) -> None:
        """
        Reset adaptive filter state.

        Clears:
        - Detected line frequency
        - Frequency history
        - Sample counters

        Does NOT reset configuration or static filters.
        """
        if not self.force_line_freq:
            self.line_freq = None
            self.notch_filter_sos = None

        self.line_freq_history = []
        self.samples_since_detection = 0

        logger.info("AdaptiveFilter state reset")

    def set_line_frequency(self, frequency: float) -> None:
        """
        Manually set line noise frequency.

        Overrides auto-detection and forces specific frequency.

        Args:
            frequency: Line frequency in Hz (typically 50 or 60)

        Raises:
            ValueError: If frequency is invalid
        """
        if not (40 <= frequency <= 70):
            raise ValueError(f"Line frequency must be between 40-70 Hz, got {frequency}")

        self.line_freq = frequency
        self.force_line_freq = frequency
        self.auto_detect = False
        self._design_notch_filter(frequency)

        logger.info(f"Line frequency manually set to {frequency} Hz (auto-detection disabled)")

    def enable_auto_detection(self) -> None:
        """
        Re-enable automatic line noise detection.

        Resets forced frequency and enables adaptive behavior.
        """
        self.force_line_freq = None
        self.auto_detect = True
        self.line_freq = None
        self.notch_filter_sos = None
        self.samples_since_detection = 0

        logger.info("Auto-detection enabled, filter will adapt to detected line noise")
