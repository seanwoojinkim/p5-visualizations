# Comprehensive Code Review: HRV Monitor & Coherence Visualization

**Date**: 2025-10-28
**Reviewer**: Claude Code
**Scope**: `/workspace/hrv-monitor/` and `/workspace/coherence/` visualization integration
**Total Lines Reviewed**: ~1,981 LOC (Python + JavaScript)

---

## Executive Summary

This review evaluates a heart rate variability (HRV) monitoring system that connects to a Polar H10 heart rate monitor via Bluetooth LE, calculates HeartMath coherence scores, and streams the data to a browser-based visualization via WebSocket.

**Overall Assessment**: The code is well-structured with clear separation of concerns. However, there are several **critical issues** around error handling, resource management, and testing that should be addressed before production use.

**Key Strengths**:
- Clean architecture with well-separated modules
- Comprehensive documentation and comments
- Modern async/await patterns in Python
- Good configuration management with YAML

**Key Concerns**:
- No test coverage whatsoever
- Missing `__init__.py` files preventing proper package imports
- Several async resource leaks
- Insufficient error handling in critical paths
- No input validation on configuration
- Security vulnerabilities in WebSocket server

---

## 1. Code Organization & Structure

### Python (hrv-monitor)

#### CRITICAL: Missing `__init__.py` Files
**Severity**: Critical
**Files**: `/workspace/hrv-monitor/src/`

**Issue**: The `src/` directory lacks `__init__.py` files, preventing it from being a proper Python package.

**Impact**:
- Imports like `from polar_h10 import PolarH10` only work when running from the project root
- Cannot install as a package
- Breaks IDE autocomplete and type checking
- Makes testing difficult

**Location**:
- `/workspace/hrv-monitor/src/` (missing `__init__.py`)

**Recommendation**:
```bash
# Create package structure
touch /workspace/hrv-monitor/src/__init__.py

# Update imports in main.py:
from src.polar_h10 import PolarH10
from src.coherence_calculator import CoherenceCalculator
from src.websocket_server import CoherenceWebSocketServer
```

**Code Example**:
```python
# src/__init__.py
"""
Polar H10 HRV Monitor Package
"""
__version__ = "0.1.0"

from .polar_h10 import PolarH10
from .coherence_calculator import CoherenceCalculator
from .websocket_server import CoherenceWebSocketServer

__all__ = ['PolarH10', 'CoherenceCalculator', 'CoherenceWebSocketServer']
```

---

#### HIGH: Inconsistent Module Organization
**Severity**: High
**Files**: Multiple

**Issue**: All Python modules are in a flat `src/` directory. As the project grows, this will become unwieldy.

**Recommendation**:
```
src/
├── __init__.py
├── hardware/
│   ├── __init__.py
│   └── polar_h10.py
├── analysis/
│   ├── __init__.py
│   └── coherence_calculator.py
├── streaming/
│   ├── __init__.py
│   └── websocket_server.py
└── main.py
```

---

### JavaScript (coherence visualization)

#### MEDIUM: Good Module Structure
**Severity**: N/A (Positive)
**Files**: `/workspace/coherence/src/`

**Observation**: The JavaScript code has excellent separation:
- `/apps/` - Application entry points
- `/core/` - Core business logic
- `/physics/` - Simulation engine
- `/integrations/` - External service integrations
- `/ui/` - User interface components

This is a **best practice** example of modular JavaScript architecture.

---

## 2. Best Practices

### Python Coding Standards (PEP 8)

#### LOW: Generally Good PEP 8 Compliance
**Severity**: Low
**Files**: All Python files

**Observations**:
- Good use of docstrings
- Proper naming conventions (snake_case for functions/variables)
- Appropriate line length (mostly under 100 chars)
- Good use of type hints in function signatures

**Minor Issues**:
- Line 219 in `polar_h10.py`: `self.client.address` could be None if client hasn't been initialized
- Missing type hints in some return values

---

### Error Handling & Exception Management

#### CRITICAL: Bare Exception Catching
**Severity**: Critical
**Files**: `main.py:140-141`, `main.py:246-247`, `polar_h10.py:117-120`, `coherence_calculator.py:149-158`

**Issue**: Multiple instances of catching broad exceptions without proper handling:

**Location**: `/workspace/hrv-monitor/src/main.py:140-141`
```python
except Exception as e:
    logger.error(f"Error in coherence update: {e}")
```

**Problem**:
- Swallows all exceptions including `KeyboardInterrupt`, `SystemExit`
- No recovery mechanism
- Continues running in degraded state
- No alerting on critical failures

**Recommendation**:
```python
except (ValueError, KeyError, TypeError) as e:
    logger.error(f"Error in coherence update: {e}", exc_info=True)
    # Attempt recovery or graceful degradation
    await self.websocket_server.broadcast_error({
        'error': 'coherence_calculation_failed',
        'message': str(e)
    })
except Exception as e:
    logger.critical(f"Unexpected error in coherence update: {e}", exc_info=True)
    raise  # Re-raise unexpected errors
```

---

#### HIGH: Bluetooth Connection Failure Handling
**Severity**: High
**Files**: `polar_h10.py:117-120`

**Location**: `/workspace/hrv-monitor/src/polar_h10.py:117-120`
```python
except Exception as e:
    logger.error(f"Connection error: {e}")
    self.is_connected = False
    return False
```

