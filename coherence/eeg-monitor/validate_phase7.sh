#!/bin/bash
# Phase 7 Validation Script

echo "======================================================"
echo "  Phase 7: Advanced Signal Processing Validation"
echo "======================================================"
echo

echo "1. Syntax Validation"
echo "--------------------"
python3 -m py_compile src/artifact_rejector.py && echo "✓ artifact_rejector.py" || echo "✗ artifact_rejector.py FAILED"
python3 -m py_compile src/adaptive_filter.py && echo "✓ adaptive_filter.py" || echo "✗ adaptive_filter.py FAILED"
python3 -m py_compile src/signal_quality.py && echo "✓ signal_quality.py" || echo "✗ signal_quality.py FAILED"
python3 -m py_compile src/signal_processor.py && echo "✓ signal_processor.py" || echo "✗ signal_processor.py FAILED"
python3 -m py_compile src/integration_manager.py && echo "✓ integration_manager.py" || echo "✗ integration_manager.py FAILED"
echo

echo "2. File Verification"
echo "--------------------"
test -f src/artifact_rejector.py && echo "✓ artifact_rejector.py exists" || echo "✗ artifact_rejector.py missing"
test -f src/adaptive_filter.py && echo "✓ adaptive_filter.py exists" || echo "✗ adaptive_filter.py missing"
test -f src/signal_quality.py && echo "✓ signal_quality.py exists" || echo "✗ signal_quality.py missing"
test -f tests/test_artifact_rejector.py && echo "✓ test_artifact_rejector.py exists" || echo "✗ test_artifact_rejector.py missing"
test -f tests/test_adaptive_filter.py && echo "✓ test_adaptive_filter.py exists" || echo "✗ test_adaptive_filter.py missing"
test -f tests/test_signal_quality_assessor.py && echo "✓ test_signal_quality_assessor.py exists" || echo "✗ test_signal_quality_assessor.py missing"
echo

echo "3. Configuration Validation"
echo "---------------------------"
grep -q "use_advanced_processing" config/default.yaml && echo "✓ Advanced processing config present" || echo "✗ Config missing"
grep -q "adaptive_filtering" config/default.yaml && echo "✓ Adaptive filtering config present" || echo "✗ Config missing"
grep -q "quality_assessment" config/default.yaml && echo "✓ Quality assessment config present" || echo "✗ Config missing"
echo

echo "4. Line Counts"
echo "--------------"
echo "artifact_rejector.py: $(wc -l < src/artifact_rejector.py) lines"
echo "adaptive_filter.py:   $(wc -l < src/adaptive_filter.py) lines"
echo "signal_quality.py:    $(wc -l < src/signal_quality.py) lines"
echo "Total new code:       $(( $(wc -l < src/artifact_rejector.py) + $(wc -l < src/adaptive_filter.py) + $(wc -l < src/signal_quality.py) )) lines"
echo

echo "======================================================"
echo "  Phase 7 Validation Complete"
echo "======================================================"
echo
echo "Status: Ready for Testing with Muse 2"
echo
