# Multi-Protocol EEG Neurofeedback System - Implementation Plan

**Created:** 2025-11-02
**Version:** 1.0
**Status:** Ready for Phase 1

---

## Executive Summary

Building an extensible multi-protocol EEG neurofeedback system using the Muse 2 headset, integrated with existing HRV coherence monitoring.

**Key Decision:** Build protocol plugin architecture from the start (not just alpha-only) to support 5 validated protocols with minimal future refactoring cost.

**Timeline:** 12-14 weeks
**Hardware:** Muse 2 headset (ready for testing)
**Future:** Extract into standalone project

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Client                       │
│  ┌──────────────┐              ┌──────────────────────┐ │
│  │ HRV Display  │              │  EEG Display         │ │
│  │ Coherence    │              │  Protocol Metrics    │ │
│  │ 0-100 score  │              │  Band Powers         │ │
│  └──────┬───────┘              └─────────┬────────────┘ │
└─────────┼──────────────────────────────────┼────────────┘
          │                                  │
     WebSocket                          WebSocket
     Port 8765                          Port 8766
          │                                  │
┌─────────┴──────────┐          ┌───────────┴─────────────┐
│  HRV Monitor       │          │  EEG Monitor            │
│  (existing)        │          │  (new)                  │
│                    │          │                         │
│  ┌──────────────┐  │          │  ┌──────────────────┐  │
│  │ Polar H10    │  │          │  │ Muse 2 Headset   │  │
│  │ BLE          │  │          │  │ LSL via muselsl  │  │
│  └──────┬───────┘  │          │  └────────┬─────────┘  │
│         │          │          │           │            │
│  ┌──────┴───────┐  │          │  ┌────────┴─────────┐  │
│  │ Coherence    │  │          │  │ SignalProcessor  │  │
│  │ Calculator   │  │          │  │ (FFT, filters)   │  │
│  └──────────────┘  │          │  └────────┬─────────┘  │
│                    │          │           │            │
│                    │          │  ┌────────┴─────────┐  │
│                    │          │  │ Protocol         │  │
│                    │          │  │ Calculator       │  │
│                    │          │  │ (Plugin-based)   │  │
│                    │          │  └──────────────────┘  │
└────────────────────┘          └────────────────────────┘
```

### Protocol Plugin Architecture

```python
# Base interface
class NeurofeedbackProtocol(ABC):
    @abstractmethod
    def calculate_metrics(self, band_powers: dict) -> dict:
        """Calculate protocol-specific metrics"""
        pass

# Implementations
class AlphaEnhancement(NeurofeedbackProtocol):
    """8-13 Hz, higher is better"""

class ThetaBetaRatio(NeurofeedbackProtocol):
    """4-8 Hz / 12-30 Hz, INVERSE scoring (lower is better)"""

class AlphaAsymmetry(NeurofeedbackProtocol):
    """Left vs right hemisphere, logarithmic calculation"""
```

### File Structure

```
coherence/
├── eeg-monitor/              # New EEG system (will extract later)
│   ├── src/
│   │   ├── __init__.py
│   │   ├── muse_headset.py       # LSL interface
│   │   ├── signal_processor.py   # FFT, band powers
│   │   ├── protocol_calculator.py # Generic calculator
│   │   ├── protocols/
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # NeurofeedbackProtocol ABC
│   │   │   ├── alpha_enhancement.py
│   │   │   ├── theta_beta_ratio.py
│   │   │   ├── alpha_asymmetry.py
│   │   │   ├── theta_enhancement.py
│   │   │   ├── beta_enhancement.py
│   │   │   └── factory.py        # Protocol factory
│   │   ├── websocket_server.py
│   │   └── main.py
│   ├── config/
│   │   ├── default.yaml
│   │   └── protocols.yaml
│   ├── tests/
│   ├── docs/
│   ├── requirements.txt
│   └── run.sh
```

---

## Phase 1: Architecture & Protocol System Design

**Duration:** 1 week
**Goal:** Complete technical specification

### Tasks

1. **Review Research Documents**
   - Muse integration research
   - Protocol extensibility analysis
   - Existing HRV monitor architecture

2. **Define Protocol Interface**
```python
class NeurofeedbackProtocol(ABC):
    name: str
    description: str
    frequency_bands: dict  # Which bands this protocol uses

    @abstractmethod
    def calculate_metrics(self, band_powers: dict) -> dict:
        """
        Args:
            band_powers: {
                'delta': float,
                'theta': float,
                'alpha': float,
                'beta': float,
                'gamma': float,
                'channels': {  # Per-channel if needed
                    'TP9': {...},
                    'AF7': {...},
                    'AF8': {...},
                    'TP10': {...}
                }
            }

        Returns:
            {
                'score': float,  # 0-100
                'direction': str,  # 'higher', 'lower', 'balanced'
                'feedback_level': str,  # 'low', 'medium', 'good', 'excellent'
                'details': dict  # Protocol-specific data
            }
        """
        pass