**Issue**:
- Doesn't distinguish between transient errors (device temporarily unavailable) and permanent errors (Bluetooth disabled)
- No user guidance on how to fix the issue
- Silent failure could lead to hung state

**Recommendation**:
```python
except asyncio.TimeoutError:
    logger.error("Bluetooth scan timeout - device not found")
    return False
except BleakError as e:
    if "not available" in str(e).lower():
        logger.error("Bluetooth adapter not available. Is Bluetooth enabled?")
    elif "permission" in str(e).lower():
        logger.error("Bluetooth permission denied. Check system permissions.")
    else:
        logger.error(f"Bluetooth error: {e}")
    return False
except Exception as e:
    logger.critical(f"Unexpected connection error: {e}", exc_info=True)
    return False
```

---

#### HIGH: No Error Handling in Notification Handler
**Severity**: High
**Files**: `polar_h10.py:183-184`

**Location**: `/workspace/hrv-monitor/src/polar_h10.py:183-184`
```python
except Exception as e:
    logger.error(f"Error parsing heart rate data: {e}")
```

**Issue**:
- Bluetooth notification handler catches all exceptions and continues
- Malformed data could repeatedly trigger errors
- No circuit breaker pattern
- Could miss critical heart beats

**Recommendation**:
```python
# Add error tracking
self.parse_error_count = 0
self.max_parse_errors = 10

def _notification_handler(self, sender, data):
    try:
        # ... parsing logic ...
        self.parse_error_count = 0  # Reset on success
    except (IndexError, ValueError) as e:
        self.parse_error_count += 1
        logger.warning(f"Error parsing HR data (error {self.parse_error_count}): {e}")

        if self.parse_error_count >= self.max_parse_errors:
            logger.error("Too many parse errors - disconnecting")
            asyncio.create_task(self.disconnect())
```

---

### Logging Practices

#### MEDIUM: Good Logging Structure
**Severity**: N/A (Positive)
**Files**: `main.py:20-49`

**Observation**: The logging setup is well-designed:
- Configurable log levels
- Both console and file output
- Structured log format with timestamps
- Creates log directory automatically

**Best Practice Example**:
```python
# main.py:21-49
def setup_logging(config: dict):
    log_level = getattr(logging, config['logging']['level'])
    # ... proper handler setup ...
```

---

#### LOW: Missing Context in Some Logs
**Severity**: Low
**Files**: Multiple

**Issue**: Some log messages lack context for debugging:

**Location**: `/workspace/hrv-monitor/src/polar_h10.py:114`
```python
logger.info("Heart rate notifications started")
```

**Recommendation**:
```python
logger.info(f"Heart rate notifications started for {polar_device.name} ({polar_device.address})")
```

---

### Configuration Management

#### MEDIUM: Good YAML Configuration
**Severity**: N/A (Positive)
**Files**: `config/default.yaml`

**Observation**: Configuration management is well done:
- Clear structure with comments
- Reasonable defaults
- Separate sections for different concerns

---

#### HIGH: No Configuration Validation
**Severity**: High
**Files**: `main.py:206-225`

**Location**: `/workspace/hrv-monitor/src/main.py:206-225`
```python
def load_config(config_path: str = "config/default.yaml") -> dict:
    # ... loads config ...
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)
    return config
```

**Issue**:
- No validation of config values
- Missing required keys cause runtime errors later
- Invalid values (negative durations, wrong types) not caught early

**Recommendation**:
```python
from typing import Dict, Any
import sys

def validate_config(config: Dict[str, Any]) -> bool:
    """Validate configuration structure and values."""
    required_sections = ['polar', 'coherence', 'websocket', 'logging']

    for section in required_sections:
        if section not in config:
            logger.error(f"Missing required config section: {section}")
            return False

    # Validate numeric ranges
    if config['coherence']['window_duration'] < 30:
        logger.error("coherence.window_duration must be >= 30 seconds")
        return False

    if config['coherence']['min_beats_required'] < 10:
        logger.error("coherence.min_beats_required must be >= 10")
        return False

    # Validate frequencies
    coherence = config['coherence']
    if coherence['coherence_min_freq'] >= coherence['coherence_max_freq']:
        logger.error("coherence_min_freq must be < coherence_max_freq")
        return False

    return True

def load_config(config_path: str = "config/default.yaml") -> dict:
    # ... existing load logic ...
    config = yaml.safe_load(f)

    if not validate_config(config):
        logger.error("Configuration validation failed")
        sys.exit(1)

    return config
```

---

### Resource Management

#### CRITICAL: WebSocket Server Resource Leak
**Severity**: Critical
**Files**: `websocket_server.py:47-56`

**Location**: `/workspace/hrv-monitor/src/websocket_server.py:47-56`
```python
async def start(self) -> None:
    """Start the WebSocket server."""
    logger.info(f"Starting WebSocket server on ws://{self.host}:{self.port}")

    async with websockets.serve(
        self._handler,
        self.host,
        self.port
    ):
        await asyncio.Future()  # Run forever
```

**Issue**:
- `asyncio.Future()` never resolves, preventing proper cleanup
- When service shuts down, WebSocket server may not close cleanly
- Clients won't receive close frames
- Port may remain bound

