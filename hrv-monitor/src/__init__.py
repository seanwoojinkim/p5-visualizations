"""
Polar H10 HRV Monitor Package

This package provides real-time heart rate variability (HRV) monitoring
and HeartMath coherence calculation for the Polar H10 heart rate monitor.
"""

__version__ = "0.1.0"

from .polar_h10 import PolarH10
from .coherence_calculator import CoherenceCalculator
from .websocket_server import CoherenceWebSocketServer

__all__ = ['PolarH10', 'CoherenceCalculator', 'CoherenceWebSocketServer']
