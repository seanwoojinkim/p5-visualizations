#!/usr/bin/env python3
"""
Muse 2 Connection Test Script

Tests the connection to Muse 2 headset via LSL (Lab Streaming Layer).
This script verifies:
- LSL stream discovery
- Data streaming from all 4 channels
- Sample rate accuracy
- Connection stability

Usage:
    1. Start muselsl stream in a separate terminal:
       muselsl stream

    2. Run this test:
       python tests/test_muse_connection.py

Requirements:
    - Muse 2 headset powered on and nearby
    - muselsl stream running
    - pylsl installed
"""

import time
import sys
from typing import Optional, Dict, List
import numpy as np

try:
    from pylsl import StreamInlet, resolve_byprop, TimeoutError
except ImportError:
    print("Error: pylsl not installed")
    print("Run: pip install pylsl")
    sys.exit(1)


class MuseConnectionTest:
    """Test suite for Muse 2 headset connection."""

    def __init__(self):
        self.inlet: Optional[StreamInlet] = None
        self.expected_channels = ['TP9', 'AF7', 'AF8', 'TP10']
        self.expected_sample_rate = 256  # Hz

    def print_header(self, text: str):
        """Print formatted section header."""
        print(f"\n{'='*60}")
        print(f"  {text}")
        print('='*60)

    def print_status(self, emoji: str, message: str):
        """Print status message."""
        print(f"{emoji} {message}")

    def test_stream_discovery(self, timeout: float = 10.0) -> bool:
        """
        Test 1: Discover Muse LSL stream.

        Args:
            timeout: Seconds to wait for stream

        Returns:
            True if stream found, False otherwise
        """
        self.print_header("Test 1: LSL Stream Discovery")

        print(f"Searching for EEG stream (timeout: {timeout}s)...")
        print("Make sure 'muselsl stream' is running in another terminal!\n")

        try:
            streams = resolve_byprop('type', 'EEG', timeout=timeout)

            if not streams:
                self.print_status("✗", "No EEG stream found")
                print("\nTroubleshooting:")
                print("  1. Is muselsl stream running? (muselsl stream)")
                print("  2. Is Muse 2 powered on?")
                print("  3. Is Muse 2 paired via Bluetooth?")
                print("  4. Try: muselsl list")
                return False

            self.print_status("✓", f"Found {len(streams)} EEG stream(s)")

            # Use first stream
            stream = streams[0]
            self.inlet = StreamInlet(stream)
            info = self.inlet.info()

            # Print stream details
            print(f"\nStream Information:")
            print(f"  Name:         {info.name()}")
            print(f"  Type:         {info.type()}")
            print(f"  Channels:     {info.channel_count()}")
            print(f"  Sample Rate:  {info.nominal_srate()} Hz")
            print(f"  Source ID:    {info.source_id()}")

            return True

        except Exception as e:
            self.print_status("✗", f"Error discovering stream: {e}")
            return False

    def test_channel_count(self) -> bool:
        """
        Test 2: Verify channel count.

        Returns:
            True if channel count is correct
        """
        self.print_header("Test 2: Channel Count")

        if not self.inlet:
            self.print_status("✗", "No stream connection")
            return False

        info = self.inlet.info()
        channel_count = info.channel_count()

        expected = len(self.expected_channels)

        if channel_count == expected:
            self.print_status("✓", f"Channel count correct: {channel_count}")
            return True
        else:
            self.print_status("✗", f"Expected {expected} channels, got {channel_count}")
            return False

    def test_channel_names(self) -> bool:
        """
        Test 3: Verify channel names.

        Returns:
            True if channel names match expected
        """
        self.print_header("Test 3: Channel Names")

        if not self.inlet:
            self.print_status("✗", "No stream connection")
            return False

        info = self.inlet.info()
        channels = info.desc().child("channels").first_child()

        channel_names = []
        for _ in range(info.channel_count()):
            channel_names.append(channels.child_value("label"))
            channels = channels.next_sibling()

        print(f"Detected channels: {channel_names}")
        print(f"Expected channels: {self.expected_channels}")

        # Check if all expected channels are present (order may vary)
        all_present = all(ch in channel_names for ch in self.expected_channels)

        if all_present:
            self.print_status("✓", "All expected channels present")
            return True
        else:
            missing = [ch for ch in self.expected_channels if ch not in channel_names]
            self.print_status("✗", f"Missing channels: {missing}")
            return False

    def test_data_streaming(self, duration: float = 10.0) -> bool:
        """
        Test 4: Verify data streaming and sample rate.

        Args:
            duration: Test duration in seconds

        Returns:
            True if streaming works correctly
        """
        self.print_header("Test 4: Data Streaming")

        if not self.inlet:
            self.print_status("✗", "No stream connection")
            return False

        print(f"Testing data streaming for {duration} seconds...")
        print("(This validates sample rate and connection stability)\n")

        sample_count = 0
        samples_per_channel: Dict[int, List[float]] = {i: [] for i in range(4)}
        start_time = time.time()
        last_print_time = start_time

        try:
            while time.time() - start_time < duration:
                # Pull sample with 1 second timeout
                sample, timestamp = self.inlet.pull_sample(timeout=1.0)

                if sample:
                    sample_count += 1

                    # Store samples per channel for quality analysis
                    for i, value in enumerate(sample):
                        samples_per_channel[i].append(value)

                    # Print progress every second
                    current_time = time.time()
                    if current_time - last_print_time >= 1.0:
                        elapsed = current_time - start_time
                        rate = sample_count / elapsed
                        print(f"  {elapsed:.1f}s: {sample_count} samples ({rate:.1f} Hz)")
                        last_print_time = current_time
                else:
                    self.print_status("✗", "Timeout receiving data")
                    return False

        except KeyboardInterrupt:
            print("\nTest interrupted by user")
            return False

        # Calculate statistics
        elapsed = time.time() - start_time
        actual_rate = sample_count / elapsed

        print(f"\nResults:")
        print(f"  Total samples:   {sample_count}")
        print(f"  Duration:        {elapsed:.2f}s")
        print(f"  Actual rate:     {actual_rate:.2f} Hz")
        print(f"  Expected rate:   {self.expected_sample_rate} Hz")
        print(f"  Difference:      {abs(actual_rate - self.expected_sample_rate):.2f} Hz")

        # Check if rate is within 5% of expected
        tolerance = self.expected_sample_rate * 0.05
        rate_ok = abs(actual_rate - self.expected_sample_rate) <= tolerance

        if rate_ok:
            self.print_status("✓", "Sample rate within acceptable range")
        else:
            self.print_status("✗", "Sample rate outside acceptable range")

        # Analyze sample quality
        print("\nSample Quality per Channel:")
        for i, channel in enumerate(self.expected_channels):
            if i in samples_per_channel and samples_per_channel[i]:
                data = np.array(samples_per_channel[i])
                mean = np.mean(data)
                std = np.std(data)
                min_val = np.min(data)
                max_val = np.max(data)
                print(f"  {channel:5s}: mean={mean:7.2f}, std={std:6.2f}, "
                      f"range=[{min_val:7.2f}, {max_val:7.2f}]")

        return rate_ok

    def test_connection_stability(self, duration: float = 30.0) -> bool:
        """
        Test 5: Extended connection stability test.

        Args:
            duration: Test duration in seconds

        Returns:
            True if connection remains stable
        """
        self.print_header("Test 5: Connection Stability")

        if not self.inlet:
            self.print_status("✗", "No stream connection")
            return False

        print(f"Testing connection stability for {duration} seconds...")
        print("(Checking for dropouts and disconnections)\n")

        dropout_count = 0
        max_gap_ms = 0
        sample_count = 0
        start_time = time.time()
        last_timestamp = None

        try:
            while time.time() - start_time < duration:
                sample, timestamp = self.inlet.pull_sample(timeout=1.0)

                if sample:
                    sample_count += 1

                    # Check for gaps
                    if last_timestamp is not None:
                        gap_ms = (timestamp - last_timestamp) * 1000
                        expected_gap_ms = 1000 / self.expected_sample_rate

                        # If gap is more than 2x expected, count as dropout
                        if gap_ms > expected_gap_ms * 2:
                            dropout_count += 1
                            if gap_ms > max_gap_ms:
                                max_gap_ms = gap_ms

                    last_timestamp = timestamp

                    # Print progress every 5 seconds
                    elapsed = time.time() - start_time
                    if int(elapsed) % 5 == 0 and elapsed > 0:
                        if sample_count % 256 == 0:  # Print approximately once per 5s
                            print(f"  {elapsed:.0f}s: {sample_count} samples, "
                                  f"{dropout_count} dropouts")
                else:
                    dropout_count += 1
                    print(f"  WARNING: Timeout at {time.time() - start_time:.1f}s")

        except KeyboardInterrupt:
            print("\nTest interrupted by user")
            return False

        print(f"\nStability Results:")
        print(f"  Total samples:    {sample_count}")
        print(f"  Dropouts:         {dropout_count}")
        print(f"  Max gap:          {max_gap_ms:.1f} ms")

        # Connection is stable if dropouts < 1% of expected samples
        expected_samples = duration * self.expected_sample_rate
        dropout_rate = (dropout_count / expected_samples) * 100

        print(f"  Dropout rate:     {dropout_rate:.2f}%")

        if dropout_rate < 1.0:
            self.print_status("✓", "Connection stable (dropout rate < 1%)")
            return True
        else:
            self.print_status("✗", "Connection unstable (dropout rate >= 1%)")
            return False

    def cleanup(self):
        """Clean up resources."""
        if self.inlet:
            self.inlet.close_stream()
            self.inlet = None