**Recommendation**:
```python
def __init__(self, config: dict):
    # ... existing init ...
    self.shutdown_event = asyncio.Event()

async def start(self) -> None:
    """Start the WebSocket server."""
    logger.info(f"Starting WebSocket server on ws://{self.host}:{self.port}")

    async with websockets.serve(
        self._handler,
        self.host,
        self.port
    ):
        await self.shutdown_event.wait()

    logger.info("WebSocket server stopped")

async def stop(self) -> None:
    """Stop the WebSocket server."""
    self.shutdown_event.set()

# In main.py:
finally:
    await self.websocket_server.stop()
    await self.polar_h10.disconnect()
    logger.info("Service stopped")
```

---

#### HIGH: Potential Memory Leak in Buffer Management
**Severity**: High
**Files**: `coherence_calculator.py:52-67`

**Location**: `/workspace/hrv-monitor/src/coherence_calculator.py:52-67`
```python
def add_rr_interval(self, interval_ms: float) -> None:
    now = time.time()
    self.rr_buffer.append(interval_ms)
    self.timestamps.append(now)

    # Remove old data outside the window
    cutoff = now - self.window_duration
    valid_indices = [i for i, t in enumerate(self.timestamps) if t > cutoff]
    self.rr_buffer = [self.rr_buffer[i] for i in valid_indices]
    self.timestamps = [self.timestamps[i] for i in valid_indices]
```

**Issue**:
- Creates new lists on every heartbeat (60-120 times per minute)
- O(n) list comprehensions for cleanup
- At 60 bpm with 60s window, this runs 60x/min with ~60 items
- Could be more efficient with deque

**Recommendation**:
```python
from collections import deque

def __init__(self, config: Dict):
    # ... existing init ...
    self.rr_buffer: deque = deque(maxlen=1000)  # Prevent unbounded growth
    self.timestamps: deque = deque(maxlen=1000)

def add_rr_interval(self, interval_ms: float) -> None:
    now = time.time()
    self.rr_buffer.append(interval_ms)
    self.timestamps.append(now)

    # Remove old data outside the window
    cutoff = now - self.window_duration

    # Remove from left (oldest) while too old
    while self.timestamps and self.timestamps[0] < cutoff:
        self.timestamps.popleft()
        self.rr_buffer.popleft()
```

**Performance Impact**: Reduces O(n) to O(k) where k is number of old entries (typically 0-2).

---

#### MEDIUM: No Connection Cleanup on Exceptions
**Severity**: Medium
**Files**: `polar_h10.py:100-115`

**Location**: `/workspace/hrv-monitor/src/polar_h10.py:100-115`
```python
# Connect to device
self.client = BleakClient(polar_device.address)
await self.client.connect()
self.is_connected = True
self.reconnect_count = 0

logger.info(f"Connected to {polar_device.name}")

# Start notifications
await self.client.start_notify(
    self.HEART_RATE_MEASUREMENT_UUID,
    self._notification_handler
)
```

**Issue**: If `start_notify` fails, the connection remains open but no cleanup occurs.

**Recommendation**:
```python
self.client = BleakClient(polar_device.address)
try:
    await self.client.connect()
    self.is_connected = True
    self.reconnect_count = 0

    logger.info(f"Connected to {polar_device.name}")

    await self.client.start_notify(
        self.HEART_RATE_MEASUREMENT_UUID,
        self._notification_handler
    )
    logger.info("Heart rate notifications started")
except Exception as e:
    # Cleanup on failure
    if self.client and self.client.is_connected:
        await self.client.disconnect()
    self.is_connected = False
    raise
```

---

### Async/Await Patterns

#### HIGH: Fire-and-Forget Task Creation
**Severity**: High
**Files**: `main.py:92`

**Location**: `/workspace/hrv-monitor/src/main.py:92`
```python
asyncio.create_task(self.websocket_server.broadcast_heartbeat(rr_ms))
```

**Issue**:
- Task created without tracking
- Exceptions in the task are silently swallowed
- No way to wait for completion
- Could lead to race conditions on shutdown

**Recommendation**:
```python
class HRVMonitorService:
    def __init__(self, config: dict):
        # ... existing init ...
        self.background_tasks = set()

    def _on_rr_interval(self, rr_ms: float) -> None:
        task = asyncio.create_task(self.websocket_server.broadcast_heartbeat(rr_ms))
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)

        # Handle exceptions
        def handle_exception(task):
            try:
                task.result()
            except Exception as e:
                logger.error(f"Error broadcasting heartbeat: {e}", exc_info=True)

        task.add_done_callback(lambda t: handle_exception(t))
```

---

#### MEDIUM: Potential Race Condition in Calibration
**Severity**: Medium
**Files**: `main.py:111-121`

**Location**: `/workspace/hrv-monitor/src/main.py:111-121`
```python
if self.is_calibrating:
    if self.calibration_start_time is None:
        self.calibration_start_time = asyncio.get_event_loop().time()

    elapsed = asyncio.get_event_loop().time() - self.calibration_start_time
    if elapsed >= self.calibration_duration:
        self.is_calibrating = False
        logger.info("Calibration complete")
```

**Issue**: No locking around state changes. While Python's GIL provides some protection, async code can still have race conditions.

**Recommendation**:
```python
import asyncio

def __init__(self, config: dict):
    # ... existing init ...
    self.calibration_lock = asyncio.Lock()

async def _periodic_coherence_update(self) -> None:
    # ... existing logic ...

    async with self.calibration_lock:
        if self.is_calibrating:
            if self.calibration_start_time is None:
                self.calibration_start_time = asyncio.get_event_loop().time()

            elapsed = asyncio.get_event_loop().time() - self.calibration_start_time
            if elapsed >= self.calibration_duration:
                self.is_calibrating = False
                logger.info("Calibration complete")
```

