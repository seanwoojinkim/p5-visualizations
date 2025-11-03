"""
Performance Benchmarking Tests for SignalProcessor
Measures processing latency, memory usage, and accuracy
"""

import pytest
import numpy as np
import time
import tracemalloc
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from signal_processor import SignalProcessor


# Test configuration
TEST_CONFIG = {
    'sample_rate': 256,
    'window_duration': 2.0,
    'window_overlap': 0.5,
    'frequency_bands': {
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
        'frequency': 60,
        'quality_factor': 30
    }
}


def generate_sine_wave(frequency: float, duration: float, sample_rate: int,
                       amplitude: float = 10.0) -> np.ndarray:
    """Generate synthetic sine wave."""
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return amplitude * np.sin(2 * np.pi * frequency * t)


class TestProcessingLatency:
    """Benchmark processing latency for different window sizes."""

    def test_latency_1s_window(self):
        """Benchmark processing latency for 1-second window."""
        config = TEST_CONFIG.copy()
        config['window_duration'] = 1.0
        processor = SignalProcessor(config)

        # Generate test signal
        signal = generate_sine_wave(10.0, 1.0, 256, 20.0)

        # Add to all channels
        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        # Warm-up run
        processor.calculate_band_powers()

        # Benchmark runs
        latencies = []
        for _ in range(100):
            start = time.perf_counter()
            powers = processor.calculate_band_powers()
            end = time.perf_counter()

            assert powers is not None
            latencies.append((end - start) * 1000)  # Convert to ms

        mean_latency = np.mean(latencies)
        max_latency = np.max(latencies)
        p95_latency = np.percentile(latencies, 95)

        print(f"\n1s Window Latency:")
        print(f"  Mean: {mean_latency:.2f} ms")
        print(f"  Max: {max_latency:.2f} ms")
        print(f"  P95: {p95_latency:.2f} ms")

        # Success criteria: < 50ms
        assert mean_latency < 50, f"Mean latency {mean_latency:.2f}ms exceeds 50ms target"
        assert p95_latency < 50, f"P95 latency {p95_latency:.2f}ms exceeds 50ms target"

    def test_latency_2s_window(self):
        """Benchmark processing latency for 2-second window."""
        processor = SignalProcessor(TEST_CONFIG)

        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        # Warm-up
        processor.calculate_band_powers()

        # Benchmark
        latencies = []
        for _ in range(100):
            start = time.perf_counter()
            powers = processor.calculate_band_powers()
            end = time.perf_counter()

            assert powers is not None
            latencies.append((end - start) * 1000)

        mean_latency = np.mean(latencies)
        max_latency = np.max(latencies)
        p95_latency = np.percentile(latencies, 95)

        print(f"\n2s Window Latency:")
        print(f"  Mean: {mean_latency:.2f} ms")
        print(f"  Max: {max_latency:.2f} ms")
        print(f"  P95: {p95_latency:.2f} ms")

        assert mean_latency < 50, f"Mean latency {mean_latency:.2f}ms exceeds 50ms target"
        assert p95_latency < 50, f"P95 latency {p95_latency:.2f}ms exceeds 50ms target"

    def test_latency_4s_window(self):
        """Benchmark processing latency for 4-second window."""
        config = TEST_CONFIG.copy()
        config['window_duration'] = 4.0
        processor = SignalProcessor(config)

        signal = generate_sine_wave(10.0, 4.0, 256, 20.0)

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        # Warm-up
        processor.calculate_band_powers()

        # Benchmark
        latencies = []
        for _ in range(50):  # Fewer iterations for longer window
            start = time.perf_counter()
            powers = processor.calculate_band_powers()
            end = time.perf_counter()

            assert powers is not None
            latencies.append((end - start) * 1000)

        mean_latency = np.mean(latencies)
        max_latency = np.max(latencies)

        print(f"\n4s Window Latency:")
        print(f"  Mean: {mean_latency:.2f} ms")
        print(f"  Max: {max_latency:.2f} ms")

        # 4s window can be slightly slower, but still reasonable
        assert mean_latency < 100, f"Mean latency {mean_latency:.2f}ms exceeds 100ms"

    def test_add_samples_latency(self):
        """Benchmark latency of adding samples."""
        processor = SignalProcessor(TEST_CONFIG)

        samples = [1.0] * 100  # Typical batch size

        # Benchmark
        latencies = []
        for _ in range(1000):
            start = time.perf_counter()
            processor.add_samples('TP9', samples)
            end = time.perf_counter()

            latencies.append((end - start) * 1000)

        mean_latency = np.mean(latencies)
        max_latency = np.max(latencies)

        print(f"\nAdd Samples Latency (100 samples):")
        print(f"  Mean: {mean_latency:.3f} ms")
        print(f"  Max: {max_latency:.3f} ms")

        # Should be very fast (< 1ms)
        assert mean_latency < 1.0, f"Add samples too slow: {mean_latency:.3f}ms"