```

3. **Design Configuration Schema**
```yaml
# config/protocols.yaml
protocols:
  alpha_enhancement:
    name: "Alpha Enhancement"
    description: "Relaxation and meditation training"
    frequency_bands:
      alpha: [8, 13]
    parameters:
      baseline_window: 120  # seconds
      smoothing_factor: 0.7
    thresholds:
      low: 30
      medium: 50
      good: 70
      excellent: 85

  theta_beta_ratio:
    name: "Theta/Beta Ratio"
    description: "Attention and focus training"
    frequency_bands:
      theta: [4, 8]
      beta: [12, 30]
    parameters:
      target_ratio: 2.0
      inverse_scoring: true  # CRITICAL: Lower is better
    thresholds:
      excellent: 1.5  # Lower ratios are better
      good: 2.0
      medium: 2.5
      low: 3.0
```

4. **Design WebSocket Message Protocol**
```javascript
// Protocol metric update
{
  type: "protocol_metric",
  timestamp: 1698765432.123,
  protocol: "alpha_enhancement",
  score: 67.5,
  direction: "higher",
  feedback_level: "good",
  details: {
    alpha_power: 45.2,
    baseline: 32.1
  }
}

// Band powers
{
  type: "band_powers",
  timestamp: 1698765432.123,
  powers: {
    delta: 45.2,
    theta: 32.1,
    alpha: 67.5,
    beta: 28.3,
    gamma: 12.4
  },
  channels: {
    TP9: { alpha: 65.1, beta: 30.2, ... },
    AF7: { alpha: 68.9, beta: 26.4, ... },
    // ...
  }
}
```

### Deliverables

- [x] Technical specification document (this file)
- [ ] Architecture diagrams
- [ ] Configuration schema
- [ ] WebSocket protocol spec
- [ ] Risk assessment

### Success Criteria

- All 5 protocols have clear specifications
- Plugin pattern validated
- Configuration approach approved
- No blocking technical questions

---

## Phase 2: Muse Hardware Setup & Testing

**Duration:** 1 week
**Goal:** Reliable Muse 2 connection and data streaming
**🔔 TESTING CHECKPOINT - User's Muse 2 ready**

### Tasks

1. **Install Dependencies**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install muselsl and pylsl
pip install muselsl pylsl numpy scipy

# Test installation
muselsl list  # Should scan for Muse devices
```

2. **Create Connection Test Script**
```python
# tests/test_muse_connection.py
import asyncio
from pylsl import StreamInlet, resolve_byprop

async def test_muse_connection():
    """Test basic Muse 2 connection via LSL"""
    print("Searching for Muse stream...")

    streams = resolve_byprop('type', 'EEG', timeout=10)

    if not streams:
        print("❌ No Muse stream found")
        print("Make sure muselsl stream is running:")
        print("  muselsl stream")
        return False

    print(f"✓ Found {len(streams)} stream(s)")

    inlet = StreamInlet(streams[0])
    info = inlet.info()

    print(f"  Name: {info.name()}")
    print(f"  Type: {info.type()}")
    print(f"  Channels: {info.channel_count()}")
    print(f"  Sample rate: {info.nominal_srate()} Hz")

    # Test data streaming
    print("\nTesting data streaming (10 seconds)...")
    sample_count = 0
    start_time = time.time()

    while time.time() - start_time < 10:
        sample, timestamp = inlet.pull_sample(timeout=1.0)
        if sample:
            sample_count += 1

    actual_rate = sample_count / 10
    print(f"  Received {sample_count} samples")
    print(f"  Actual rate: {actual_rate:.1f} Hz")

    if actual_rate >= 250:  # 256 Hz nominal
        print("✓ Data streaming working correctly")
        return True
    else:
        print("❌ Data streaming rate too low")
        return False

if __name__ == "__main__":
    asyncio.run(test_muse_connection())
```