---

## 3. Code Quality

### Code Duplication

#### MEDIUM: Repeated Status Indicator Logic
**Severity**: Medium
**Files**: `test_client.html`, `coherence-app-polar.js`

**Issue**: Status indicator rendering is duplicated between test client and main visualization.

**Recommendation**: Extract into a shared component:
```javascript
// src/ui/status-indicator.js
export class StatusIndicator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    update(status) {
        // Shared status rendering logic
    }
}
```

---

### Function and Class Design

#### HIGH: God Object Pattern in CoherenceCalculator
**Severity**: High
**Files**: `coherence_calculator.py`

**Issue**: `CoherenceCalculator` handles:
- Buffer management
- Resampling
- FFT computation
- Coherence calculation
- Scoring

This violates Single Responsibility Principle.

**Recommendation**:
```python
# Split into focused classes:

class RRIntervalBuffer:
    """Manages time-windowed RR interval storage."""
    def add(self, interval_ms: float) -> None: ...
    def get_intervals(self) -> List[float]: ...

class SignalProcessor:
    """Handles resampling and detrending."""
    def resample(self, intervals: List[float], rate: float) -> np.ndarray: ...
    def detrend(self, signal: np.ndarray) -> np.ndarray: ...

class FrequencyAnalyzer:
    """Performs FFT and power spectral density analysis."""
    def compute_psd(self, signal: np.ndarray) -> Tuple[np.ndarray, np.ndarray]: ...

class CoherenceScorer:
    """Calculates coherence metrics from PSD."""
    def calculate(self, freqs: np.ndarray, psd: np.ndarray) -> Dict: ...

class CoherenceCalculator:
    """Orchestrates the coherence calculation pipeline."""
    def __init__(self, config):
        self.buffer = RRIntervalBuffer(config)
        self.processor = SignalProcessor(config)
        self.analyzer = FrequencyAnalyzer(config)
        self.scorer = CoherenceScorer(config)
```

---

### Variable Naming and Clarity

#### LOW: Generally Good Naming
**Severity**: N/A (Positive)

**Observations**:
- Clear, descriptive names: `coherence_min_freq`, `peak_window_width`
- Good use of units in names: `interval_ms`, `duration_seconds`
- Consistent naming conventions

**Minor Issues**:
- `rr_ms` could be `rr_interval_ms` for clarity
- `hr_format` could be `heart_rate_format_flag`

---

### Comments and Documentation

#### LOW: Excellent Documentation
**Severity**: N/A (Positive)
**Files**: All Python files

**Observations**:
- Comprehensive module docstrings
- Clear function docstrings with Args/Returns
- Inline comments explain complex logic (especially Bluetooth parsing)
- Algorithm references (HeartMath methodology)

**Example** (`coherence_calculator.py:15-27`):
```python
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
```

This is **exemplary documentation**.

---

### Type Hints and Annotations

#### MEDIUM: Inconsistent Type Hints
**Severity**: Medium
**Files**: Multiple Python files

**Issue**: Type hints are present in function signatures but inconsistent:

**Good Example** (`polar_h10.py:28`):
```python
def __init__(self, config: dict, on_rr_interval: Optional[Callable[[float], None]] = None):
```

**Missing Types** (`websocket_server.py:58`):
```python
async def _handler(self, websocket: WebSocketServerProtocol) -> None:
    # websocket parameter is typed ✓
    # But client_address isn't typed:
    client_address = websocket.remote_address  # tuple[str, int] | None
```

**Recommendation**: Use Python 3.9+ type hints consistently:
```python
from typing import Dict, List, Optional, Tuple

def get_status(self) -> Dict[str, Any]:
    return {
        'connected': self.is_connected,
        'device_name': self.device_name,
        'reconnect_count': self.reconnect_count,
        'client_address': self.client.address if self.client else None
    }
```

---

### Magic Numbers and Hardcoded Values

#### MEDIUM: Some Magic Numbers Present
**Severity**: Medium
**Files**: Multiple

**Issues Found**:

**Location**: `polar_h10.py:58`
```python
devices = await BleakScanner.discover(timeout=10.0)
```
- Hardcoded 10 second timeout

**Location**: `main.py:100`
```python
await asyncio.sleep(5)  # Initial delay for buffer to fill
```
- Magic number 5 seconds

**Location**: `coherence-app-polar.js:200`
```python
heartbeatPulse = Math.max(0, heartbeatPulse - 0.08);
```
- Magic decay rate

**Recommendation**: Move to configuration or constants:
```python
# polar_h10.py
BLUETOOTH_SCAN_TIMEOUT = 10.0  # seconds
NOTIFICATION_RETRY_DELAY = 1.0

# main.py
COHERENCE_BUFFER_WARMUP = 5.0  # seconds

# In config.yaml:
polar:
  scan_timeout: 10.0
  scan_retry_delay: 3.0
```

---

## 4. Testing & Reliability

### Test Coverage

#### CRITICAL: Zero Test Coverage
**Severity**: Critical
**Files**: `/workspace/hrv-monitor/tests/` (empty)

**Issue**: The `tests/` directory exists but contains no tests.

**Impact**:
- No verification of correctness
- Refactoring is risky
- Edge cases not validated
- Regression bugs likely
- Cannot verify coherence algorithm against HeartMath reference

**Recommendation**: Create comprehensive test suite:

