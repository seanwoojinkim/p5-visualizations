"""
Signal Quality Assessor for EEG Data

Comprehensive quality assessment system that evaluates EEG signals across multiple dimensions:
- Signal-to-Noise Ratio (SNR)
- Electrode impedance estimation
- Spectral purity
- Temporal stability
- Composite quality scoring (0-100)

Provides real-time feedback on signal quality to guide users in:
- Electrode placement and contact
- Artifact minimization
- Session readiness assessment
"""

import numpy as np
from scipy import signal as sp_signal
from scipy.stats import variation
from typing import Dict, List, Optional, Tuple
import logging
from collections import deque


logger = logging.getLogger(__name__)


class SignalQualityAssessor:
    """
    Assesses EEG signal quality across multiple dimensions.

    Provides quantitative metrics for:
    - Overall signal quality (0-100 score)
    - Per-channel quality assessment
    - Quality level classification (excellent/good/fair/poor)
    - Real-time quality tracking over time

    Uses research-validated metrics:
    - SNR: Ratio of physiological signal to noise
    - Impedance: Estimated from signal amplitude characteristics
    - Spectral purity: Cleanliness of frequency content
    - Temporal stability: Consistency over time windows

    Attributes:
        sample_rate: Sampling rate in Hz
        history: Rolling history of band powers for stability analysis
        history_size: Maximum history window size
        snr_weight: Weight for SNR in composite score (0-1)
        impedance_weight: Weight for impedance in composite score
        purity_weight: Weight for spectral purity
        stability_weight: Weight for temporal stability

    Example:
        >>> config = {'sample_rate': 256}
        >>> assessor = SignalQualityAssessor(config)
        >>>
        >>> # Assess quality
        >>> quality = assessor.assess_quality(raw_data, band_powers, artifacts)
        >>>
        >>> print(f"Overall quality: {quality['overall_score']:.1f}/100")
        >>> print(f"Quality level: {quality['quality_level']}")
        >>> if quality['quality_level'] == 'poor':
        ...     print("Check electrode contact!")
    """

    def __init__(self, config: Dict):
        """
        Initialize signal quality assessor.

        Args:
            config: Configuration dictionary containing:
                - sample_rate: Sampling rate in Hz (default: 256)
                - history_size: Number of measurements to track (default: 60)
                - snr_weight: Weight for SNR (default: 0.3)
                - impedance_weight: Weight for impedance (default: 0.3)
                - purity_weight: Weight for spectral purity (default: 0.2)
                - stability_weight: Weight for temporal stability (default: 0.2)
                - min_amplitude: Minimum expected amplitude µV (default: 5.0)
                - max_amplitude: Maximum expected amplitude µV (default: 100.0)
        """
        self.sample_rate = config.get('sample_rate', 256)
        self.history_size = config.get('history_size', 60)  # ~1 minute at 1 Hz updates

        # Scoring weights (must sum to 1.0)
        self.snr_weight = config.get('snr_weight', 0.3)
        self.impedance_weight = config.get('impedance_weight', 0.3)
        self.purity_weight = config.get('purity_weight', 0.2)
        self.stability_weight = config.get('stability_weight', 0.2)

        # Validate weights
        total_weight = self.snr_weight + self.impedance_weight + self.purity_weight + self.stability_weight
        if not np.isclose(total_weight, 1.0):
            logger.warning(f"Weights sum to {total_weight:.2f}, normalizing to 1.0")
            norm = 1.0 / total_weight
            self.snr_weight *= norm
            self.impedance_weight *= norm
            self.purity_weight *= norm
            self.stability_weight *= norm

        # Amplitude thresholds for impedance estimation
        self.min_amplitude = config.get('min_amplitude', 5.0)
        self.max_amplitude = config.get('max_amplitude', 100.0)

        # History tracking for temporal stability
        self.history: Dict[str, deque] = {
            'alpha': deque(maxlen=self.history_size),
            'beta': deque(maxlen=self.history_size),
            'theta': deque(maxlen=self.history_size),
            'delta': deque(maxlen=self.history_size),
            'gamma': deque(maxlen=self.history_size)
        }

        # Per-channel history for channel-specific quality
        self.channel_history: Dict[str, Dict[str, deque]] = {
            'TP9': {band: deque(maxlen=self.history_size) for band in ['alpha', 'beta', 'theta']},
            'AF7': {band: deque(maxlen=self.history_size) for band in ['alpha', 'beta', 'theta']},
            'AF8': {band: deque(maxlen=self.history_size) for band in ['alpha', 'beta', 'theta']},
            'TP10': {band: deque(maxlen=self.history_size) for band in ['alpha', 'beta', 'theta']}
        }

        logger.info(f"SignalQualityAssessor initialized: "
                   f"SNR={self.snr_weight:.2f}, "
                   f"Impedance={self.impedance_weight:.2f}, "
                   f"Purity={self.purity_weight:.2f}, "
                   f"Stability={self.stability_weight:.2f}")

    def assess_quality(
        self,
        data: Dict[str, np.ndarray],
        band_powers: Dict,
        artifacts: Dict
    ) -> Dict:
        """
        Assess signal quality across multiple dimensions.

        Combines multiple quality metrics into comprehensive assessment:
        1. SNR - Signal to noise ratio
        2. Impedance - Estimated electrode contact quality
        3. Spectral purity - Cleanliness of frequency content
        4. Temporal stability - Consistency over time
        5. Artifact impact - Degradation from artifacts

        Args:
            data: Raw channel data dictionary {channel: samples}
            band_powers: Frequency band powers from SignalProcessor
            artifacts: Artifact detection results from ArtifactRejector

        Returns:
            Quality metrics dictionary:
            {
                'snr': float (0-100),              # Signal-to-noise ratio score
                'impedance': dict[channel: float], # Per-channel impedance scores
                'spectral_purity': float (0-100),  # Frequency domain cleanliness
                'temporal_stability': float (0-100), # Consistency over time
                'overall_score': float (0-100),    # Weighted composite score
                'per_channel_scores': dict,        # Individual channel quality
                'quality_level': str,              # 'excellent', 'good', 'fair', 'poor'
                'recommendations': List[str]       # User-facing improvement suggestions
            }

        Example:
            >>> quality = assessor.assess_quality(raw_data, band_powers, artifacts)
            >>> if quality['overall_score'] < 50:
            ...     for rec in quality['recommendations']:
            ...         print(rec)
        """
        quality = {}

        try:
            # 1. Calculate SNR
            quality['snr'] = self._calculate_snr(band_powers, artifacts)

            # 2. Estimate impedance (per-channel)
            quality['impedance'] = self._estimate_impedance(data)

            # 3. Spectral purity
            quality['spectral_purity'] = self._calculate_spectral_purity(band_powers)

            # 4. Temporal stability
            quality['temporal_stability'] = self._calculate_temporal_stability(band_powers)

            # 5. Per-channel scores
            quality['per_channel_scores'] = self._calculate_per_channel_scores(data, band_powers)

            # 6. Artifact penalty
            artifact_ratio = artifacts.get('artifact_ratio', 0.0)
            artifact_penalty = artifact_ratio * 100  # Convert to 0-100 scale

            # 7. Calculate composite score
            quality['overall_score'] = self._calculate_composite_score(
                quality['snr'],
                quality['impedance'],
                quality['spectral_purity'],
                quality['temporal_stability'],
                artifact_penalty
            )

            # 8. Classify quality level
            quality['quality_level'] = self._classify_quality_level(quality['overall_score'])

            # 9. Generate recommendations
            quality['recommendations'] = self._generate_recommendations(quality, artifacts)

            # Update history for stability tracking
            self._update_history(band_powers)

            logger.debug(f"Quality assessed: score={quality['overall_score']:.1f}, "
                        f"level={quality['quality_level']}, "
                        f"snr={quality['snr']:.1f}, "
                        f"purity={quality['spectral_purity']:.1f}, "
                        f"stability={quality['temporal_stability']:.1f}")

            return quality

        except Exception as e:
            logger.error(f"Error assessing quality: {e}", exc_info=True)
            # Return safe default
            return {
                'snr': 0.0,
                'impedance': {},
                'spectral_purity': 0.0,
                'temporal_stability': 0.0,
                'overall_score': 0.0,
                'per_channel_scores': {},
                'quality_level': 'unknown',
                'recommendations': ['Error assessing quality'],
                'error': str(e)
            }

    def _calculate_snr(self, band_powers: Dict, artifacts: Dict) -> float:
        """
        Calculate signal-to-noise ratio.

        Physiological signal = Alpha + Theta + Beta (primary EEG bands)
        Noise = Gamma (high frequency) + Artifact power

        Args:
            band_powers: Band power dictionary
            artifacts: Artifact detection results

        Returns:
            SNR score (0-100), higher is better
        """
        # Signal power (physiologically relevant bands)
        signal_power = (
            band_powers.get('alpha', 0) +
            band_powers.get('theta', 0) +
            band_powers.get('beta', 0)
        )

        # Noise power (high frequency + artifacts)
        noise_power = band_powers.get('gamma', 0)

        # Add artifact contribution to noise
        artifact_ratio = artifacts.get('artifact_ratio', 0.0)
        # Scale artifact ratio by signal power to get artifact power estimate
        artifact_power = artifact_ratio * signal_power

        total_noise = noise_power + artifact_power

        # Calculate SNR in dB
        if total_noise > 0 and signal_power > 0:
            snr_db = 10 * np.log10(signal_power / total_noise)
            # Convert to 0-100 scale
            # Typical good EEG SNR: 10-20 dB
            # Map 0 dB -> 0, 20 dB -> 100
            snr_score = np.clip(snr_db * 5, 0, 100)
        else:
            snr_score = 0.0

        return float(snr_score)

    def _estimate_impedance(self, data: Dict[str, np.ndarray]) -> Dict[str, float]:
        """
        Estimate electrode impedance from signal characteristics.

        High impedance (poor contact) characteristics:
        - Low signal amplitude (weak coupling)
        - High variance (unstable contact)
        - Unusual frequency content

        Low impedance (good contact) characteristics:
        - Normal amplitude range (5-100 µV)
        - Stable signal
        - Clean frequency spectrum

        Args:
            data: Raw channel data

        Returns:
            Dictionary mapping channel names to impedance scores (0-100)
            Lower scores indicate better contact (lower impedance)
        """
        impedance = {}

        for channel, samples in data.items():
            if len(samples) == 0:
                impedance[channel] = 100.0  # Worst score
                continue

            samples_array = np.asarray(samples)

            # Calculate amplitude statistics
            amplitude_std = np.std(samples_array)
            amplitude_mean = np.abs(np.mean(samples_array))

            # Good contact: amplitude in normal range
            # Poor contact: very low or very high amplitude
            if self.min_amplitude <= amplitude_std <= self.max_amplitude:
                # Normal range - good contact
                amplitude_score = 0.0
            elif amplitude_std < self.min_amplitude:
                # Too low - poor contact
                amplitude_score = 50.0 * (1.0 - amplitude_std / self.min_amplitude)
            else:
                # Too high - poor contact or saturation
                amplitude_score = min(100.0, 50.0 + (amplitude_std - self.max_amplitude) / 2.0)

            # Check for DC offset (indicator of poor contact)
            dc_offset_score = min(50.0, amplitude_mean * 2.0)

            # Calculate coefficient of variation (normalized variability)
            if amplitude_mean > 0:
                cv = amplitude_std / amplitude_mean
                # Moderate CV is expected, extreme values indicate problems
                if 0.5 <= cv <= 2.0:
                    cv_score = 0.0
                elif cv < 0.5:
                    cv_score = 25.0 * (1.0 - cv / 0.5)
                else:
                    cv_score = min(50.0, 25.0 * (cv - 2.0))
            else:
                cv_score = 50.0

            # Composite impedance score (lower is better)
            channel_impedance = np.mean([amplitude_score, dc_offset_score, cv_score])
            impedance[channel] = float(np.clip(channel_impedance, 0, 100))

        return impedance

    def _calculate_spectral_purity(self, band_powers: Dict) -> float:
        """
        Calculate spectral purity (cleanliness of frequency content).

        Good purity characteristics:
        - Strong physiological bands (alpha, theta, beta)
        - Low high-frequency noise (gamma)
        - Balanced distribution across bands

        Args:
            band_powers: Band power dictionary

        Returns:
            Purity score (0-100), higher is better
        """
        # Extract band powers
        delta = band_powers.get('delta', 0)
        theta = band_powers.get('theta', 0)
        alpha = band_powers.get('alpha', 0)
        beta = band_powers.get('beta', 0)
        gamma = band_powers.get('gamma', 0)

        total_power = delta + theta + alpha + beta + gamma

        if total_power == 0:
            return 0.0

        # Calculate ratios
        physiological_power = theta + alpha + beta  # Primary neurofeedback bands
        noise_power = gamma  # High frequency noise

        # Purity = ratio of signal to total
        purity_ratio = physiological_power / total_power

        # Penalize if gamma is too high relative to physiological bands
        if physiological_power > 0:
            noise_ratio = noise_power / physiological_power
            noise_penalty = min(50.0, noise_ratio * 100)
        else:
            noise_penalty = 50.0

        # Convert to 0-100 score
        purity_score = (purity_ratio * 100) - noise_penalty
        purity_score = np.clip(purity_score, 0, 100)

        return float(purity_score)

    def _calculate_temporal_stability(self, band_powers: Dict) -> float:
        """
        Calculate temporal stability (consistency over time).

        Good stability:
        - Band powers remain relatively consistent
        - No sudden large changes (except during state transitions)
        - Smooth trajectories

        Uses coefficient of variation over history window.

        Args:
            band_powers: Current band power measurement

        Returns:
            Stability score (0-100), higher is better
        """
        # Need sufficient history
        if len(self.history['alpha']) < 10:
            return 50.0  # Neutral score during warmup

        # Calculate coefficient of variation for each band
        cvs = []
        for band in ['alpha', 'beta', 'theta']:
            history = list(self.history[band])
            if len(history) >= 10:
                cv = variation(history)  # Coefficient of variation
                cvs.append(cv)

        if not cvs:
            return 50.0

        # Average CV
        mean_cv = np.mean(cvs)

        # Good EEG has CV around 0.2-0.5 (some variation but not wild)
        # Lower CV = more stable = higher score
        if mean_cv < 0.2:
            # Very stable - might be too flat (artifact or system issue)
            stability_score = 70.0
        elif mean_cv < 0.5:
            # Good stability
            stability_score = 100.0 - (mean_cv * 60)
        else:
            # High variability - unstable
            stability_score = max(0, 70.0 - (mean_cv - 0.5) * 100)

        return float(np.clip(stability_score, 0, 100))

    def _calculate_per_channel_scores(
        self,
        data: Dict[str, np.ndarray],
        band_powers: Dict
    ) -> Dict[str, float]:
        """
        Calculate quality score for each channel individually.

        Args:
            data: Raw channel data
            band_powers: Band powers (includes per-channel breakdown)

        Returns:
            Dictionary mapping channel names to quality scores (0-100)
        """
        channel_scores = {}

        channel_powers = band_powers.get('channels', {})

        for channel in ['TP9', 'AF7', 'AF8', 'TP10']:
            if channel not in data or channel not in channel_powers:
                channel_scores[channel] = 0.0
                continue

            # Get channel-specific data
            channel_data = np.asarray(data[channel])
            channel_bands = channel_powers[channel]

            # Simple score based on amplitude and power distribution
            amplitude_std = np.std(channel_data)

            # Check if amplitude is in normal range
            if self.min_amplitude <= amplitude_std <= self.max_amplitude:
                amplitude_score = 100.0
            elif amplitude_std < self.min_amplitude:
                amplitude_score = (amplitude_std / self.min_amplitude) * 100
            else:
                amplitude_score = max(0, 100 - (amplitude_std - self.max_amplitude) / 2)

            # Check power distribution
            alpha = channel_bands.get('alpha', 0)
            beta = channel_bands.get('beta', 0)
            theta = channel_bands.get('theta', 0)
            gamma = channel_bands.get('gamma', 0)

            total = alpha + beta + theta + gamma
            if total > 0:
                signal_ratio = (alpha + beta + theta) / total
                power_score = signal_ratio * 100
            else:
                power_score = 0.0

            # Composite channel score
            channel_score = (amplitude_score * 0.6 + power_score * 0.4)
            channel_scores[channel] = float(np.clip(channel_score, 0, 100))

        return channel_scores

    def _calculate_composite_score(
        self,
        snr: float,
        impedance: Dict[str, float],
        purity: float,
        stability: float,
        artifact_penalty: float
    ) -> float:
        """
        Calculate overall composite quality score.

        Combines weighted metrics and applies artifact penalty.

        Args:
            snr: SNR score (0-100)
            impedance: Per-channel impedance scores
            purity: Spectral purity score (0-100)
            stability: Temporal stability score (0-100)
            artifact_penalty: Penalty from artifacts (0-100)

        Returns:
            Composite score (0-100)
        """
        # Average impedance score (lower impedance = higher quality)
        # Invert so higher score = better
        if impedance:
            avg_impedance = np.mean(list(impedance.values()))
            impedance_score = 100 - avg_impedance
        else:
            impedance_score = 0.0

        # Weighted average
        composite = (
            snr * self.snr_weight +
            impedance_score * self.impedance_weight +
            purity * self.purity_weight +
            stability * self.stability_weight
        )

        # Apply artifact penalty
        composite = max(0, composite - artifact_penalty)

        return float(np.clip(composite, 0, 100))

    def _classify_quality_level(self, score: float) -> str:
        """
        Classify quality score into category.

        Args:
            score: Overall quality score (0-100)

        Returns:
            Quality level: 'excellent', 'good', 'fair', 'poor', or 'unknown'
        """
        if score >= 80:
            return 'excellent'
        elif score >= 60:
            return 'good'
        elif score >= 40:
            return 'fair'
        elif score > 0:
            return 'poor'
        else:
            return 'unknown'

    def _generate_recommendations(self, quality: Dict, artifacts: Dict) -> List[str]:
        """
        Generate user-facing recommendations to improve quality.

        Args:
            quality: Quality assessment results
            artifacts: Artifact detection results

        Returns:
            List of recommendation strings
        """
        recommendations = []

        # Check impedance
        impedance = quality.get('impedance', {})
        if impedance:
            high_impedance_channels = [
                ch for ch, imp in impedance.items() if imp > 50
            ]
            if high_impedance_channels:
                recommendations.append(
                    f"Poor contact on channels: {', '.join(high_impedance_channels)}. "
                    "Wet electrodes and adjust headband fit."
                )

        # Check artifacts
        if artifacts.get('blinks', 0) > 0:
            recommendations.append("Minimize eye blinks. Try keeping eyes closed.")

        if artifacts.get('jaw_clenches', 0) > 0:
            recommendations.append("Relax jaw muscles. Unclench teeth.")

        if artifacts.get('head_movements', 0) > 0:
            recommendations.append("Minimize head movement. Keep head still.")

        # Check SNR
        if quality.get('snr', 0) < 30:
            recommendations.append("Low signal-to-noise ratio. Check for electrical interference.")

        # Check stability
        if quality.get('temporal_stability', 0) < 40:
            recommendations.append("Signal is unstable. Ensure headband is secure and electrode contact is consistent.")

        # Overall quality
        if quality.get('overall_score', 0) < 40:
            recommendations.append("Overall signal quality is poor. Consider reseating the headband.")

        if not recommendations:
            recommendations.append("Signal quality is good!")

        return recommendations

    def _update_history(self, band_powers: Dict) -> None:
        """
        Update history for temporal stability tracking.

        Args:
            band_powers: Current band power measurement
        """
        # Update global history
        for band in ['alpha', 'beta', 'theta', 'delta', 'gamma']:
            power = band_powers.get(band, 0)
            if power > 0:  # Only add non-zero values
                self.history[band].append(power)

        # Update per-channel history
        channel_powers = band_powers.get('channels', {})
        for channel in ['TP9', 'AF7', 'AF8', 'TP10']:
            if channel in channel_powers:
                for band in ['alpha', 'beta', 'theta']:
                    power = channel_powers[channel].get(band, 0)
                    if power > 0:
                        self.channel_history[channel][band].append(power)

    def reset(self) -> None:
        """
        Reset quality assessor state.

        Clears all history but preserves configuration.
        """
        for band in self.history.keys():
            self.history[band].clear()

        for channel in self.channel_history.keys():
            for band in self.channel_history[channel].keys():
                self.channel_history[channel][band].clear()

        logger.info("SignalQualityAssessor state reset")

    def get_status(self) -> Dict:
        """
        Get current assessor status.

        Returns:
            Status dictionary with history statistics
        """
        return {
            'history_size': self.history_size,
            'history_filled': {
                band: len(history) for band, history in self.history.items()
            },
            'weights': {
                'snr': self.snr_weight,
                'impedance': self.impedance_weight,
                'purity': self.purity_weight,
                'stability': self.stability_weight
            }
        }
