# SignalProcessor API Reference

Quick reference guide for using the SignalProcessor class.

---

## Quick Start

```python
from signal_processor import SignalProcessor

# Initialize with configuration
config = {
    'sample_rate': 256,
    'window_duration': 2.0
}
processor = SignalProcessor(config)

# Add EEG samples (from Muse 2)
processor.add_samples('TP9', [12.5, 13.1, 11.8, ...])
processor.add_samples('AF7', [15.2, 14.8, 15.5, ...])
processor.add_samples('AF8', [14.9, 15.1, 14.6, ...])
processor.add_samples('TP10', [13.2, 12.9, 13.5, ...])

# Calculate band powers
powers = processor.calculate_band_powers()

if powers:
    print(f"Alpha: {powers['alpha']:.2f} µV²")
    print(f"Quality: {powers['artifacts']['signal_quality']}")
```

---

## Initialization

### SignalProcessor(config: Dict)

**Required Configuration:**
```python
config = {
    'sample_rate': 256,        # Hz - must match hardware
    'window_duration': 2.0     # seconds - analysis window
}
```

**Optional Configuration:**
```python
config = {
    'sample_rate': 256,
    'window_duration': 2.0,
    'window_overlap': 0.5,     # 0.0-0.99, default 0.5

    'frequency_bands': {       # Custom band definitions
        'delta': [0.5, 4],
        'theta': [4, 8],
        'alpha': [8, 13],
        'beta': [12, 30],
        'gamma': [30, 50]
    },

    'bandpass': {
        'enabled': True,
        'low_cutoff': 0.5,
        'high_cutoff': 50,
        'order': 4
    },

    'notch': {
        'enabled': True,
        'frequency': 60,       # 50 for Europe
        'quality_factor': 30
    },

    'artifacts': {
        'enabled': True,
        'blink_threshold': 100,
        'jaw_threshold': 50,
        'movement_threshold': 150
    }
}
```

---

## Core Methods

### add_samples(channel: str, samples: List[float])

Add new EEG samples to a channel's buffer.

**Parameters:**
- `channel`: Channel name ('TP9', 'AF7', 'AF8', 'TP10')
- `samples`: List of EEG voltage values (typically in µV)

**Example:**
```python
# Add single sample
processor.add_samples('TP9', [12.5])

# Add batch of samples
processor.add_samples('TP9', [12.5, 13.1, 11.8, 12.3])

# From numpy array
import numpy as np
data = np.random.randn(100)
processor.add_samples('TP9', data.tolist())
```

**Raises:**
- `ValueError`: Invalid channel name or malformed samples

**Notes:**
- Automatically filters out NaN and Inf values
- Buffer is fixed-size (3x window size)
- O(1) append operation

---

### calculate_band_powers() → Optional[Dict]

Calculate power in each frequency band using Welch's method.

**Returns:**
```python
{
    'delta': 45.2,      # µV² - averaged across channels
    'theta': 32.1,
    'alpha': 67.5,
    'beta': 28.3,
    'gamma': 12.4,

    'channels': {       # Per-channel band powers
        'TP9': {
            'delta': 43.1,
            'theta': 30.5,
            'alpha': 65.1,
            'beta': 30.2,
            'gamma': 13.1
        },
        'AF7': { ... },
        'AF8': { ... },
        'TP10': { ... }
    },

    'artifacts': {
        'eye_blink': False,
        'jaw_clench': False,
        'movement': False,
        'signal_quality': 'good',  # 'good', 'fair', 'poor'
        'details': {
            'max_amplitude': 45.2,
            'mean_variance': 12.3,
            'peak_to_peak': 89.7
        }
    },

    'timestamp': 1730678432.123  # Unix timestamp
}
```

**Returns `None` if:**
- Insufficient data in any channel
- Need at least `window_size` samples in each channel

**Example:**
```python
powers = processor.calculate_band_powers()

if powers:
    # Check signal quality first
    if powers['artifacts']['signal_quality'] == 'good':
        alpha = powers['alpha']
        beta = powers['beta']
        ratio = alpha / beta
        print(f"Alpha/Beta ratio: {ratio:.2f}")
    else:
        print("Poor signal quality, skipping...")
else:
    print("Insufficient data, need more samples")
```

---

### get_buffer_status() → Dict

Get current buffer status for all channels.

**Returns:**
```python
{
    'ready': True,          # All channels have enough data
    'window_size': 512,     # Required samples per channel

    'channels': {
        'TP9': {
            'samples': 512,
            'ready': True,
            'fill_percent': 100.0
        },
        'AF7': { ... },
        'AF8': { ... },
        'TP10': { ... }
    }
}
```

**Example:**
```python
status = processor.get_buffer_status()

if status['ready']:
    powers = processor.calculate_band_powers()
else:
    for channel, info in status['channels'].items():
        if not info['ready']:
            print(f"{channel}: {info['fill_percent']:.1f}% full")
```

---

### reset()

Clear all buffered data from all channels.

**Example:**
```python
# Start new recording session
processor.reset()

# Verify reset
status = processor.get_buffer_status()
assert status['ready'] == False
```

---

### get_latest_window(channel: str) → Optional[np.ndarray]

Get the latest analysis window for a specific channel.

**Parameters:**
- `channel`: Channel name

**Returns:**
- Numpy array of `window_size` samples
- `None` if insufficient data

**Example:**
```python
window = processor.get_latest_window('TP9')

if window is not None:
    # Analyze raw waveform
    peak_to_peak = np.max(window) - np.min(window)
    mean_voltage = np.mean(window)
    print(f"P2P: {peak_to_peak:.2f} µV")
```