```python
# tests/test_coherence_calculator.py
import pytest
import numpy as np
from src.coherence_calculator import CoherenceCalculator

class TestCoherenceCalculator:
    @pytest.fixture
    def config(self):
        return {
            'coherence': {
                'window_duration': 60,
                'min_beats_required': 30,
                'resample_rate': 4,
                'fft_size': 256,
                'coherence_min_freq': 0.04,
                'coherence_max_freq': 0.26,
                'peak_window_width': 0.030,
                'low_coherence_threshold': 0.9,
                'high_coherence_threshold': 7.0
            }
        }

    @pytest.fixture
    def calculator(self, config):
        return CoherenceCalculator(config)

    def test_insufficient_data(self, calculator):
        """Test behavior with insufficient beats."""
        result = calculator.calculate_coherence()
        assert result['status'] == 'insufficient_data'
        assert result['coherence'] == 0

    def test_coherent_breathing_pattern(self, calculator):
        """Test with simulated coherent breathing (0.1 Hz)."""
        # Simulate 60 heartbeats at coherent breathing frequency
        for i in range(60):
            # 0.1 Hz = 10 second period, ~6 breaths/min
            # Simulate RR intervals that vary sinusoidally
            rr = 800 + 100 * np.sin(2 * np.pi * 0.1 * i)
            calculator.add_rr_interval(rr)

        result = calculator.calculate_coherence()
        assert result['status'] == 'valid'
        assert result['coherence'] > 50  # Should show medium-high coherence
        assert 0.08 < result['peak_frequency'] < 0.12  # Near 0.1 Hz

    def test_chaotic_pattern(self, calculator):
        """Test with random, chaotic RR intervals."""
        rng = np.random.RandomState(42)
        for _ in range(60):
            rr = rng.uniform(500, 1200)
            calculator.add_rr_interval(rr)

        result = calculator.calculate_coherence()
        assert result['status'] == 'valid'
        assert result['coherence'] < 40  # Should show low coherence

    def test_buffer_cleanup(self, calculator):
        """Test that old data is removed from buffer."""
        # Add 100 beats
        for _ in range(100):
            calculator.add_rr_interval(800)

        # Sleep longer than window duration
        import time
        time.sleep(61)  # > 60 second window

        # Add one more beat
        calculator.add_rr_interval(800)

        # Buffer should only contain recent beats
        status = calculator.get_buffer_status()
        assert status['beats_in_buffer'] < 5  # Only recent beats

# tests/test_polar_h10.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.polar_h10 import PolarH10

class TestPolarH10:
    @pytest.fixture
    def config(self):
        return {
            'polar': {
                'device_name': 'Polar H10',
                'auto_reconnect': True,
                'reconnect_delay': 5,
                'max_reconnect_attempts': 3
            }
        }

    @pytest.mark.asyncio
    async def test_connection_success(self, config):
        """Test successful connection to Polar H10."""
        callback = MagicMock()
        polar = PolarH10(config, on_rr_interval=callback)

        with patch('src.polar_h10.BleakScanner') as mock_scanner:
            mock_device = MagicMock()
            mock_device.name = 'Polar H10 ABCD1234'
            mock_device.address = '00:11:22:33:44:55'
            mock_scanner.discover = AsyncMock(return_value=[mock_device])

            with patch('src.polar_h10.BleakClient') as mock_client:
                result = await polar.connect()
                assert result is True
                assert polar.is_connected

    def test_notification_parsing(self, config):
        """Test parsing of heart rate notification data."""
        callback = MagicMock()
        polar = PolarH10(config, on_rr_interval=callback)

        # Simulate notification data with RR intervals
        # Flags: 0x16 = RR intervals present (bit 4 set)
        # HR: 75 bpm
        # RR: 800ms = 819 * (1/1024) seconds
        data = bytearray([0x16, 75, 0x33, 0x03])  # 0x0333 = 819

        sender = MagicMock()
        polar._notification_handler(sender, data)

        # Callback should be called with ~800ms
        callback.assert_called_once()
        rr_ms = callback.call_args[0][0]
        assert 790 < rr_ms < 810

# tests/test_websocket_server.py
import pytest
import asyncio
import websockets
import json
from src.websocket_server import CoherenceWebSocketServer

class TestWebSocketServer:
    @pytest.fixture
    def config(self):
        return {
            'websocket': {
                'host': '127.0.0.1',
                'port': 18765,  # Test port
                'cors_origins': []
            }
        }

    @pytest.mark.asyncio
    async def test_broadcast_coherence(self, config):
        """Test broadcasting coherence data to clients."""
        server = CoherenceWebSocketServer(config)

        # Start server in background
        server_task = asyncio.create_task(server.start())
        await asyncio.sleep(0.5)  # Let server start

        try:
            # Connect client
            async with websockets.connect(f'ws://127.0.0.1:18765') as ws:
                # Wait for initial state
                initial = await ws.recv()
                data = json.loads(initial)
                assert data['type'] == 'initial_state'

                # Broadcast coherence
                test_coherence = {
                    'status': 'valid',
                    'coherence': 75,
                    'ratio': 5.2
                }
                await server.broadcast_coherence(test_coherence)

                # Receive broadcast
                message = await ws.recv()
                data = json.loads(message)
                assert data['type'] == 'coherence_update'
                assert data['data']['coherence'] == 75
        finally:
            server_task.cancel()
```

**Priority**: Implement tests for:
1. Coherence calculation correctness
2. Bluetooth connection handling
3. WebSocket message protocol
4. Buffer management
5. Error conditions