3. **Test Signal Quality**
```python
# tests/test_signal_quality.py
def test_electrode_contact():
    """Verify all electrodes have good contact"""
    # Check signal amplitude
    # Check impedance if available
    # Flag poor contacts

def test_artifact_detection():
    """Test that we can detect common artifacts"""
    # Eye blinks
    # Jaw clenches
    # Movement
```

4. **Create Setup Documentation**
```markdown
# Muse 2 Setup Guide

## Hardware Preparation
1. Charge Muse 2 fully
2. Clean electrodes with rubbing alcohol
3. Wet electrodes with water or conductive gel
4. Fit headband snugly (not too tight)

## Software Installation
```bash
pip install muselsl pylsl
```

## Starting the Stream
```bash
# Terminal 1: Start Muse LSL stream
muselsl stream

# Terminal 2: Verify connection
python tests/test_muse_connection.py
```

## Troubleshooting
- Device not found: Check Bluetooth is on, Muse is charged
- Poor signal quality: Wet electrodes, adjust fit
- Dropouts: Move away from WiFi router, other BLE devices
```

### Deliverables

- [ ] `tests/test_muse_connection.py`
- [ ] `tests/test_signal_quality.py`
- [ ] `docs/MUSE_SETUP.md`
- [ ] `setup.sh` script
- [ ] Signal quality validation report

### Success Criteria

- ✅ Muse 2 connects reliably within 10 seconds
- ✅ Raw EEG data streams at 256 Hz ± 5%
- ✅ All 4 channels show valid data
- ✅ Signal quality indicators work
- ✅ Connection stable for 10+ minutes

---

## Phase 3: Signal Processing & Band Power Calculation

**Duration:** 1.5 weeks
**Goal:** Extract accurate band powers from EEG data

### Tasks

1. **Create SignalProcessor Class**
```python
# src/signal_processor.py
import numpy as np
from scipy import signal
from collections import deque

class SignalProcessor:
    """
    Processes raw EEG data to extract frequency band powers.
    Uses Welch's method for robust power spectral density estimation.
    """

    def __init__(self, config: dict):
        self.sample_rate = config.get('sample_rate', 256)
        self.window_duration = config.get('window_duration', 2.0)  # seconds
        self.window_size = int(self.sample_rate * self.window_duration)

        # Frequency bands (Hz)
        self.bands = {
            'delta': (0.5, 4),
            'theta': (4, 8),
            'alpha': (8, 13),
            'beta': (12, 30),
            'gamma': (30, 50)
        }

        # Buffers for each channel (using deque for efficiency)
        self.buffers = {
            'TP9': deque(maxlen=self.window_size * 3),
            'AF7': deque(maxlen=self.window_size * 3),
            'AF8': deque(maxlen=self.window_size * 3),
            'TP10': deque(maxlen=self.window_size * 3)
        }

        # Design filters
        self._design_filters()

    def _design_filters(self):
        """Design bandpass and notch filters"""
        # Bandpass: 0.5-50 Hz
        self.bandpass = signal.butter(
            4, [0.5, 50],
            btype='bandpass',
            fs=self.sample_rate
        )

        # Notch filter for 60 Hz line noise
        self.notch = signal.iirnotch(
            60, Q=30,
            fs=self.sample_rate
        )

    def add_samples(self, channel: str, samples: list):
        """Add new EEG samples to buffer"""
        self.buffers[channel].extend(samples)

    def calculate_band_powers(self) -> dict:
        """
        Calculate power in each frequency band for all channels.

        Returns:
            {
                'delta': float,  # Average across channels
                'theta': float,
                'alpha': float,
                'beta': float,
                'gamma': float,
                'channels': {
                    'TP9': {'delta': float, ...},
                    'AF7': {'delta': float, ...},
                    ...
                }
            }
        """
        # Check if we have enough data
        if len(self.buffers['TP9']) < self.window_size:
            return None

        results = {}
        channel_results = {}

        for channel, buffer in self.buffers.items():
            # Get latest window
            data = np.array(list(buffer)[-self.window_size:])

            # Apply filters
            data = signal.filtfilt(*self.bandpass, data)
            data = signal.filtfilt(*self.notch, data)

            # Calculate PSD using Welch's method
            freqs, psd = signal.welch(
                data,
                fs=self.sample_rate,
                nperseg=self.window_size // 4,
                noverlap=self.window_size // 8
            )

            # Calculate power in each band
            channel_powers = {}
            for band_name, (low, high) in self.bands.items():
                idx = np.logical_and(freqs >= low, freqs <= high)
                band_power = np.trapz(psd[idx], freqs[idx])
                channel_powers[band_name] = float(band_power)

            channel_results[channel] = channel_powers

        # Average across channels
        for band_name in self.bands.keys():
            avg_power = np.mean([
                channel_results[ch][band_name]
                for ch in self.buffers.keys()
            ])
            results[band_name] = float(avg_power)

        results['channels'] = channel_results

        return results
```

