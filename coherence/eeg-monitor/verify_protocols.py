#!/usr/bin/env python3
"""
Manual Verification Script for Protocol Plugin System
Verifies that all protocols are correctly implemented without pytest
"""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

def test_imports():
    """Test that all modules import correctly."""
    print("Testing imports...")

    try:
        from protocols.base import NeurofeedbackProtocol
        print("  ✓ Base protocol")

        from protocols.alpha_enhancement import AlphaEnhancement
        print("  ✓ Alpha Enhancement")

        from protocols.theta_beta_ratio import ThetaBetaRatio
        print("  ✓ Theta/Beta Ratio")

        from protocols.alpha_asymmetry import AlphaAsymmetry
        print("  ✓ Alpha Asymmetry")

        from protocols.theta_enhancement import ThetaEnhancement
        print("  ✓ Theta Enhancement")

        from protocols.beta_enhancement import BetaEnhancement
        print("  ✓ Beta Enhancement")

        from protocols.factory import ProtocolFactory
        print("  ✓ Protocol Factory")

        from protocol_calculator import ProtocolCalculator
        print("  ✓ Protocol Calculator")

        return True
    except Exception as e:
        print(f"  ✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_factory():
    """Test protocol factory."""
    print("\nTesting Protocol Factory...")

    try:
        from protocols.factory import ProtocolFactory

        # List protocols
        protocols = ProtocolFactory.list_protocols()
        print(f"  ✓ Listed {len(protocols)} protocols: {protocols}")

        assert len(protocols) == 5, f"Expected 5 protocols, got {len(protocols)}"
        assert 'alpha_enhancement' in protocols
        assert 'theta_beta_ratio' in protocols
        assert 'alpha_asymmetry' in protocols
        assert 'theta_enhancement' in protocols
        assert 'beta_enhancement' in protocols
        print("  ✓ All 5 protocols registered")

        # Create each protocol
        for name in protocols:
            protocol = ProtocolFactory.create(name, {})
            print(f"  ✓ Created {protocol.name}")

        return True
    except Exception as e:
        print(f"  ✗ Factory test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_protocol_metadata():
    """Test protocol metadata."""
    print("\nTesting Protocol Metadata...")

    try:
        from protocols.factory import ProtocolFactory

        expected_metadata = {
            'alpha_enhancement': {
                'name': 'Alpha Enhancement',
                'bands': ['alpha']
            },
            'theta_beta_ratio': {
                'name': 'Theta/Beta Ratio',
                'bands': ['theta', 'beta']
            },
            'alpha_asymmetry': {
                'name': 'Alpha Asymmetry',
                'bands': ['alpha']
            },
            'theta_enhancement': {
                'name': 'Theta Enhancement',
                'bands': ['theta']
            },
            'beta_enhancement': {
                'name': 'Beta Enhancement',
                'bands': ['beta']
            }
        }

        for protocol_name, expected in expected_metadata.items():
            info = ProtocolFactory.get_protocol_info(protocol_name)
            assert info is not None, f"No info for {protocol_name}"
            assert info['name'] == expected['name'], f"Name mismatch for {protocol_name}"

            # Check bands
            for band in expected['bands']:
                assert band in info['frequency_bands'], f"Missing band {band} in {protocol_name}"

            print(f"  ✓ {info['name']}: {info['frequency_bands']}")

        return True
    except Exception as e:
        print(f"  ✗ Metadata test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_protocol_directions():
    """Test that protocols have correct scoring directions."""
    print("\nTesting Protocol Scoring Directions...")

    try:
        from protocols.factory import ProtocolFactory

        # Create sample data
        sample_data = {
            'delta': 20.0,
            'theta': 15.0,
            'alpha': 25.0,
            'beta': 18.0,
            'gamma': 8.0,
            'channels': {
                'TP9': {'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0},
                'AF7': {'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0},
                'AF8': {'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0},
                'TP10': {'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0}
            }
        }

        expected_directions = {
            'alpha_enhancement': 'higher',
            'theta_beta_ratio': 'lower',  # INVERSE scoring!
            'alpha_asymmetry': 'balanced',
            'theta_enhancement': 'higher',
            'beta_enhancement': 'higher'
        }

        for protocol_name, expected_direction in expected_directions.items():
            protocol = ProtocolFactory.create(protocol_name, {})
            metrics = protocol.calculate_metrics(sample_data)

            actual_direction = metrics['direction']
            assert actual_direction == expected_direction, \
                f"{protocol.name}: Expected direction '{expected_direction}', got '{actual_direction}'"

            print(f"  ✓ {protocol.name}: direction='{actual_direction}', score={metrics['score']:.1f}")

        return True
    except Exception as e:
        print(f"  ✗ Direction test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_inverse_scoring():
    """Test that theta/beta ratio uses INVERSE scoring."""
    print("\nTesting Theta/Beta INVERSE Scoring...")

    try:
        from protocols.factory import ProtocolFactory

        # Create high ratio data (poor focus)
        high_ratio_data = {
            'delta': 20.0,
            'theta': 30.0,  # High theta
            'alpha': 25.0,
            'beta': 10.0,   # Low beta -> ratio = 3.0
            'gamma': 8.0,
            'channels': {
                'TP9': {'theta': 30.0, 'beta': 10.0},
                'AF7': {'theta': 30.0, 'beta': 10.0},
                'AF8': {'theta': 30.0, 'beta': 10.0},
                'TP10': {'theta': 30.0, 'beta': 10.0}
            }
        }

        # Create low ratio data (good focus)
        low_ratio_data = {
            'delta': 20.0,
            'theta': 12.0,  # Low theta
            'alpha': 25.0,
            'beta': 30.0,   # High beta -> ratio = 0.4
            'gamma': 8.0,
            'channels': {
                'TP9': {'theta': 12.0, 'beta': 30.0},
                'AF7': {'theta': 12.0, 'beta': 30.0},
                'AF8': {'theta': 12.0, 'beta': 30.0},
                'TP10': {'theta': 12.0, 'beta': 30.0}
            }
        }

        protocol = ProtocolFactory.create('theta_beta_ratio', {})

        high_ratio_metrics = protocol.calculate_metrics(high_ratio_data)
        low_ratio_metrics = protocol.calculate_metrics(low_ratio_data)

        high_ratio = high_ratio_metrics['details']['ratio']
        low_ratio = low_ratio_metrics['details']['ratio']

        high_ratio_score = high_ratio_metrics['score']
        low_ratio_score = low_ratio_metrics['score']

        print(f"  High ratio ({high_ratio:.2f}): score={high_ratio_score:.1f} (should be LOW)")
        print(f"  Low ratio ({low_ratio:.2f}): score={low_ratio_score:.1f} (should be HIGH)")

        # Verify INVERSE scoring
        assert high_ratio > low_ratio, "High ratio should be numerically higher"
        assert high_ratio_score < low_ratio_score, \
            f"INVERSE SCORING BROKEN: High ratio ({high_ratio:.2f}) scored {high_ratio_score:.1f}, " \
            f"but low ratio ({low_ratio:.2f}) scored {low_ratio_score:.1f}. Lower ratio should score HIGHER!"

        print("  ✓ INVERSE scoring verified: Lower ratio = Higher score")

        return True
    except Exception as e:
        print(f"  ✗ Inverse scoring test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_calculator():
    """Test Protocol Calculator."""
    print("\nTesting Protocol Calculator...")

    try:
        from protocols.factory import ProtocolFactory
        from protocol_calculator import ProtocolCalculator

        # Create calculator
        protocol = ProtocolFactory.create('alpha_enhancement', {})
        calculator = ProtocolCalculator(protocol)
        print(f"  ✓ Created calculator with {protocol.name}")

        # Test calculation
        sample_data = {
            'delta': 20.0, 'theta': 15.0, 'alpha': 25.0, 'beta': 18.0, 'gamma': 8.0,
            'channels': {
                'TP9': {'alpha': 25.0}, 'AF7': {'alpha': 25.0},
                'AF8': {'alpha': 25.0}, 'TP10': {'alpha': 25.0}
            }
        }

        metrics = calculator.calculate(sample_data)
        assert 'score' in metrics
        assert 'protocol' in metrics
        assert metrics['protocol'] == 'Alpha Enhancement'
        print(f"  ✓ Calculated metrics: score={metrics['score']:.1f}")

        # Test protocol switching
        calculator.switch_protocol_by_name('theta_beta_ratio', {})
        assert calculator.protocol.name == 'Theta/Beta Ratio'
        print(f"  ✓ Switched to {calculator.protocol.name}")

        return True
    except Exception as e:
        print(f"  ✗ Calculator test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all verification tests."""
    print("=" * 60)
    print("PROTOCOL PLUGIN SYSTEM VERIFICATION")
    print("=" * 60)

    tests = [
        ("Imports", test_imports),
        ("Factory", test_factory),
        ("Metadata", test_protocol_metadata),
        ("Directions", test_protocol_directions),
        ("Inverse Scoring", test_inverse_scoring),
        ("Calculator", test_calculator)
    ]

    results = []
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\nUnexpected error in {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))

    print("\n" + "=" * 60)
    print("VERIFICATION SUMMARY")
    print("=" * 60)

    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status}: {name}")

    total = len(results)
    passed = sum(1 for _, p in results if p)

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n✓ All verification tests PASSED!")
        print("Phase 4 implementation is complete and working correctly.")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) FAILED")
        return 1


if __name__ == '__main__':
    sys.exit(main())