---

### Error Handling Robustness

#### HIGH: No Validation of RR Interval Values
**Severity**: High
**Files**: `coherence_calculator.py:52-53`, `polar_h10.py:180-181`

**Location**: `/workspace/hrv-monitor/src/coherence_calculator.py:52-53`
```python
def add_rr_interval(self, interval_ms: float) -> None:
    now = time.time()
    self.rr_buffer.append(interval_ms)
```

**Issue**: No validation of RR interval values:
- Could be negative (parsing error)
- Could be 0 (causes division by zero)
- Could be unrealistic (>3000ms or <200ms)
- Could be NaN or Inf

**Impact**: Invalid data corrupts coherence calculation.

**Recommendation**:
```python
def add_rr_interval(self, interval_ms: float) -> None:
    """
    Add RR interval with validation.

    Physiologically valid RR intervals:
    - Minimum: 200ms (300 bpm, extreme tachycardia)
    - Maximum: 3000ms (20 bpm, extreme bradycardia)
    """
    # Validate input
    if not isinstance(interval_ms, (int, float)):
        logger.warning(f"Invalid RR interval type: {type(interval_ms)}")
        return

    if not (200 <= interval_ms <= 3000):
        logger.warning(f"Out-of-range RR interval: {interval_ms}ms")
        return

    if not np.isfinite(interval_ms):
        logger.warning(f"Non-finite RR interval: {interval_ms}")
        return

    now = time.time()
    self.rr_buffer.append(interval_ms)
    self.timestamps.append(now)

    # ... cleanup logic ...
```

---

### Edge Case Handling

#### MEDIUM: No Handling of Empty PSD
**Severity**: Medium
**Files**: `coherence_calculator.py:115-116`

**Location**: `/workspace/hrv-monitor/src/coherence_calculator.py:115-116`
```python
if len(coherence_psd) == 0:
    return self._insufficient_data_response()
```

**Good**: This check exists.

**Issue**: Doesn't explain WHY it's empty (too short signal, wrong frequency range, etc.)

**Recommendation**:
```python
if len(coherence_psd) == 0:
    logger.warning(
        f"No spectral data in coherence range "
        f"({self.coherence_min_freq}-{self.coherence_max_freq} Hz). "
        f"Signal length: {len(windowed)}, "
        f"Resample rate: {self.resample_rate} Hz"
    )
    return self._insufficient_data_response()
```

---

## 5. Performance & Efficiency

### Potential Bottlenecks

#### MEDIUM: FFT Computation Every 3 Seconds
**Severity**: Medium
**Files**: `coherence_calculator.py:106-108`

**Location**: `/workspace/hrv-monitor/src/coherence_calculator.py:106-108`
```python
fft_vals = rfft(windowed)
freqs = rfftfreq(len(windowed), 1/self.resample_rate)
psd = np.abs(fft_vals) ** 2 / len(windowed)
```

**Analysis**:
- Runs every 3 seconds (default `update_interval`)
- On ~240 samples (60s @ 4Hz)
- FFT is O(n log n) ≈ 1900 operations
- This is **not** a bottleneck for real-time use

**Observation**: Performance is acceptable. No optimization needed.

---

### Resource Leaks

#### See Resource Management section above for:
- WebSocket server leak (CRITICAL)
- Buffer management inefficiency (HIGH)

---

### Inefficient Algorithms

#### LOW: List Comprehensions for Filtering
**Severity**: Low
**Files**: `coherence_calculator.py:65-67`

**Covered in Resource Management section**. Using `deque` would be more efficient.

---

## 6. Security & Safety

### Input Sanitization

#### HIGH: No Sanitization of WebSocket Messages
**Severity**: High
**Files**: `websocket_server.py:102-129`

**Location**: `/workspace/hrv-monitor/src/websocket_server.py:111-129`
```python
async def _handle_message(self, websocket: WebSocketServerProtocol, message: str) -> None:
    try:
        data = json.loads(message)
        msg_type = data.get('type')

        if msg_type == 'ping':
            await websocket.send(json.dumps({'type': 'pong'}))
```

**Issue**:
- No message size limit
- No rate limiting
- No validation of message structure
- Vulnerable to malicious clients

**Attack Vectors**:
- Send massive JSON payload → memory exhaustion
- Rapid ping flood → CPU exhaustion
- Malformed JSON → repeated parsing errors

**Recommendation**:
```python
class CoherenceWebSocketServer:
    MAX_MESSAGE_SIZE = 1024  # bytes
    MAX_MESSAGES_PER_SECOND = 10

    def __init__(self, config: dict):
        # ... existing init ...
        self.client_message_counts: Dict[str, List[float]] = {}

    async def _handler(self, websocket: WebSocketServerProtocol) -> None:
        self.clients.add(websocket)
        client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
        self.client_message_counts[client_id] = []

        try:
            async for message in websocket:
                # Check message size
                if len(message) > self.MAX_MESSAGE_SIZE:
                    logger.warning(f"Oversized message from {client_id}: {len(message)} bytes")
                    await websocket.close(1009, "Message too large")
                    break

                # Rate limiting
                now = time.time()
                self.client_message_counts[client_id].append(now)

                # Remove old timestamps
                self.client_message_counts[client_id] = [
                    t for t in self.client_message_counts[client_id]
                    if now - t < 1.0
                ]

                if len(self.client_message_counts[client_id]) > self.MAX_MESSAGES_PER_SECOND:
                    logger.warning(f"Rate limit exceeded for {client_id}")
                    await websocket.close(1008, "Rate limit exceeded")
                    break

                await self._handle_message(websocket, message)
        finally:
            self.clients.discard(websocket)
            del self.client_message_counts[client_id]
```