2. **Add Artifact Detection**
```python
def detect_artifacts(self, data: np.ndarray) -> dict:
    """
    Detect common EEG artifacts.

    Returns:
        {
            'eye_blink': bool,
            'jaw_clench': bool,
            'movement': bool,
            'signal_quality': str  # 'good', 'fair', 'poor'
        }
    """
    # Eye blinks: High amplitude in frontal channels (AF7, AF8)
    # Jaw clench: High frequency power > 50 Hz
    # Movement: Sudden large amplitude changes
    # Signal quality: Check variance, saturation
```

3. **Unit Tests with Synthetic Data**
```python
# tests/test_signal_processor.py
def test_alpha_detection():
    """Test that 10 Hz sine wave is detected as alpha"""
    # Generate 10 Hz sine wave
    t = np.linspace(0, 2, 512)  # 2 seconds at 256 Hz
    alpha_wave = np.sin(2 * np.pi * 10 * t)

    processor = SignalProcessor({'sample_rate': 256})
    processor.add_samples('TP9', alpha_wave)

    powers = processor.calculate_band_powers()

    # Alpha should dominate
    assert powers['alpha'] > powers['theta']
    assert powers['alpha'] > powers['beta']
```

### Deliverables

- [ ] `src/signal_processor.py`
- [ ] `tests/test_signal_processor.py`
- [ ] Performance benchmarks

### Success Criteria

- ✅ Band power calculations accurate within 5% on synthetic data
- ✅ Processing latency <50ms for 1-second window
- ✅ Artifact detection catches >90% of blinks/jaw clenches
- ✅ Memory stable over 1 hour runtime
- ✅ Test coverage >85%

---

## Phase 4: Protocol Plugin System

**Duration:** 2 weeks
**Goal:** Implement 5 neurofeedback protocols

### Protocol Specifications

#### 1. Alpha Enhancement
```python
class AlphaEnhancement(NeurofeedbackProtocol):
    """
    Enhances alpha waves (8-13 Hz) for relaxation and meditation.

    Scoring: Higher alpha power = better
    Research: Most basic neurofeedback protocol, widely validated
    """

    def calculate_metrics(self, band_powers: dict) -> dict:
        alpha_power = band_powers['alpha']

        # Normalize to baseline (if available)
        if self.baseline:
            alpha_relative = (alpha_power / self.baseline['alpha']) * 100
        else:
            alpha_relative = alpha_power

        # Score 0-100
        score = min(100, alpha_relative)

        # Feedback levels
        if score < 30:
            level = 'low'
        elif score < 50:
            level = 'medium'
        elif score < 70:
            level = 'good'
        else:
            level = 'excellent'

        return {
            'score': score,
            'direction': 'higher',
            'feedback_level': level,
            'details': {
                'alpha_power': alpha_power,
                'baseline': self.baseline.get('alpha') if self.baseline else None
            }
        }
```

