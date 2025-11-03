#!/usr/bin/env python3
"""
Quick Validation Test for SignalProcessor
Run this to verify SignalProcessor is working correctly
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

try:
    import numpy as np
    from signal_processor import SignalProcessor
    print("✓ Imports successful\n")
except ImportError as e:
    print(f"✗ Import failed: {e}")
    print("\nPlease install dependencies:")
    print("  pip install numpy scipy")
    sys.exit(1)


def generate_sine_wave(frequency, duration, sample_rate, amplitude):
    """Generate a synthetic sine wave."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return amplitude * np.sin(2 * np.pi * frequency * t)


def test_initialization():
    """Test 1: Basic initialization"""
    print("Test 1: Initialization")
    print("-" * 50)

    config = {'sample_rate': 256, 'window_duration': 2.0}
    processor = SignalProcessor(config)

    assert processor.sample_rate == 256
    assert processor.window_duration == 2.0
    assert processor.window_size == 512

    print(f"  Sample rate: {processor.sample_rate} Hz")
    print(f"  Window duration: {processor.window_duration}s")
    print(f"  Window size: {processor.window_size} samples")
    print(f"  Channels: {', '.join(processor.channel_names)}")
    print("  ✓ PASSED\n")


def test_add_samples():
    """Test 2: Adding samples"""
    print("Test 2: Adding Samples")
    print("-" * 50)

    processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

    samples = [1.0, 2.0, 3.0, 4.0, 5.0]
    processor.add_samples('TP9', samples)

    assert len(processor.buffers['TP9']) == 5

    print(f"  Added {len(samples)} samples to TP9")
    print(f"  Buffer size: {len(processor.buffers['TP9'])}")
    print("  ✓ PASSED\n")


def test_alpha_detection():
    """Test 3: Alpha wave detection"""
    print("Test 3: Alpha Wave Detection (10 Hz)")
    print("-" * 50)

    processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

    # Generate 10 Hz sine wave (alpha band: 8-13 Hz)
    alpha_wave = generate_sine_wave(10.0, 2.0, 256, 20.0)

    # Add to all channels
    for channel in processor.channel_names:
        processor.add_samples(channel, alpha_wave.tolist())

    # Calculate powers
    powers = processor.calculate_band_powers()

    assert powers is not None, "Band power calculation returned None"
    assert 'alpha' in powers, "Missing alpha in results"

    print(f"  Band Powers:")
    print(f"    Delta: {powers['delta']:.2f} µV²")
    print(f"    Theta: {powers['theta']:.2f} µV²")
    print(f"    Alpha: {powers['alpha']:.2f} µV²  ← Should be highest")
    print(f"    Beta:  {powers['beta']:.2f} µV²")
    print(f"    Gamma: {powers['gamma']:.2f} µV²")

    # Alpha should dominate
    assert powers['alpha'] > powers['theta'], "Alpha should be > Theta"
    assert powers['alpha'] > powers['beta'], "Alpha should be > Beta"
    assert powers['alpha'] > powers['delta'], "Alpha should be > Delta"

    print(f"\n  Signal quality: {powers['artifacts']['signal_quality']}")
    print("  ✓ PASSED - Alpha correctly detected as dominant\n")


def test_beta_detection():
    """Test 4: Beta wave detection"""
    print("Test 4: Beta Wave Detection (20 Hz)")
    print("-" * 50)

    processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

    # Generate 20 Hz sine wave (beta band: 12-30 Hz)
    beta_wave = generate_sine_wave(20.0, 2.0, 256, 20.0)

    for channel in processor.channel_names:
        processor.add_samples(channel, beta_wave.tolist())

    powers = processor.calculate_band_powers()

    assert powers is not None
    assert powers['beta'] > powers['alpha'], "Beta should dominate"
    assert powers['beta'] > powers['theta'], "Beta should dominate"

    print(f"  Band Powers:")
    print(f"    Delta: {powers['delta']:.2f} µV²")
    print(f"    Theta: {powers['theta']:.2f} µV²")
    print(f"    Alpha: {powers['alpha']:.2f} µV²")
    print(f"    Beta:  {powers['beta']:.2f} µV²  ← Should be highest")
    print(f"    Gamma: {powers['gamma']:.2f} µV²")

    print("\n  ✓ PASSED - Beta correctly detected as dominant\n")