def main():
    """Run all Muse connection tests."""
    print("\n" + "="*60)
    print("  Muse 2 Headset Connection Test Suite")
    print("="*60)

    tester = MuseConnectionTest()

    try:
        # Run tests in sequence
        results = []

        # Test 1: Stream discovery
        result = tester.test_stream_discovery(timeout=10.0)
        results.append(("Stream Discovery", result))

        if not result:
            print("\nCannot proceed without stream connection.")
            sys.exit(1)

        # Test 2: Channel count
        result = tester.test_channel_count()
        results.append(("Channel Count", result))

        # Test 3: Channel names
        result = tester.test_channel_names()
        results.append(("Channel Names", result))

        # Test 4: Data streaming
        result = tester.test_data_streaming(duration=10.0)
        results.append(("Data Streaming", result))

        # Test 5: Connection stability (optional - takes 30s)
        print("\n" + "-"*60)
        response = input("Run extended stability test (30s)? [y/N]: ")
        if response.lower() in ['y', 'yes']:
            result = tester.test_connection_stability(duration=30.0)
            results.append(("Connection Stability", result))

        # Print summary
        print("\n" + "="*60)
        print("  Test Summary")
        print("="*60)

        all_passed = True
        for test_name, passed in results:
            status = "✓ PASS" if passed else "✗ FAIL"
            print(f"  {status:8s} - {test_name}")
            if not passed:
                all_passed = False

        print("="*60)

        if all_passed:
            print("\n✓ All tests passed! Muse 2 connection is working correctly.")
            print("\nNext steps:")
            print("  1. Test signal quality: python tests/test_signal_quality.py")
            print("  2. Read setup guide: cat docs/MUSE_SETUP.md")
            sys.exit(0)
        else:
            print("\n✗ Some tests failed. Please check the errors above.")
            print("\nTroubleshooting:")
            print("  1. Ensure Muse 2 is powered on and charged")
            print("  2. Ensure muselsl stream is running")
            print("  3. Check Bluetooth connection")
            print("  4. Try restarting muselsl stream")
            sys.exit(1)

    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(130)
    finally:
        tester.cleanup()


if __name__ == "__main__":
    main()
