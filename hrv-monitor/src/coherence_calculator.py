"""
HeartMath Coherence Calculator
Implements the HeartMath Institute's coherence ratio algorithm
Based on research documentation from /workspace/coherence/docs/research/
"""

import numpy as np
from scipy import signal
from scipy.fft import rfft, rfftfreq
import time
from collections import deque
from typing import Dict, List, Optional


class CoherenceCalculator:
    """
    Calculates HeartMath-style coherence score from RR intervals.

    The coherence ratio quantifies the degree of physiological coherence
    by analyzing the spectral characteristics of heart rate variability.

    Formula: CR = Peak Power / (Total Power - Peak Power)

    Where:
    - Peak Power: PSD integrated over 0.030 Hz window centered on maximum peak
    - Total Power: PSD integrated over 0.04-0.26 Hz range
    - Max Peak: Found in 0.04-0.26 Hz range
    """

    def __init__(self, config: Dict):
        """
        Initialize the coherence calculator.

        Args:
            config: Configuration dictionary with coherence parameters
        """
        self.window_duration = config['coherence']['window_duration']
        self.min_beats_required = config['coherence']['min_beats_required']
        self.resample_rate = config['coherence']['resample_rate']
        self.fft_size = config['coherence']['fft_size']

        self.coherence_min_freq = config['coherence']['coherence_min_freq']
        self.coherence_max_freq = config['coherence']['coherence_max_freq']
        self.peak_window_width = config['coherence']['peak_window_width']

        self.low_threshold = config['coherence']['low_coherence_threshold']
        self.high_threshold = config['coherence']['high_coherence_threshold']

        # Data buffers - using deque for O(1) left-side operations
        # Max length prevents unbounded growth (estimate: 120 bpm * 60s window = 120 beats max)
        max_buffer_size = int(self.window_duration * 3)  # 3x window for safety margin
        self.rr_buffer: deque = deque(maxlen=max_buffer_size)
        self.timestamps: deque = deque(maxlen=max_buffer_size)

    def add_rr_interval(self, interval_ms: float) -> None:
        """
        Add a new RR interval to the buffer.

        Validates the interval before adding to prevent corrupt data
        from affecting coherence calculations.

        Args:
            interval_ms: RR interval in milliseconds from Polar H10
        """
        # Additional validation layer (defense in depth)
        if not self._is_valid_rr_interval(interval_ms):
            return

        now = time.time()
        self.rr_buffer.append(interval_ms)
        self.timestamps.append(now)

        # Remove old data outside the window - O(k) where k is old entries
        # Using deque.popleft() for efficient removal from the left side
        cutoff = now - self.window_duration
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.popleft()
            self.rr_buffer.popleft()

    def _is_valid_rr_interval(self, interval_ms: float) -> bool:
        """
        Validate RR interval value (defense in depth).

        Args:
            interval_ms: RR interval in milliseconds

        Returns:
            True if valid, False otherwise
        """
        # Type check
        if not isinstance(interval_ms, (int, float)):
            return False

        # Range check (300-2000ms = 30-200 bpm)
        if not (300 <= interval_ms <= 2000):
            return False

        # Check for special values (inf, nan)
        if not np.isfinite(interval_ms):
            return False

        return True

    def calculate_coherence(self) -> Dict:
        """
        Calculate the HeartMath coherence score.

        Returns:
            Dictionary containing:
            - status: 'valid' or 'insufficient_data'
            - coherence: Score from 0-100
            - ratio: Raw coherence ratio
            - peak_frequency: Dominant frequency in Hz
            - peak_power: Power in peak window
            - total_power: Total power in coherence range
            - beats_used: Number of beats in calculation
        """
        if len(self.rr_buffer) < self.min_beats_required:
            return {
                'status': 'insufficient_data',
                'coherence': 0,
                'ratio': 0.0,
                'peak_frequency': 0.0,
                'peak_power': 0.0,
                'total_power': 0.0,
                'beats_used': len(self.rr_buffer)
            }

        try:
            # 1. Resample to uniform 4 Hz (convert deque to list for numpy operations)
            resampled = self._resample_rr_intervals(list(self.rr_buffer), self.resample_rate)

            # 2. Detrend to remove linear drift
            detrended = signal.detrend(resampled, type='linear')

            # 3. Apply Hanning window to reduce spectral leakage
            window = np.hanning(len(detrended))
            windowed = detrended * window

            # 4. Compute FFT and Power Spectral Density
            fft_vals = rfft(windowed)
            freqs = rfftfreq(len(windowed), 1/self.resample_rate)
            psd = np.abs(fft_vals) ** 2 / len(windowed)

            # 5. Extract coherence range (0.04-0.26 Hz)
            mask = (freqs >= self.coherence_min_freq) & (freqs <= self.coherence_max_freq)
            coherence_freqs = freqs[mask]
            coherence_psd = psd[mask]

            if len(coherence_psd) == 0:
                return self._insufficient_data_response()

            # 6. Find peak frequency
            peak_idx = np.argmax(coherence_psd)
            peak_freq = coherence_freqs[peak_idx]

            # 7. Calculate peak power (±0.015 Hz window)
            peak_half_width = self.peak_window_width / 2
            peak_mask = np.abs(freqs - peak_freq) <= peak_half_width
            peak_power = np.sum(psd[peak_mask])

            # 8. Calculate total power in coherence range
            total_power = np.sum(coherence_psd)

            # 9. Coherence ratio
            if total_power <= peak_power:
                ratio = 0.0
            else:
                ratio = peak_power / (total_power - peak_power)

            # 10. Convert to 0-100 score
            score = self._ratio_to_score(ratio)

            return {
                'status': 'valid',
                'coherence': int(score),
                'ratio': float(ratio),
                'peak_frequency': float(peak_freq),
                'peak_power': float(peak_power),
                'total_power': float(total_power),
                'beats_used': len(self.rr_buffer)
            }

        except Exception as e:
            return {
                'status': f'error: {str(e)}',
                'coherence': 0,
                'ratio': 0.0,
                'peak_frequency': 0.0,
                'peak_power': 0.0,
                'total_power': 0.0,
                'beats_used': len(self.rr_buffer)
            }

    def _resample_rr_intervals(self, rr_intervals: List[float], target_rate: float) -> np.ndarray:
        """
        Resample irregularly spaced RR intervals to uniform sampling rate.

        Uses linear interpolation to create evenly-spaced samples.

        Args:
            rr_intervals: List of RR intervals in milliseconds
            target_rate: Target sampling rate in Hz

        Returns:
            Uniformly sampled RR interval series
        """
        # Create cumulative time array
        cumulative_time = np.cumsum([0] + rr_intervals[:-1])
        total_duration = cumulative_time[-1] + rr_intervals[-1]

        # Create uniform time grid
        dt = 1000 / target_rate  # ms
        uniform_times = np.arange(0, total_duration, dt)

        # Linear interpolation
        resampled = np.interp(uniform_times, cumulative_time, rr_intervals)

        return resampled

    def _ratio_to_score(self, ratio: float) -> float:
        """
        Convert coherence ratio to 0-100 score using HeartMath thresholds.

        Score ranges:
        - 0-33: Low coherence (ratio < 0.9)
        - 33-67: Medium coherence (0.9 <= ratio < 7.0)
        - 67-100: High coherence (ratio >= 7.0)

        Args:
            ratio: Coherence ratio value

        Returns:
            Score from 0 to 100
        """
        if ratio < self.low_threshold:
            # Low coherence: 0-33
            score = (ratio / self.low_threshold) * 33
        elif ratio < self.high_threshold:
            # Medium coherence: 33-67
            normalized = (ratio - self.low_threshold) / (self.high_threshold - self.low_threshold)
            score = 33 + normalized * 34
        else:
            # High coherence: 67-100
            excess = ratio - self.high_threshold
            # Cap at 100
            normalized = min(excess / 3.0, 1.0)
            score = 67 + normalized * 33

        return max(0, min(100, score))

    def _insufficient_data_response(self) -> Dict:
        """Return standard response for insufficient data."""
        return {
            'status': 'insufficient_data',
            'coherence': 0,
            'ratio': 0.0,
            'peak_frequency': 0.0,
            'peak_power': 0.0,
            'total_power': 0.0,
            'beats_used': len(self.rr_buffer)
        }

    def get_buffer_status(self) -> Dict:
        """
        Get current buffer statistics.

        Returns:
            Dictionary with buffer information
        """
        if len(self.rr_buffer) == 0:
            mean_hr = 0
            duration = 0
        else:
            mean_rr = np.mean(self.rr_buffer)
            mean_hr = 60000 / mean_rr if mean_rr > 0 else 0
            duration = self.timestamps[-1] - self.timestamps[0] if len(self.timestamps) > 1 else 0

        return {
            'beats_in_buffer': len(self.rr_buffer),
            'min_beats_required': self.min_beats_required,
            'buffer_ready': len(self.rr_buffer) >= self.min_beats_required,
            'mean_heart_rate': mean_hr,
            'buffer_duration_seconds': duration
        }

    def reset(self) -> None:
        """Clear all buffered data."""
        self.rr_buffer.clear()
        self.timestamps.clear()
