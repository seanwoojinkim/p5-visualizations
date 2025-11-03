#!/usr/bin/env python3
"""
Muse 2 Signal Quality Test Script

Tests the quality of EEG signals from the Muse 2 headset.
This script checks:
- Signal amplitude ranges
- Electrode contact quality
- Noise levels
- Common artifacts (eye blinks, jaw clenches, movement)
- Frequency content

Usage:
    1. Put on Muse 2 headset (follow fitting guide)
    2. Start muselsl stream: muselsl stream
    3. Run this test: python tests/test_signal_quality.py

Requirements:
    - Muse 2 headset properly fitted
    - muselsl stream running
    - pylsl and numpy installed
"""

import time
import sys
from typing import Dict, List, Tuple
import numpy as np

try:
    from pylsl import StreamInlet, resolve_byprop
except ImportError:
    print("Error: pylsl not installed")
    print("Run: pip install pylsl")
    sys.exit(1)


class SignalQualityTest:
    """Test suite for EEG signal quality."""

    def __init__(self):
        self.inlet = None
        self.channels = ['TP9', 'AF7', 'AF8', 'TP10']
        self.sample_rate = 256

        # Quality thresholds (microvolts)
        self.amplitude_thresholds = {
            'min_good': 5,       # Minimum amplitude for good signal
            'max_good': 100,     # Maximum amplitude for good signal
            'max_acceptable': 200,  # Maximum before flagging as artifact
        }

    def print_header(self, text: str):
        """Print formatted section header."""
        print(f"\n{'='*60}")
        print(f"  {text}")
        print('='*60)

    def print_status(self, emoji: str, message: str):
        """Print status message."""
        print(f"{emoji} {message}")

    def connect_stream(self, timeout: float = 10.0) -> bool:
        """Connect to Muse LSL stream."""
        print("Connecting to Muse stream...")

        try:
            streams = resolve_byprop('type', 'EEG', timeout=timeout)

            if not streams:
                self.print_status("✗", "No EEG stream found")
                return False

            self.inlet = StreamInlet(streams[0])
            self.print_status("✓", "Connected to Muse stream")
            return True

        except Exception as e:
            self.print_status("✗", f"Connection error: {e}")
            return False

    def collect_data(self, duration: float) -> Dict[str, np.ndarray]:
        """
        Collect EEG data for specified duration.

        Args:
            duration: Collection time in seconds

        Returns:
            Dictionary mapping channel names to numpy arrays of samples
        """
        print(f"Collecting {duration} seconds of data...", end='', flush=True)

        data = {ch: [] for ch in self.channels}
        start_time = time.time()

        while time.time() - start_time < duration:
            sample, _ = self.inlet.pull_sample(timeout=1.0)
            if sample:
                for i, value in enumerate(sample):
                    data[self.channels[i]].append(value)

            # Print progress dots
            if int((time.time() - start_time) * 4) % 4 == 0:
                print('.', end='', flush=True)

        print(" Done!\n")

        # Convert to numpy arrays
        return {ch: np.array(values) for ch, values in data.items()}

    def test_amplitude_ranges(self, data: Dict[str, np.ndarray]) -> bool:
        """
        Test 1: Check signal amplitude ranges.

        Good EEG signals should be in the 5-100 µV range.
        Very low signals indicate poor contact.
        Very high signals indicate artifacts or poor grounding.

        Args:
            data: EEG data per channel

        Returns:
            True if all channels have acceptable amplitudes
        """
        self.print_header("Test 1: Signal Amplitude Analysis")

        all_good = True

        for channel, samples in data.items():
            mean = np.mean(np.abs(samples))
            std = np.std(samples)
            min_val = np.min(samples)
            max_val = np.max(samples)
            peak_to_peak = max_val - min_val

            print(f"\n{channel}:")
            print(f"  Mean amplitude:    {mean:.2f} µV")
            print(f"  Std deviation:     {std:.2f} µV")
            print(f"  Range:             [{min_val:.2f}, {max_val:.2f}] µV")
            print(f"  Peak-to-peak:      {peak_to_peak:.2f} µV")

            # Evaluate quality
            if mean < self.amplitude_thresholds['min_good']:
                self.print_status("✗", f"Low amplitude - poor electrode contact")
                print("    → Wet electrodes or adjust headband")
                all_good = False
            elif mean > self.amplitude_thresholds['max_good']:
                self.print_status("⚠", f"High amplitude - possible artifacts")
                print("    → Relax jaw, reduce movement")
            else:
                self.print_status("✓", "Amplitude in good range")

            if peak_to_peak > self.amplitude_thresholds['max_acceptable']:
                self.print_status("⚠", f"Large peak-to-peak - artifacts present")
                all_good = False

        return all_good

    def test_electrode_contact(self, data: Dict[str, np.ndarray]) -> bool:
        """
        Test 2: Evaluate electrode contact quality.

        Poor electrode contact shows as:
        - Very low signal variance
        - Flat or nearly-flat signal
        - Excessive high-frequency noise

        Args:
            data: EEG data per channel

        Returns:
            True if all electrodes have good contact
        """
        self.print_header("Test 2: Electrode Contact Quality")

        all_good = True

        for channel, samples in data.items():
            variance = np.var(samples)
            std = np.std(samples)

            # Check for flat signal (very low variance)
            if variance < 1.0:
                quality = "Poor - Possible disconnection"
                emoji = "✗"
                all_good = False
            elif variance < 10.0:
                quality = "Fair - Low signal"
                emoji = "⚠"
            elif variance > 1000.0:
                quality = "Fair - High noise"
                emoji = "⚠"
            else:
                quality = "Good"
                emoji = "✓"

            print(f"{channel}: {emoji} {quality} (variance: {variance:.2f})")

            if variance < 10.0:
                print(f"    → Improve contact: wet electrode, adjust fit")

        return all_good

    def test_artifacts(self, data: Dict[str, np.ndarray]) -> Dict[str, int]:
        """
        Test 3: Detect common EEG artifacts.

        Detects:
        - Eye blinks (large amplitude spikes in frontal channels)
        - Jaw clenches (high frequency activity)
        - Movement artifacts (sudden large changes)

        Args:
            data: EEG data per channel

        Returns:
            Dictionary with artifact counts
        """
        self.print_header("Test 3: Artifact Detection")

        artifacts = {
            'blinks': 0,
            'jaw_clenches': 0,
            'movement': 0
        }

        # Eye blink detection in frontal channels (AF7, AF8)
        frontal_channels = ['AF7', 'AF8']
        for channel in frontal_channels:
            samples = data[channel]

            # Blinks show as large positive deflections > 100 µV
            blink_threshold = 100
            blinks = np.sum(samples > blink_threshold)
            artifacts['blinks'] += blinks

        # Jaw clench detection - high variance indicates muscle artifact
        for channel, samples in data.items():
            # Compute moving variance
            window_size = 128  # 0.5 seconds at 256 Hz
            variances = []
            for i in range(0, len(samples) - window_size, window_size // 2):
                window = samples[i:i+window_size]
                variances.append(np.var(window))

            # High variance windows indicate jaw clenches or tension
            variance_threshold = 500
            jaw_clenches = sum(1 for v in variances if v > variance_threshold)
            artifacts['jaw_clenches'] += jaw_clenches

        # Movement detection - sudden large changes
        for channel, samples in data.items():
            diff = np.abs(np.diff(samples))
            movement_threshold = 50  # Large sudden changes
            movements = np.sum(diff > movement_threshold)
            artifacts['movement'] += movements

        # Normalize counts
        artifacts['blinks'] = artifacts['blinks'] // len(frontal_channels)

        print(f"\nArtifact Summary:")
        print(f"  Eye blinks detected:      {artifacts['blinks']}")
        print(f"  Jaw clench periods:       {artifacts['jaw_clenches']}")
        print(f"  Movement artifacts:       {artifacts['movement']}")

        print(f"\nRecommendations:")
        if artifacts['blinks'] > 10:
            self.print_status("⚠", "Many blinks detected - try to blink less during recording")
        else:
            self.print_status("✓", "Blink rate acceptable")

        if artifacts['jaw_clenches'] > 5:
            self.print_status("⚠", "Jaw tension detected - relax jaw and facial muscles")
        else:
            self.print_status("✓", "Minimal jaw tension")

        if artifacts['movement'] > 20:
            self.print_status("⚠", "Movement detected - stay still during recording")
        else:
            self.print_status("✓", "Minimal movement artifacts")

        return artifacts

    def test_frequency_content(self, data: Dict[str, np.ndarray]) -> bool:
        """
        Test 4: Analyze frequency content.

        Checks for:
        - Presence of alpha rhythm (8-13 Hz) - should be visible with eyes closed
        - 60 Hz line noise
        - DC offset

        Args:
            data: EEG data per channel

        Returns:
            True if frequency content looks reasonable
        """
        self.print_header("Test 4: Frequency Content Analysis")

        all_good = True

        for channel, samples in data.items():
            # Compute FFT
            fft = np.fft.fft(samples)
            freqs = np.fft.fftfreq(len(samples), 1/self.sample_rate)

            # Only look at positive frequencies
            pos_mask = freqs > 0
            freqs = freqs[pos_mask]
            power = np.abs(fft[pos_mask]) ** 2

            # Check for DC offset (0-1 Hz)
            dc_power = np.mean(power[freqs < 1])

            # Check for alpha power (8-13 Hz)
            alpha_mask = (freqs >= 8) & (freqs <= 13)
            alpha_power = np.mean(power[alpha_mask])

            # Check for 60 Hz line noise
            noise_mask = (freqs >= 58) & (freqs <= 62)
            noise_power = np.mean(power[noise_mask])

            # Check for overall power distribution
            total_power = np.sum(power)
            alpha_ratio = alpha_power / (total_power + 1e-10)
            noise_ratio = noise_power / (total_power + 1e-10)

            print(f"\n{channel}:")
            print(f"  DC offset power:   {dc_power:.2e}")
            print(f"  Alpha band power:  {alpha_power:.2e} ({alpha_ratio*100:.1f}% of total)")
            print(f"  60 Hz noise power: {noise_power:.2e} ({noise_ratio*100:.1f}% of total)")

            if noise_ratio > 0.1:
                self.print_status("⚠", "Significant 60 Hz line noise detected")
                print("    → Check grounding, move away from power sources")
            else:
                self.print_status("✓", "Low 60 Hz noise")

        return all_good

    def print_overall_quality(self, amplitude_ok: bool, contact_ok: bool,
                            artifacts: Dict[str, int]) -> str:
        """
        Print overall signal quality assessment.

        Args:
            amplitude_ok: Amplitude test result
            contact_ok: Contact test result
            artifacts: Artifact counts

        Returns:
            Overall quality rating
        """
        self.print_header("Overall Signal Quality Assessment")

        # Calculate overall score
        score = 0
        if amplitude_ok:
            score += 30
        if contact_ok:
            score += 40
        if artifacts['blinks'] < 10:
            score += 10
        if artifacts['jaw_clenches'] < 5:
            score += 10
        if artifacts['movement'] < 20:
            score += 10

        print(f"\nQuality Score: {score}/100")

        if score >= 80:
            quality = "Excellent"
            emoji = "✓"
            message = "Signal quality is excellent. Ready for neurofeedback training!"
        elif score >= 60:
            quality = "Good"
            emoji = "✓"
            message = "Signal quality is good. Minor improvements recommended."
        elif score >= 40:
            quality = "Fair"
            emoji = "⚠"
            message = "Signal quality is fair. Address issues above before training."
        else:
            quality = "Poor"
            emoji = "✗"
            message = "Signal quality is poor. Check electrode contact and fit."

        print(f"Quality Rating: {emoji} {quality}")
        print(f"\n{message}")

        return quality

    def cleanup(self):
        """Clean up resources."""
        if self.inlet:
            self.inlet.close_stream()


def main():
    """Run signal quality tests."""
    print("\n" + "="*60)
    print("  Muse 2 Signal Quality Test Suite")
    print("="*60)

    print("\nPreparation:")
    print("  1. Put on Muse 2 headset (snug but comfortable)")
    print("  2. Wet the electrode pads with water")
    print("  3. Ensure good contact on forehead and behind ears")
    print("  4. Sit still and relax")

    input("\nPress Enter when ready to start...")

    tester = SignalQualityTest()

    try:
        # Connect to stream
        if not tester.connect_stream(timeout=10.0):
            print("\nCannot connect to Muse stream.")
            print("Make sure 'muselsl stream' is running.")
            sys.exit(1)

        # Collect baseline data (10 seconds, eyes closed)
        print("\n" + "-"*60)
        print("RECORDING - Keep still with eyes CLOSED for 10 seconds")
        print("-"*60)
        time.sleep(1)  # Give user time to prepare

        data = tester.collect_data(duration=10.0)

        # Run tests
        amplitude_ok = tester.test_amplitude_ranges(data)
        contact_ok = tester.test_electrode_contact(data)
        artifacts = tester.test_artifacts(data)
        frequency_ok = tester.test_frequency_content(data)

        # Overall assessment
        quality = tester.print_overall_quality(amplitude_ok, contact_ok, artifacts)

        # Next steps
        print("\n" + "="*60)
        print("  Next Steps")
        print("="*60)

        if quality in ["Excellent", "Good"]:
            print("\n✓ Your Muse 2 setup is ready for use!")
            print("\nYou can now:")
            print("  - Run the full EEG monitor service")
            print("  - Start neurofeedback training")
            print("  - Read docs/MUSE_SETUP.md for more info")
        else:
            print("\n⚠ Please improve signal quality before training:")
            print("  - Wet electrode pads thoroughly")
            print("  - Adjust headband fit")
            print("  - Ensure good skin contact")
            print("  - Stay relaxed and still")
            print("\nRe-run this test after adjustments.")

        sys.exit(0 if quality in ["Excellent", "Good"] else 1)

    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(130)
    finally:
        tester.cleanup()


if __name__ == "__main__":
    main()
