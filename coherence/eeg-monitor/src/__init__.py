"""
EEG Neurofeedback Monitor
Multi-protocol EEG neurofeedback system for Muse 2 headset
"""

__version__ = "0.1.0"

# Export main components
from .signal_processor import SignalProcessor
from .protocol_calculator import ProtocolCalculator

# Export all protocols
from .protocols import (
    NeurofeedbackProtocol,
    AlphaEnhancement,
    ThetaBetaRatio,
    AlphaAsymmetry,
    ThetaEnhancement,
    BetaEnhancement,
    ProtocolFactory
)

__all__ = [
    'SignalProcessor',
    'ProtocolCalculator',
    'NeurofeedbackProtocol',
    'AlphaEnhancement',
    'ThetaBetaRatio',
    'AlphaAsymmetry',
    'ThetaEnhancement',
    'BetaEnhancement',
    'ProtocolFactory'
]