#### 2. Theta/Beta Ratio
```python
class ThetaBetaRatio(NeurofeedbackProtocol):
    """
    Reduces theta/beta ratio for attention and focus training.

    Scoring: INVERSE - Lower ratio = better focus
    Research: Most validated for ADHD (67+ studies)
    Typical ratio: 2.0 (target: < 1.5 for good focus)
    """

    def calculate_metrics(self, band_powers: dict) -> dict:
        # Use frontal channels (AF7, AF8)
        theta_power = np.mean([
            band_powers['channels']['AF7']['theta'],
            band_powers['channels']['AF8']['theta']
        ])
        beta_power = np.mean([
            band_powers['channels']['AF7']['beta'],
            band_powers['channels']['AF8']['beta']
        ])

        ratio = theta_power / beta_power if beta_power > 0 else 10

        # INVERSE SCORING: Lower ratio = higher score
        # Target ratio: 1.5 (excellent) to 3.0 (low)
        if ratio <= 1.5:
            score = 100
            level = 'excellent'
        elif ratio <= 2.0:
            score = 80
            level = 'good'
        elif ratio <= 2.5:
            score = 50
            level = 'medium'
        else:
            score = max(0, 100 - (ratio - 2.5) * 20)
            level = 'low'

        return {
            'score': score,
            'direction': 'lower',  # Lower ratio is better
            'feedback_level': level,
            'details': {
                'theta_power': theta_power,
                'beta_power': beta_power,
                'ratio': ratio,
                'target': 1.5
            }
        }
```

#### 3. Alpha Asymmetry
```python
class AlphaAsymmetry(NeurofeedbackProtocol):
    """
    Balances left vs right hemisphere alpha for mood regulation.

    Calculation: log(right_alpha) - log(left_alpha)
    Positive = More right alpha (withdrawal/negative affect)
    Negative = More left alpha (approach/positive affect)
    Scoring: Balance around zero is ideal

    Research: Davidson's frontal alpha asymmetry model
    """

    def calculate_metrics(self, band_powers: dict) -> dict:
        # Left hemisphere: AF7
        # Right hemisphere: AF8
        left_alpha = band_powers['channels']['AF7']['alpha']
        right_alpha = band_powers['channels']['AF8']['alpha']

        # Logarithmic difference (standard method)
        asymmetry = np.log(right_alpha) - np.log(left_alpha)

        # Score based on balance (zero = perfect balance)
        imbalance = abs(asymmetry)
        score = max(0, 100 - imbalance * 50)

        if imbalance < 0.1:
            level = 'excellent'
        elif imbalance < 0.2:
            level = 'good'
        elif imbalance < 0.3:
            level = 'medium'
        else:
            level = 'low'

        return {
            'score': score,
            'direction': 'balanced',
            'feedback_level': level,
            'details': {
                'left_alpha': left_alpha,
                'right_alpha': right_alpha,
                'asymmetry': asymmetry,
                'dominant_hemisphere': 'right' if asymmetry > 0 else 'left'
            }
        }
```

#### 4. Theta Enhancement
```python
class ThetaEnhancement(NeurofeedbackProtocol):
    """
    Enhances theta waves (4-8 Hz) for deep meditation and creativity.

    Scoring: Higher theta = better
    Research: Associated with creative states, hypnagogia
    """
    # Similar to AlphaEnhancement but for theta band
```

#### 5. Beta Enhancement
```python
class BetaEnhancement(NeurofeedbackProtocol):
    """
    Enhances beta waves (12-30 Hz) for focus and alertness.

    Scoring: Higher beta = better (but watch for anxiety)
    Research: Associated with active thinking, problem solving
    Warning: Too high can indicate anxiety/stress
    """
    # Similar to AlphaEnhancement but for beta band
    # Add warning if beta gets too high
```

### Protocol Factory