---

## Usage Patterns

### Real-Time Streaming

```python
from pylsl import StreamInlet, resolve_byprop
from signal_processor import SignalProcessor

# Initialize
processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

# Connect to Muse
streams = resolve_byprop('type', 'EEG', timeout=10)
inlet = StreamInlet(streams[0])

# Stream loop
channels = ['TP9', 'AF7', 'AF8', 'TP10']

while True:
    sample, timestamp = inlet.pull_sample()

    # Add to processor
    for i, channel in enumerate(channels):
        processor.add_samples(channel, [sample[i]])

    # Calculate every second
    if processor.get_buffer_status()['ready']:
        powers = processor.calculate_band_powers()

        if powers and powers['artifacts']['signal_quality'] == 'good':
            # Use band powers
            print(f"Alpha: {powers['alpha']:.2f} µV²")
```

### Batch Processing

```python
# Load recorded session
import numpy as np

data = np.load('session.npy')  # Shape: (4, N) for 4 channels

processor = SignalProcessor({'sample_rate': 256, 'window_duration': 2.0})

# Add all data
for i, channel in enumerate(['TP9', 'AF7', 'AF8', 'TP10']):
    processor.add_samples(channel, data[i].tolist())

# Calculate
powers = processor.calculate_band_powers()
```

### Protocol-Specific Channel Selection

```python
# Theta/Beta ratio uses frontal channels
powers = processor.calculate_band_powers()

if powers:
    # Get frontal channel powers
    af7_theta = powers['channels']['AF7']['theta']
    af7_beta = powers['channels']['AF7']['beta']
    af8_theta = powers['channels']['AF8']['theta']
    af8_beta = powers['channels']['AF8']['beta']

    # Average frontal channels
    frontal_theta = (af7_theta + af8_theta) / 2
    frontal_beta = (af7_beta + af8_beta) / 2

    # Calculate ratio
    theta_beta_ratio = frontal_theta / frontal_beta
    print(f"Theta/Beta: {theta_beta_ratio:.2f}")
```

### Artifact Handling

```python
powers = processor.calculate_band_powers()

if powers:
    artifacts = powers['artifacts']

    # Check for specific artifacts
    if artifacts['eye_blink']:
        print("Eye blink detected - results may be unreliable")

    if artifacts['jaw_clench']:
        print("Jaw tension detected - relax jaw")

    if artifacts['movement']:
        print("Movement detected - stay still")

    # Overall quality check
    if artifacts['signal_quality'] == 'poor':
        # Skip this sample
        pass
    elif artifacts['signal_quality'] == 'fair':
        # Use with caution
        pass
    else:  # 'good'
        # Reliable data
        process_band_powers(powers)
```

---

## Performance Tips

### 1. Batch Sample Addition

```python
# Good - batch addition
samples = [s1, s2, s3, s4, s5]
processor.add_samples('TP9', samples)

# Less efficient - individual additions
for sample in samples:
    processor.add_samples('TP9', [sample])
```

### 2. Calculate Only When Needed

```python
# Check buffer status first
if processor.get_buffer_status()['ready']:
    powers = processor.calculate_band_powers()
```

### 3. Filter Configuration

```python
# Disable filters if not needed (faster processing)
config = {
    'sample_rate': 256,
    'window_duration': 2.0,
    'bandpass': {'enabled': False},
    'notch': {'enabled': False}
}
```

### 4. Artifact Detection

```python
# Disable artifacts if not needed
config = {
    'sample_rate': 256,
    'window_duration': 2.0,
    'artifacts': {'enabled': False}
}
```

---

## Frequency Band Reference

| Band | Range (Hz) | Mental State | Neurofeedback Uses |
|------|-----------|--------------|-------------------|
| **Delta** | 0.5-4 | Deep sleep, unconscious | Sleep research |
| **Theta** | 4-8 | Meditation, creativity, memory | Deep meditation, creativity training |
| **Alpha** | 8-13 | Relaxation, calm focus | Stress reduction, meditation |
| **Beta** | 12-30 | Active thinking, concentration | Focus training, alertness |
| **Gamma** | 30-50 | High-level cognition, learning | Advanced meditation, peak performance |

---

## Troubleshooting

### Issue: calculate_band_powers() returns None

**Cause:** Insufficient data in buffers

**Solution:**
```python
status = processor.get_buffer_status()
print(f"Ready: {status['ready']}")
print(f"Need {status['window_size']} samples per channel")

for channel, info in status['channels'].items():
    print(f"{channel}: {info['samples']} samples ({info['fill_percent']:.1f}%)")
```

### Issue: All band powers are very low

**Possible causes:**
1. Incorrect units (expecting µV, got mV)
2. Poor electrode contact
3. Signal quality issues

**Debug:**
```python
# Check raw data range
window = processor.get_latest_window('TP9')
if window is not None:
    print(f"Data range: {np.min(window):.2f} to {np.max(window):.2f}")
    print(f"Expected: -100 to +100 µV for typical EEG")
```

### Issue: High artifact detection rate

**Cause:** Thresholds may need adjustment

**Solution:**
```python
config = {
    'sample_rate': 256,
    'window_duration': 2.0,
    'artifacts': {
        'enabled': True,
        'blink_threshold': 150,     # Increased from 100
        'jaw_threshold': 75,        # Increased from 50
        'movement_threshold': 200   # Increased from 150
    }
}
```

---

## See Also

- [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) - Full project plan
- [PHASE3_SUMMARY.md](../PHASE3_SUMMARY.md) - Implementation details
- [test_signal_processor.py](../tests/test_signal_processor.py) - Usage examples in tests
