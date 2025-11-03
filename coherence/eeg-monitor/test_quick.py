import sys
sys.path.insert(0, 'src')
sys.path.insert(0, 'venv/lib/python3.11/site-packages')

import numpy as np
from signal_processor import SignalProcessor

# Basic initialization test
config = {'sample_rate': 256, 'window_duration': 2.0}
processor = SignalProcessor(config)

print("✓ SignalProcessor initialized")
print(f"  Sample rate: {processor.sample_rate} Hz")
print(f"  Window duration: {processor.window_duration}s")
print(f"  Window size: {processor.window_size} samples")
print(f"  Channels: {processor.channel_names}")

# Test adding samples
samples = [1.0, 2.0, 3.0, 4.0, 5.0]
processor.add_samples('TP9', samples)
print(f"\n✓ Added {len(samples)} samples to TP9")
print(f"  Buffer size: {len(processor.buffers['TP9'])}")

# Generate alpha wave
t = np.linspace(0, 2, 512, endpoint=False)
alpha_wave = 20.0 * np.sin(2 * np.pi * 10 * t)

for channel in processor.channel_names:
    processor.add_samples(channel, alpha_wave.tolist())

print(f"\n✓ Added alpha wave to all channels")

# Calculate band powers
powers = processor.calculate_band_powers()

if powers:
    print(f"\n✓ Band powers calculated successfully")
    print(f"  Delta: {powers['delta']:.2f}")
    print(f"  Theta: {powers['theta']:.2f}")
    print(f"  Alpha: {powers['alpha']:.2f} (should be highest)")
    print(f"  Beta: {powers['beta']:.2f}")
    print(f"  Gamma: {powers['gamma']:.2f}")
    print(f"\n  Signal quality: {powers['artifacts']['signal_quality']}")
    
    # Verify alpha dominates
    if powers['alpha'] > powers['theta'] and powers['alpha'] > powers['beta']:
        print("\n✓✓✓ ALPHA DETECTION TEST PASSED ✓✓✓")
    else:
        print("\n✗✗✗ ALPHA DETECTION TEST FAILED ✗✗✗")
else:
    print("\n✗ Band power calculation returned None")

print("\n" + "="*50)
print("BASIC FUNCTIONALITY TEST COMPLETE")
print("="*50)