---

### Resource Limits

#### MEDIUM: No Limit on Connected Clients
**Severity**: Medium
**Files**: `websocket_server.py:66`

**Location**: `/workspace/hrv-monitor/src/websocket_server.py:66`
```python
self.clients.add(websocket)
```

**Issue**: Unlimited WebSocket connections could exhaust memory/sockets.

**Recommendation**:
```python
MAX_CLIENTS = 10

async def _handler(self, websocket: WebSocketServerProtocol) -> None:
    if len(self.clients) >= self.MAX_CLIENTS:
        logger.warning(f"Max clients ({self.MAX_CLIENTS}) reached, rejecting connection")
        await websocket.close(1008, "Server full")
        return

    self.clients.add(websocket)
    # ... rest of handler ...
```

---

### Potential Vulnerabilities

#### MEDIUM: CORS Origins Not Enforced
**Severity**: Medium
**Files**: `websocket_server.py:34`, `config/default.yaml:43-46`

**Issue**: `cors_origins` is loaded from config but never used.

**Location**: `/workspace/hrv-monitor/src/websocket_server.py:34`
```python
self.cors_origins = config['websocket']['cors_origins']
```

**Impact**: Any website can connect to the WebSocket server.

**Recommendation**:
```python
async def _handler(self, websocket: WebSocketServerProtocol) -> None:
    # Check origin header
    origin = websocket.request_headers.get('Origin')

    if self.cors_origins and origin not in self.cors_origins:
        logger.warning(f"Rejected connection from unauthorized origin: {origin}")
        await websocket.close(1008, "Origin not allowed")
        return

    # ... rest of handler ...
```

---

### Credential Management

#### LOW: No Credentials in Codebase
**Severity**: N/A (Good)

**Observation**: No hardcoded credentials found. Bluetooth pairing is handled at OS level.

---

## 7. HTML/JS/CSS (Coherence Visualization)

### Code Organization (JavaScript)

#### LOW: Excellent Module Organization
**Severity**: N/A (Positive)
**Files**: `/workspace/coherence/src/`

**Observation**: JavaScript code is well-organized with:
- Clear module boundaries
- ES6 imports/exports
- Separation of concerns

**Example** (`polar-h10-client.js:1-16`):
```javascript
/**
 * Polar H10 HRV Monitor WebSocket Client
 * Connects to the HRV Monitor service and maps coherence scores to visualization levels
 *
 * Usage:
 *   import { PolarH10Client } from './integrations/polar-h10-client.js';
 */
export class PolarH10Client {
    // Well-structured class
}
```

---

### Best Practices (JavaScript)

#### MEDIUM: Missing Error Handling in WebSocket Callbacks
**Severity**: Medium
**Files**: `polar-h10-client.js:106-113`

**Location**: `/workspace/coherence/src/integrations/polar-h10-client.js:106-113`
```javascript
this.ws.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        this._handleMessage(message);
    } catch (error) {
        console.error('[Polar H10] Error parsing message:', error);
    }
};
```

**Good**: Try-catch around JSON parsing.

**Issue**: `_handleMessage()` errors aren't caught at this level.

**Recommendation**:
```javascript
this.ws.onmessage = (event) => {
    try {
        const message = JSON.parse(event.data);
        this._handleMessage(message);
    } catch (error) {
        console.error('[Polar H10] Error handling message:', error);
        this.onError({ type: 'message_handler_error', error });
    }
};
```

---

#### LOW: Good Use of Modern JavaScript
**Severity**: N/A (Positive)

**Observations**:
- ES6 classes
- Arrow functions
- Template literals
- Destructuring
- Optional chaining where appropriate

**Example** (`polar-h10-client.js:290-304`):
```javascript
scoreToLevel(score) {
    if (score <= 25) {
        return -1.0 + (score / 25) * 0.5;
    } else if (score <= 40) {
        return -0.5 + ((score - 25) / 15) * 0.5;
    } else if (score <= 60) {
        return 0.0 + ((score - 40) / 20) * 0.5;
    } else {
        return 0.5 + Math.min((score - 60) / 40, 1.0) * 0.5;
    }
}
```

Clean, readable piecewise function.

---

### CSS Structure

#### MEDIUM: Inline Styles in HTML
**Severity**: Medium
**Files**: `test_client.html:7-153`, `index-polar.html:8-106`

**Issue**: Large CSS blocks embedded in HTML `<style>` tags.

**Recommendation**: Extract to separate CSS files:
```html
<!-- test_client.html -->
<head>
    <link rel="stylesheet" href="styles/test-client.css">
</head>
```

**Benefits**:
- Caching
- Easier maintenance
- Potential reuse

---

### Accessibility

#### MEDIUM: Missing Accessibility Features
**Severity**: Medium
**Files**: `test_client.html`, `index-polar.html`

**Issues**:
1. No `alt` text for visual elements
2. No ARIA labels for status indicators
3. No keyboard navigation hints
4. Color-only status indicators (not colorblind friendly)

**Recommendations**:
```html
<!-- Add ARIA labels -->
<span class="status-indicator connected"
      role="status"
      aria-label="WebSocket connected">
</span>

<!-- Add screen reader text -->
<div class="metric">
    <span class="sr-only">Coherence score:</span>
    <span class="metric-value" id="coherenceScore">--</span>
</div>
```