class TestMemoryUsage:
    """Benchmark memory usage and stability."""

    def test_memory_usage_baseline(self):
        """Measure baseline memory usage of SignalProcessor."""
        tracemalloc.start()

        processor = SignalProcessor(TEST_CONFIG)

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        print(f"\nBaseline Memory Usage:")
        print(f"  Current: {current / 1024:.2f} KB")
        print(f"  Peak: {peak / 1024:.2f} KB")

        # Should be reasonable (< 1 MB for initialization)
        assert peak < 1024 * 1024, f"Initialization uses too much memory: {peak / 1024:.2f} KB"

    def test_memory_usage_with_data(self):
        """Measure memory usage with full buffers."""
        processor = SignalProcessor(TEST_CONFIG)

        tracemalloc.start()

        # Fill all buffers
        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)
        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        print(f"\nMemory Usage with Full Buffers:")
        print(f"  Current: {current / 1024:.2f} KB")
        print(f"  Peak: {peak / 1024:.2f} KB")

        # Should still be reasonable (< 2 MB)
        assert peak < 2 * 1024 * 1024, f"Full buffers use too much memory: {peak / 1024:.2f} KB"

    def test_memory_stability_1_hour_simulation(self):
        """Test memory stability over 1-hour simulated runtime."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate signal
        signal = generate_sine_wave(10.0, 2.0, 256, 20.0)

        # Fill initial buffers
        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        tracemalloc.start()
        initial_memory = tracemalloc.get_traced_memory()[0]

        # Simulate 1 hour: 3600 seconds / 2 second window = 1800 iterations
        # Use fewer iterations for faster test
        iterations = 360  # 10 minutes simulation

        for i in range(iterations):
            # Add new samples (simulating streaming)
            batch = signal[:256].tolist()  # 1 second of data
            for channel in processor.channel_names:
                processor.add_samples(channel, batch)

            # Calculate powers
            powers = processor.calculate_band_powers()
            assert powers is not None

            # Check memory every 36 iterations (~1 minute of simulation)
            if i % 36 == 0:
                current = tracemalloc.get_traced_memory()[0]
                growth = current - initial_memory

                # Memory should not grow significantly
                # Allow 10% growth for normal fluctuations
                max_allowed_growth = initial_memory * 0.1
                assert growth < max_allowed_growth, \
                    f"Memory leak detected: {growth / 1024:.2f} KB growth at iteration {i}"

        final_memory = tracemalloc.get_traced_memory()[0]
        tracemalloc.stop()

        growth = final_memory - initial_memory
        growth_percent = (growth / initial_memory) * 100

        print(f"\nMemory Stability (10min simulation):")
        print(f"  Initial: {initial_memory / 1024:.2f} KB")
        print(f"  Final: {final_memory / 1024:.2f} KB")
        print(f"  Growth: {growth / 1024:.2f} KB ({growth_percent:.1f}%)")

        # Memory should be stable (< 10% growth)
        assert growth_percent < 10, f"Memory not stable: {growth_percent:.1f}% growth"


class TestAccuracy:
    """Test band power calculation accuracy against ground truth."""

    def test_alpha_power_accuracy(self):
        """Test accuracy of alpha power calculation."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate pure 10 Hz sine wave with known amplitude
        amplitude = 20.0  # µV
        signal = generate_sine_wave(10.0, 2.0, 256, amplitude)

        for channel in processor.channel_names:
            processor.add_samples(channel, signal.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None

        # For a pure sine wave, RMS = amplitude / sqrt(2)
        # Power = RMS^2 = amplitude^2 / 2
        theoretical_power = (amplitude ** 2) / 2

        # Alpha should be dominant
        assert powers['alpha'] > powers['theta']
        assert powers['alpha'] > powers['beta']

        # Check that alpha power is reasonable (within order of magnitude)
        # Exact match is difficult due to windowing and filtering
        assert powers['alpha'] > 0.1 * theoretical_power
        assert powers['alpha'] < 10 * theoretical_power

    def test_multi_band_accuracy(self):
        """Test accuracy with multiple frequency components."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate signal with known frequency components
        alpha_signal = generate_sine_wave(10.0, 2.0, 256, 20.0)  # Alpha
        beta_signal = generate_sine_wave(20.0, 2.0, 256, 10.0)   # Beta
        combined = alpha_signal + beta_signal

        for channel in processor.channel_names:
            processor.add_samples(channel, combined.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None

        # Alpha should be stronger (2x amplitude)
        assert powers['alpha'] > powers['beta']

        # Other bands should be minimal
        assert powers['alpha'] > powers['theta'] * 5
        assert powers['alpha'] > powers['delta'] * 5
        assert powers['beta'] > powers['theta'] * 5

    def test_power_ratio_accuracy(self):
        """Test accuracy of power ratios between bands."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate two signals with 2:1 amplitude ratio
        freq1 = 10.0  # Alpha
        freq2 = 20.0  # Beta
        amp1 = 20.0
        amp2 = 10.0   # Half amplitude

        signal1 = generate_sine_wave(freq1, 2.0, 256, amp1)
        signal2 = generate_sine_wave(freq2, 2.0, 256, amp2)
        combined = signal1 + signal2

        for channel in processor.channel_names:
            processor.add_samples(channel, combined.tolist())

        powers = processor.calculate_band_powers()

        assert powers is not None

        # Power ratio should be approximately (amp1/amp2)^2 = 4
        # Allow for filter effects and windowing (2-6 range)
        ratio = powers['alpha'] / powers['beta']
        print(f"\nPower Ratio (Alpha/Beta): {ratio:.2f}")
        print(f"  Expected: ~4.0 (from 2:1 amplitude ratio)")
        print(f"  Actual Alpha: {powers['alpha']:.2f}")
        print(f"  Actual Beta: {powers['beta']:.2f}")

        # Check ratio is in reasonable range
        assert 2.0 < ratio < 6.0, f"Power ratio {ratio:.2f} outside expected range [2, 6]"


class TestThroughput:
    """Test data throughput capabilities."""

    def test_samples_per_second_throughput(self):
        """Test how many samples per second can be processed."""
        processor = SignalProcessor(TEST_CONFIG)

        # Generate 10 seconds of data
        signal = generate_sine_wave(10.0, 10.0, 256, 20.0)

        # Fill buffers initially
        for channel in processor.channel_names:
            processor.add_samples(channel, signal[:512].tolist())

        # Measure throughput
        start_time = time.time()
        samples_processed = 0

        # Process 1000 batches of 256 samples (1 second each)
        for i in range(1000):
            batch = signal[:256].tolist()
            for channel in processor.channel_names:
                processor.add_samples(channel, batch)
                samples_processed += 256

            # Calculate powers every 10 batches
            if i % 10 == 0:
                powers = processor.calculate_band_powers()
                assert powers is not None

        elapsed = time.time() - start_time

        # Calculate throughput
        # 4 channels × samples_processed / elapsed
        total_samples = 4 * samples_processed
        throughput = total_samples / elapsed

        print(f"\nThroughput Test:")
        print(f"  Total samples: {total_samples:,}")
        print(f"  Time: {elapsed:.2f} seconds")
        print(f"  Throughput: {throughput:,.0f} samples/second")
        print(f"  Required (4 channels × 256 Hz): {4 * 256:,} samples/second")

        # Should handle real-time processing easily
        # Required: 4 channels × 256 Hz = 1024 samples/second
        required_throughput = 4 * 256
        assert throughput > required_throughput * 10, \
            f"Throughput {throughput:.0f} too low (need {required_throughput * 10:.0f} for 10x headroom)"


class TestScalability:
    """Test scalability with different configurations."""

    def test_scalability_different_window_sizes(self):
        """Test performance across different window sizes."""
        window_sizes = [1.0, 2.0, 4.0, 8.0]
        results = []

        for window_duration in window_sizes:
            config = TEST_CONFIG.copy()
            config['window_duration'] = window_duration
            processor = SignalProcessor(config)

            # Generate signal
            signal = generate_sine_wave(10.0, window_duration, 256, 20.0)

            for channel in processor.channel_names:
                processor.add_samples(channel, signal.tolist())

            # Benchmark
            latencies = []
            for _ in range(20):
                start = time.perf_counter()
                powers = processor.calculate_band_powers()
                end = time.perf_counter()

                assert powers is not None
                latencies.append((end - start) * 1000)

            mean_latency = np.mean(latencies)
            results.append((window_duration, mean_latency))

        print(f"\nScalability - Window Size vs Latency:")
        for duration, latency in results:
            print(f"  {duration:.1f}s window: {latency:.2f} ms")

        # Verify all meet requirements
        for duration, latency in results:
            if duration <= 2.0:
                assert latency < 50, f"{duration}s window latency {latency:.2f}ms exceeds 50ms"


def run_all_benchmarks():
    """Run all performance benchmarks and print summary."""
    print("=" * 70)
    print("SignalProcessor Performance Benchmarks")
    print("=" * 70)

    pytest.main([__file__, '-v', '-s', '--tb=short'])


if __name__ == '__main__':
    run_all_benchmarks()
