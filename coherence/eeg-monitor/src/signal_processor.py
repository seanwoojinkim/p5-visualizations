"""
Signal Processor for EEG Data
Implements FFT-based spectral analysis with robust filtering and artifact detection
"""

import numpy as np
from scipy import signal
from scipy.signal import welch
from collections import deque
from typing import Dict, List, Optional, Tuple
import logging
import time


logger = logging.getLogger(__name__)


class SignalProcessor:
    """
    Processes raw EEG data to extract frequency band powers.

    Uses Welch's method for robust power spectral density estimation,
    applies bandpass and notch filtering, and detects common artifacts.

    The processor maintains separate buffers for each EEG channel using
    efficient deque structures for O(1) append/pop operations.

    Attributes:
        sample_rate: EEG sampling rate in Hz (typically 256 Hz for Muse 2)
        window_duration: Duration of analysis window in seconds
        window_size: Number of samples per window
        bands: Dictionary of frequency band ranges
        buffers: Per-channel data buffers (deque)

    Example:
        >>> config = {'sample_rate': 256, 'window_duration': 2.0}
        >>> processor = SignalProcessor(config)
        >>>
        >>> # Add samples from Muse 2
        >>> processor.add_samples('TP9', [12.5, 13.1, 11.8, ...])
        >>> processor.add_samples('AF7', [15.2, 14.8, 15.5, ...])
        >>>
        >>> # Calculate band powers
        >>> powers = processor.calculate_band_powers()
        >>> print(f"Alpha power: {powers['alpha']:.2f}")
    """

    def __init__(self, config: Dict):
        """
        Initialize the signal processor.

        Args:
            config: Configuration dictionary containing:
                - sample_rate: Sampling rate in Hz (default: 256)
                - window_duration: Analysis window in seconds (default: 2.0)
                - window_overlap: Overlap fraction for Welch's method (default: 0.5)
                - frequency_bands: Dict of band ranges (optional)
                - bandpass: Bandpass filter config (optional)
                - notch: Notch filter config (optional)
                - artifacts: Artifact detection config (optional)

        Raises:
            ValueError: If configuration is invalid
        """
        self._validate_config(config)

        # Basic parameters
        self.sample_rate = config.get('sample_rate', 256)
        self.window_duration = config.get('window_duration', 2.0)
        self.window_overlap = config.get('window_overlap', 0.5)
        self.window_size = int(self.sample_rate * self.window_duration)

        # Frequency bands (Hz)
        default_bands = {
            'delta': (0.5, 4),
            'theta': (4, 8),
            'alpha': (8, 13),
            'beta': (12, 30),
            'gamma': (30, 50)
        }

        freq_bands_config = config.get('frequency_bands', {})
        if freq_bands_config:
            # Convert list format [low, high] to tuple format (low, high)
            self.bands = {
                name: tuple(ranges) if isinstance(ranges, list) else ranges
                for name, ranges in freq_bands_config.items()
            }
        else:
            self.bands = default_bands

        # Channel buffers using deque for efficient operations
        # Buffer size is 3x window size to allow for overlap and artifact detection
        max_buffer_size = self.window_size * 3
        self.channel_names = ['TP9', 'AF7', 'AF8', 'TP10']
        self.buffers: Dict[str, deque] = {
            channel: deque(maxlen=max_buffer_size)
            for channel in self.channel_names
        }

        # Timestamps for each sample (for data management)
        self.buffer_timestamps: Dict[str, deque] = {
            channel: deque(maxlen=max_buffer_size)
            for channel in self.channel_names
        }

        # Filter configurations
        self.bandpass_config = config.get('bandpass', {
            'enabled': True,
            'low_cutoff': 0.5,
            'high_cutoff': 50,
            'order': 4
        })

        self.notch_config = config.get('notch', {
            'enabled': True,
            'frequency': 60,
            'quality_factor': 30
        })

        # Artifact detection configuration
        self.artifact_config = config.get('artifacts', {
            'enabled': True,
            'blink_threshold': 100,  # µV
            'jaw_threshold': 50,  # µV variance
            'movement_threshold': 150  # µV peak-to-peak
        })

        # Design filters
        self._design_filters()

        logger.info(f"SignalProcessor initialized: {self.sample_rate} Hz, "
                   f"{self.window_duration}s window, {len(self.bands)} bands")

    def _validate_config(self, config: Dict) -> None:
        """
        Validate configuration parameters.

        Args:
            config: Configuration dictionary

        Raises:
            ValueError: If configuration is invalid
        """
        if not isinstance(config, dict):
            raise ValueError("Configuration must be a dictionary")

        sample_rate = config.get('sample_rate', 256)
        if not isinstance(sample_rate, (int, float)) or sample_rate <= 0:
            raise ValueError(f"Invalid sample_rate: {sample_rate}")

        window_duration = config.get('window_duration', 2.0)
        if not isinstance(window_duration, (int, float)) or window_duration <= 0:
            raise ValueError(f"Invalid window_duration: {window_duration}")

        overlap = config.get('window_overlap', 0.5)
        if not isinstance(overlap, (int, float)) or not (0 <= overlap < 1):
            raise ValueError(f"Invalid window_overlap: {overlap} (must be 0-1)")

    def _design_filters(self) -> None:
        """
        Design bandpass and notch filters using Butterworth and IIR notch.

        Filters are designed once at initialization for efficiency.
        Uses scipy.signal filter design functions.
        """
        # Bandpass filter: 0.5-50 Hz (removes DC drift and high-frequency noise)
        if self.bandpass_config.get('enabled', True):
            low = self.bandpass_config['low_cutoff']
            high = self.bandpass_config['high_cutoff']
            order = self.bandpass_config['order']

            # Butterworth filter for flat passband
            self.bandpass_sos = signal.butter(
                order,
                [low, high],
                btype='bandpass',
                fs=self.sample_rate,
                output='sos'  # Second-order sections for numerical stability
            )
            logger.debug(f"Designed bandpass filter: {low}-{high} Hz, order {order}")
        else:
            self.bandpass_sos = None

        # Notch filter: 60 Hz line noise (50 Hz for Europe)
        if self.notch_config.get('enabled', True):
            freq = self.notch_config['frequency']
            Q = self.notch_config['quality_factor']

            # IIR notch filter
            self.notch_sos = signal.iirnotch(
                freq,
                Q,
                fs=self.sample_rate
            )
            # Convert to second-order sections for consistency
            self.notch_sos = signal.tf2sos(*self.notch_sos)
            logger.debug(f"Designed notch filter: {freq} Hz, Q={Q}")
        else:
            self.notch_sos = None

    def add_samples(self, channel: str, samples: List[float]) -> None:
        """
        Add new EEG samples to a channel's buffer.

        Validates channel name and sample values before adding.
        Maintains timestamps for each sample for potential future use.

        Args:
            channel: Channel name ('TP9', 'AF7', 'AF8', 'TP10')
            samples: List of EEG voltage samples (typically in µV)

        Raises:
            ValueError: If channel name is invalid or samples are malformed

        Example:
            >>> processor.add_samples('TP9', [12.5, 13.1, 11.8])
            >>> processor.add_samples('AF7', [15.2, 14.8, 15.5])
        """
        # Validate channel
        if channel not in self.channel_names:
            raise ValueError(f"Invalid channel: {channel}. Must be one of {self.channel_names}")

        # Validate samples
        if not isinstance(samples, (list, np.ndarray)):
            raise ValueError("Samples must be a list or numpy array")

        if len(samples) == 0:
            return  # Nothing to add

        # Convert to numpy array for validation
        samples_array = np.array(samples)

        # Check for invalid values (inf, nan)
        if not np.all(np.isfinite(samples_array)):
            logger.warning(f"Channel {channel}: Dropping {np.sum(~np.isfinite(samples_array))} "
                          f"invalid samples (inf/nan)")
            samples_array = samples_array[np.isfinite(samples_array)]

        # Add to buffer
        now = time.time()
        for sample in samples_array:
            self.buffers[channel].append(float(sample))
            self.buffer_timestamps[channel].append(now)

    def calculate_band_powers(self) -> Optional[Dict]:
        """
        Calculate power in each frequency band for all channels.

        Uses Welch's method for robust power spectral density estimation.
        Applies filtering before PSD calculation for noise reduction.

        The algorithm:
        1. Check for sufficient data (full window required)
        2. Extract latest window from each channel
        3. Apply bandpass and notch filters
        4. Calculate PSD using Welch's method
        5. Integrate power in each frequency band
        6. Average across channels
        7. Detect artifacts

        Returns:
            Dictionary containing:
                {
                    'delta': float,  # Average power across channels (µV²)
                    'theta': float,
                    'alpha': float,
                    'beta': float,
                    'gamma': float,
                    'channels': {    # Per-channel band powers
                        'TP9': {'delta': float, 'theta': float, ...},
                        'AF7': {'delta': float, 'theta': float, ...},
                        'AF8': {'delta': float, 'theta': float, ...},
                        'TP10': {'delta': float, 'theta': float, ...}
                    },
                    'artifacts': {   # Artifact detection results
                        'eye_blink': bool,
                        'jaw_clench': bool,
                        'movement': bool,
                        'signal_quality': str  # 'good', 'fair', 'poor'
                    },
                    'timestamp': float  # Unix timestamp
                }

            Returns None if insufficient data available.

        Example:
            >>> powers = processor.calculate_band_powers()
            >>> if powers:
            >>>     print(f"Alpha: {powers['alpha']:.2f} µV²")
            >>>     print(f"Quality: {powers['artifacts']['signal_quality']}")
        """
        # Check if we have enough data in all channels
        for channel in self.channel_names:
            if len(self.buffers[channel]) < self.window_size:
                logger.debug(f"Insufficient data: {channel} has {len(self.buffers[channel])} "
                           f"samples, need {self.window_size}")
                return None

        try:
            channel_results = {}
            all_channel_data = {}

            # Process each channel
            for channel in self.channel_names:
                # Extract latest window
                data = np.array(list(self.buffers[channel])[-self.window_size:])
                all_channel_data[channel] = data

                # Apply filters
                filtered_data = self._apply_filters(data)

                # Calculate PSD using Welch's method
                band_powers = self._calculate_psd_bands(filtered_data)

                channel_results[channel] = band_powers

            # Average across channels
            averaged_powers = {}
            for band_name in self.bands.keys():
                avg_power = np.mean([
                    channel_results[ch][band_name]
                    for ch in self.channel_names
                ])
                averaged_powers[band_name] = float(avg_power)

            # Detect artifacts (use raw data, not filtered)
            artifacts = self.detect_artifacts(all_channel_data)

            # Compile results
            result = {
                **averaged_powers,
                'channels': channel_results,
                'artifacts': artifacts,
                'timestamp': time.time()
            }

            return result

        except Exception as e:
            logger.error(f"Error calculating band powers: {e}", exc_info=True)
            return None

    def _apply_filters(self, data: np.ndarray) -> np.ndarray:
        """
        Apply bandpass and notch filters to EEG data.

        Uses filtfilt for zero-phase filtering (no time delay).
        Second-order sections (SOS) format for numerical stability.

        Args:
            data: Raw EEG data array

        Returns:
            Filtered EEG data
        """
        filtered = data.copy()

        # Apply bandpass filter
        if self.bandpass_sos is not None:
            filtered = signal.sosfiltfilt(self.bandpass_sos, filtered)

        # Apply notch filter
        if self.notch_sos is not None:
            filtered = signal.sosfiltfilt(self.notch_sos, filtered)

        return filtered

    def _calculate_psd_bands(self, data: np.ndarray) -> Dict[str, float]:
        """
        Calculate power spectral density and integrate over frequency bands.

        Uses Welch's method for robust PSD estimation with overlapping windows.
        Integrates power using trapezoidal rule for accuracy.

        Args:
            data: Filtered EEG data

        Returns:
            Dictionary mapping band names to power values (µV²)
        """
        # Calculate PSD using Welch's method
        nperseg = min(self.window_size, 256)  # Segment length for Welch
        noverlap = int(nperseg * self.window_overlap)

        freqs, psd = welch(
            data,
            fs=self.sample_rate,
            nperseg=nperseg,
            noverlap=noverlap,
            window='hann',  # Hann window reduces spectral leakage
            scaling='density'  # Power spectral density (µV²/Hz)
        )

        # Calculate power in each band by integrating PSD
        band_powers = {}
        for band_name, (low_freq, high_freq) in self.bands.items():
            # Find frequency indices within band
            idx = np.logical_and(freqs >= low_freq, freqs <= high_freq)

            if np.sum(idx) == 0:
                band_powers[band_name] = 0.0
                continue

            # Integrate power using trapezoidal rule
            band_power = np.trapz(psd[idx], freqs[idx])
            band_powers[band_name] = float(band_power)

        return band_powers

    def detect_artifacts(self, channel_data: Dict[str, np.ndarray]) -> Dict:
        """
        Detect common EEG artifacts.

        Artifacts detected:
        - Eye blinks: High amplitude in frontal channels (AF7, AF8)
        - Jaw clench: High variance indicating muscle activity
        - Movement: Sudden large amplitude changes across channels
        - Signal quality: Overall assessment based on noise characteristics

        Args:
            channel_data: Dictionary mapping channel names to raw data arrays

        Returns:
            Dictionary containing:
                {
                    'eye_blink': bool,       # True if eye blink detected
                    'jaw_clench': bool,      # True if jaw clench detected
                    'movement': bool,        # True if movement detected
                    'signal_quality': str,   # 'good', 'fair', 'poor'
                    'details': {             # Additional diagnostic info
                        'max_amplitude': float,
                        'mean_variance': float,
                        'peak_to_peak': float
                    }
                }

        Example:
            >>> artifacts = processor.detect_artifacts(channel_data)
            >>> if artifacts['eye_blink']:
            >>>     print("Eye blink detected - results may be unreliable")
        """
        if not self.artifact_config.get('enabled', True):
            return {
                'eye_blink': False,
                'jaw_clench': False,
                'movement': False,
                'signal_quality': 'unknown',
                'details': {}
            }

        try:
            # Get thresholds
            blink_threshold = self.artifact_config.get('blink_threshold', 100)
            jaw_threshold = self.artifact_config.get('jaw_threshold', 50)
            movement_threshold = self.artifact_config.get('movement_threshold', 150)

            # Eye blink detection: Check frontal channels for high amplitude
            frontal_channels = ['AF7', 'AF8']
            max_frontal = max(
                np.max(np.abs(channel_data[ch]))
                for ch in frontal_channels
                if ch in channel_data
            )
            eye_blink = max_frontal > blink_threshold

            # Jaw clench detection: High variance indicates muscle activity
            variances = [np.var(data) for data in channel_data.values()]
            mean_variance = np.mean(variances)
            jaw_clench = mean_variance > jaw_threshold

            # Movement detection: Large peak-to-peak across all channels
            peak_to_peaks = [
                np.max(data) - np.min(data)
                for data in channel_data.values()
            ]
            max_peak_to_peak = np.max(peak_to_peaks)
            movement = max_peak_to_peak > movement_threshold

            # Signal quality assessment
            if movement or eye_blink:
                quality = 'poor'
            elif jaw_clench or max_frontal > blink_threshold * 0.7:
                quality = 'fair'
            else:
                quality = 'good'

            return {
                'eye_blink': bool(eye_blink),
                'jaw_clench': bool(jaw_clench),
                'movement': bool(movement),
                'signal_quality': quality,
                'details': {
                    'max_amplitude': float(max_frontal),
                    'mean_variance': float(mean_variance),
                    'peak_to_peak': float(max_peak_to_peak)
                }
            }

        except Exception as e:
            logger.error(f"Error detecting artifacts: {e}", exc_info=True)
            return {
                'eye_blink': False,
                'jaw_clench': False,
                'movement': False,
                'signal_quality': 'unknown',
                'details': {'error': str(e)}
            }

    def get_buffer_status(self) -> Dict:
        """
        Get current buffer status for all channels.

        Useful for monitoring data acquisition and debugging.

        Returns:
            Dictionary with buffer statistics:
                {
                    'ready': bool,          # True if all buffers have enough data
                    'window_size': int,     # Required window size
                    'channels': {
                        'TP9': {
                            'samples': int,     # Current number of samples
                            'ready': bool,      # Channel has enough data
                            'fill_percent': float  # Percentage of window filled
                        },
                        ...
                    }
                }
        """
        channel_status = {}
        all_ready = True

        for channel in self.channel_names:
            count = len(self.buffers[channel])
            ready = count >= self.window_size
            fill_percent = (count / self.window_size) * 100 if self.window_size > 0 else 0

            channel_status[channel] = {
                'samples': count,
                'ready': ready,
                'fill_percent': round(fill_percent, 1)
            }

            if not ready:
                all_ready = False

        return {
            'ready': all_ready,
            'window_size': self.window_size,
            'channels': channel_status
        }

    def reset(self) -> None:
        """
        Clear all buffered data from all channels.

        Useful for starting a new recording session or after detecting
        significant artifacts.
        """
        for channel in self.channel_names:
            self.buffers[channel].clear()
            self.buffer_timestamps[channel].clear()

        logger.info("SignalProcessor buffers reset")

    def get_latest_window(self, channel: str) -> Optional[np.ndarray]:
        """
        Get the latest analysis window for a specific channel.

        Args:
            channel: Channel name

        Returns:
            Numpy array of latest window_size samples, or None if insufficient data

        Raises:
            ValueError: If channel name is invalid
        """
        if channel not in self.channel_names:
            raise ValueError(f"Invalid channel: {channel}")

        if len(self.buffers[channel]) < self.window_size:
            return None

        return np.array(list(self.buffers[channel])[-self.window_size:])