```css
/* Screen reader only text */
.sr-only {
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
}
```

---

## 8. Additional Findings

### Documentation

#### LOW: Excellent Documentation
**Severity**: N/A (Positive)
**Files**: Multiple markdown files

**Observation**: The project includes comprehensive documentation:
- `README.md` - Project overview
- `QUICKSTART.md` - Getting started guide
- `POLAR_H10_INTEGRATION.md` - Integration guide with troubleshooting
- `docs/MAC_SETUP.md` - Platform-specific setup
- `PROJECT_STRUCTURE.md` - Architecture overview

This is **exemplary** for a project of this size.

---

### Configuration

#### MEDIUM: Hardcoded WebSocket URL in Browser Code
**Severity**: Medium
**Files**: `coherence-app-polar.js:85`

**Location**: `/workspace/coherence/src/apps/coherence-app-polar.js:85`
```javascript
const wsUrl = 'ws://localhost:8765';
```

**Issue**: Cannot easily change WebSocket URL without editing code.

**Recommendation**:
```javascript
// Read from query parameter or config
const params = new URLSearchParams(window.location.search);
const wsUrl = params.get('wsUrl') || 'ws://localhost:8765';

console.log(`[Setup] Using WebSocket URL: ${wsUrl}`);
```

Usage: `index-polar.html?wsUrl=ws://192.168.1.100:8765`

---

### Unused Dependencies

#### LOW: Requirements.txt Contains Unused Packages
**Severity**: Low
**Files**: `requirements.txt`

**Issue**: Some packages appear unused:
- `systole>=0.2.3` - Not imported anywhere
- `pyhrv>=0.4.0` - Not imported anywhere
- `aiohttp>=3.8.0` - Not imported anywhere
- `python-dotenv>=0.19.0` - Not imported anywhere

**Recommendation**: Remove unused dependencies or document why they're there:
```python
# requirements.txt
# Core dependencies
numpy>=1.21.0
scipy>=1.7.0
websockets>=10.0
bleak>=0.19.0
pyyaml>=6.0

# Future: For HRV analysis
# systole>=0.2.3
# pyhrv>=0.4.0
```

---

## Summary of Findings by Severity

### Critical (Must Fix)
1. **Missing `__init__.py` files** - Breaks package imports
2. **WebSocket server resource leak** - Server won't shut down cleanly
3. **Zero test coverage** - No verification of correctness
4. **Bare exception catching** - Swallows critical errors

### High (Should Fix Soon)
5. **No configuration validation** - Invalid configs cause runtime errors
6. **Buffer memory inefficiency** - O(n) list operations on every heartbeat
7. **No RR interval validation** - Invalid data corrupts calculations
8. **Bluetooth connection cleanup** - Resources not freed on errors
9. **Fire-and-forget tasks** - Exception silently swallowed
10. **No WebSocket input sanitization** - Vulnerable to DoS attacks

### Medium (Should Address)
11. **Inconsistent type hints** - Reduces IDE support
12. **Magic numbers** - Hardcoded timeouts and thresholds
13. **No client limit on WebSocket** - Unlimited connections
14. **CORS not enforced** - Any origin can connect
15. **CSS in HTML** - Should extract to separate files
16. **Hardcoded WebSocket URL** - Cannot configure without editing code
17. **Missing accessibility** - Screen readers not supported
18. **God object pattern** - CoherenceCalculator does too much

### Low (Nice to Have)
19. **Missing context in logs** - Some logs lack details
20. **Inconsistent module organization** - Flat structure will be unwieldy
21. **Unused dependencies** - Clutters requirements.txt

---

## Recommendations Priority List

**Immediate (Before Production)**:
1. Add `__init__.py` files and fix imports
2. Fix WebSocket server shutdown handling
3. Add input validation (RR intervals, config)
4. Fix resource cleanup in Polar H10 connection
5. Add WebSocket rate limiting and message size checks

**Short Term (Next Sprint)**:
6. Create test suite (at least unit tests for coherence calculation)
7. Replace lists with deque for buffer management
8. Add proper exception handling with specific exception types
9. Track background tasks and handle exceptions
10. Add configuration validation

**Medium Term (Next Release)**:
11. Refactor CoherenceCalculator into focused classes
12. Extract CSS to separate files
13. Add accessibility features
14. Make WebSocket URL configurable
15. Add comprehensive integration tests

**Long Term (Future Enhancements)**:
16. Add metrics/monitoring (Prometheus, Grafana)
17. Add session recording/playback
18. Multi-person coherence tracking
19. CI/CD with automated testing
20. Performance profiling and optimization

---

## Conclusion

This is a **well-architected system** with clean code, excellent documentation, and modern async patterns. The core algorithms appear sound and the integration between components is thoughtful.

However, the **lack of testing and error handling** presents significant risks for production use. The missing `__init__.py` files and resource leaks are critical issues that must be fixed.

With the recommended changes, this would be a production-ready system suitable for real-world HeartMath coherence training and research.

**Estimated Effort to Production-Ready**:
- Critical fixes: 2-3 days
- High priority fixes: 3-5 days
- Basic test coverage: 5-7 days
- **Total**: ~2-3 weeks of focused development

**Overall Code Quality**: B+ (would be A- with tests and critical fixes)

---

**End of Review**