def test_theta_detection():
    """Test 5: Theta wave detection"""
    print("Test 5: Theta Wave Detection (6 Hz)")
    print("-" * 50)

    processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

    # Generate 6 Hz sine wave (theta band: 4-8 Hz)
    theta_wave = generate_sine_wave(6.0, 2.0, 256, 20.0)

    for channel in processor.channel_names:
        processor.add_samples(channel, theta_wave.tolist())

    powers = processor.calculate_band_powers()

    assert powers is not None
    assert powers['theta'] > powers['alpha'], "Theta should dominate"
    assert powers['theta'] > powers['beta'], "Theta should dominate"

    print(f"  Band Powers:")
    print(f"    Delta: {powers['delta']:.2f} µV²")
    print(f"    Theta: {powers['theta']:.2f} µV²  ← Should be highest")
    print(f"    Alpha: {powers['alpha']:.2f} µV²")
    print(f"    Beta:  {powers['beta']:.2f} µV²")
    print(f"    Gamma: {powers['gamma']:.2f} µV²")

    print("\n  ✓ PASSED - Theta correctly detected as dominant\n")


def test_buffer_status():
    """Test 6: Buffer status"""
    print("Test 6: Buffer Status")
    print("-" * 50)

    processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

    # Initially empty
    status = processor.get_buffer_status()
    assert status['ready'] == False
    print("  Initial state: Not ready (expected)")

    # Add partial data
    samples = [1.0] * 256  # Half window
    processor.add_samples('TP9', samples)

    status = processor.get_buffer_status()
    print(f"  After 256 samples: TP9 is {status['channels']['TP9']['fill_percent']:.1f}% full")

    # Add full data to all channels
    samples = [1.0] * 512
    for channel in processor.channel_names:
        processor.add_samples(channel, samples)

    status = processor.get_buffer_status()
    assert status['ready'] == True
    print("  After 512 samples to all channels: Ready ✓")

    print("  ✓ PASSED\n")


def test_artifact_detection():
    """Test 7: Artifact detection"""
    print("Test 7: Artifact Detection")
    print("-" * 50)

    processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

    # Clean signal
    clean_signal = generate_sine_wave(10.0, 2.0, 256, 20.0)

    for channel in processor.channel_names:
        processor.add_samples(channel, clean_signal.tolist())

    powers = processor.calculate_band_powers()

    assert powers is not None
    artifacts = powers['artifacts']

    print(f"  Clean signal artifacts:")
    print(f"    Eye blink: {artifacts['eye_blink']}")
    print(f"    Jaw clench: {artifacts['jaw_clench']}")
    print(f"    Movement: {artifacts['movement']}")
    print(f"    Quality: {artifacts['signal_quality']}")

    assert artifacts['signal_quality'] == 'good', "Clean signal should be good quality"

    print("  ✓ PASSED - Clean signal detected correctly\n")


def test_per_channel_powers():
    """Test 8: Per-channel powers"""
    print("Test 8: Per-Channel Powers")
    print("-" * 50)

    processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

    alpha_wave = generate_sine_wave(10.0, 2.0, 256, 20.0)

    for channel in processor.channel_names:
        processor.add_samples(channel, alpha_wave.tolist())

    powers = processor.calculate_band_powers()

    assert powers is not None
    assert 'channels' in powers

    print(f"  Per-channel alpha powers:")
    for channel in processor.channel_names:
        assert channel in powers['channels']
        alpha_power = powers['channels'][channel]['alpha']
        print(f"    {channel}: {alpha_power:.2f} µV²")
        assert alpha_power > 0

    print("  ✓ PASSED - All channels calculated\n")


def main():
    """Run all validation tests"""
    print("=" * 50)
    print("SignalProcessor Validation Test Suite")
    print("=" * 50)
    print()

    tests = [
        test_initialization,
        test_add_samples,
        test_alpha_detection,
        test_beta_detection,
        test_theta_detection,
        test_buffer_status,
        test_artifact_detection,
        test_per_channel_powers
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            print(f"  ✗ FAILED: {e}\n")
            failed += 1
        except Exception as e:
            print(f"  ✗ ERROR: {e}\n")
            failed += 1

    print("=" * 50)
    print("Test Summary")
    print("=" * 50)
    print(f"Passed: {passed}/{len(tests)}")
    print(f"Failed: {failed}/{len(tests)}")

    if failed == 0:
        print("\n✓✓✓ ALL TESTS PASSED ✓✓✓")
        print("\nSignalProcessor is working correctly!")
        print("Ready for Phase 4 (Protocol System)")
        return 0
    else:
        print("\n✗✗✗ SOME TESTS FAILED ✗✗✗")
        return 1


if __name__ == '__main__':
    sys.exit(main())