```python
# src/protocols/factory.py
class ProtocolFactory:
    """Creates protocol instances from configuration"""

    _registry = {
        'alpha_enhancement': AlphaEnhancement,
        'theta_beta_ratio': ThetaBetaRatio,
        'alpha_asymmetry': AlphaAsymmetry,
        'theta_enhancement': ThetaEnhancement,
        'beta_enhancement': BetaEnhancement
    }

    @classmethod
    def create(cls, protocol_name: str, config: dict) -> NeurofeedbackProtocol:
        """
        Create protocol instance from name and config.

        Args:
            protocol_name: Name of protocol (e.g., 'alpha_enhancement')
            config: Protocol-specific configuration

        Returns:
            NeurofeedbackProtocol instance
        """
        protocol_class = cls._registry.get(protocol_name)
        if not protocol_class:
            raise ValueError(f"Unknown protocol: {protocol_name}")

        return protocol_class(config)

    @classmethod
    def list_protocols(cls) -> list:
        """Return list of available protocol names"""
        return list(cls._registry.keys())
```

### Deliverables

- [ ] `src/protocols/base.py`
- [ ] `src/protocols/alpha_enhancement.py`
- [ ] `src/protocols/theta_beta_ratio.py`
- [ ] `src/protocols/alpha_asymmetry.py`
- [ ] `src/protocols/theta_enhancement.py`
- [ ] `src/protocols/beta_enhancement.py`
- [ ] `src/protocols/factory.py`
- [ ] `src/protocol_calculator.py`
- [ ] `tests/test_protocols.py`
- [ ] `config/protocols.yaml`

### Success Criteria

- ✅ All 5 protocols implement base interface
- ✅ Calculations match research specifications
- ✅ Factory creates protocols from config
- ✅ Protocol switching works at runtime
- ✅ Test coverage >80%

---

## Phase 5: WebSocket Server & Integration

**Duration:** 1.5 weeks
**Goal:** Stream EEG metrics to browser

**🔔 TESTING CHECKPOINT - End-to-end EEG with Muse 2**

### Tasks

1. Create WebSocket server (port 8766)
2. Integrate Muse → SignalProcessor → ProtocolCalculator → WebSocket
3. Implement message protocol
4. Add session recording
5. End-to-end integration tests

### Success Criteria

- ✅ WebSocket streams at <100ms latency
- ✅ Multi-client support works
- ✅ Integration tests pass end-to-end
- ✅ No memory leaks over 1 hour

---

## Remaining Phases (Summary)

**Phase 6: Browser Visualization** (2 weeks)
- EEG metric displays
- Protocol-specific visualizations
- Combined HRV + EEG view

**Phase 7: Multi-Modal Integration** (1.5 weeks)
- Flow state calculation (HRV + EEG)
- Heart-brain synchrony
- Session analytics

**Phase 8: Configuration & Polish** (1.5 weeks)
- Unified startup
- Session recording/playback
- Documentation

**Phase 9: Testing & Validation** (1 week)
- End-to-end testing
- Protocol validation
- Performance optimization

---

## Timeline

| Phase | Duration | Cumulative | Checkpoint |
|-------|----------|------------|------------|
| 1. Architecture | 1 week | 1 week | Design review |
| 2. Muse Setup | 1 week | 2 weeks | **🔔 Hardware test** |
| 3. Signal Processing | 1.5 weeks | 3.5 weeks | |
| 4. Protocol System | 2 weeks | 5.5 weeks | |
| 5. WebSocket | 1.5 weeks | 7 weeks | **🔔 End-to-end test** |
| 6. Visualization | 2 weeks | 9 weeks | |
| 7. Multi-Modal | 1.5 weeks | 10.5 weeks | |
| 8. Polish | 1.5 weeks | 12 weeks | |
| 9. Testing | 1 week | 13 weeks | |
| **Buffer** | 1 week | **14 weeks** | |

---

## Success Metrics

### Technical
- ✅ Connection success >95%
- ✅ Latency <100ms
- ✅ Test coverage >80%
- ✅ CPU usage <30%
- ✅ Memory stable

### User
- ✅ Setup time <10 minutes
- ✅ Time to first feedback <60 seconds
- ✅ Session stability >95%
- ✅ Positive user feedback

### Research
- ✅ Protocols match published methods
- ✅ Muse 2 quality acceptable
- ✅ Multi-modal shows clear benefits

---

## Next Steps

1. **Review this plan** ✓
2. **Begin Phase 1** - Architecture design
3. **Phase 2 checkpoint** - Test with user's Muse 2
4. **Phase 5 checkpoint** - End-to-end EEG testing

**Ready to begin Phase 1?**
