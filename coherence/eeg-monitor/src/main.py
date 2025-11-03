#!/usr/bin/env python3
"""
Main Entry Point for EEG Neurofeedback Monitor

Starts the EEG monitoring system with Muse 2 headset integration.

Usage:
    python src/main.py [options]

Examples:
    # Start with default config and alpha enhancement
    python src/main.py

    # Start with specific protocol
    python src/main.py --protocol theta_beta_ratio

    # Start with debug logging
    python src/main.py --debug

    # Start with custom config
    python src/main.py --config config/custom.yaml
"""

import asyncio
import argparse
import logging
import signal
import sys
from pathlib import Path
from typing import Optional

import yaml

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from integration_manager import IntegrationManager


# Global reference for signal handlers
manager: Optional[IntegrationManager] = None


def setup_logging(debug: bool = False) -> None:
    """
    Configure logging for the application.

    Args:
        debug: If True, set DEBUG level, otherwise INFO
    """
    level = logging.DEBUG if debug else logging.INFO

    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    simple_formatter = logging.Formatter(
        '%(levelname)s: %(message)s'
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(simple_formatter if not debug else detailed_formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.addHandler(console_handler)

    # Quiet some noisy loggers
    logging.getLogger('websockets').setLevel(logging.WARNING)
    logging.getLogger('asyncio').setLevel(logging.WARNING)


def load_config(config_path: str) -> dict:
    """
    Load configuration from YAML file.

    Args:
        config_path: Path to YAML config file

    Returns:
        Configuration dictionary

    Raises:
        FileNotFoundError: If config file doesn't exist
        yaml.YAMLError: If config file is invalid
    """
    config_file = Path(config_path)

    if not config_file.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    try:
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
        return config
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML in config file: {e}")


def print_banner(config: dict) -> None:
    """
    Print startup banner with configuration info.

    Args:
        config: Configuration dictionary
    """
    protocol_name = config.get('protocols', {}).get('default', 'alpha_enhancement')
    ws_port = config.get('websocket', {}).get('port', 8766)

    banner = f"""
╔════════════════════════════════════════════════════════════════╗
║                  EEG Neurofeedback Monitor                     ║
║                   Muse 2 Integration System                    ║
╚════════════════════════════════════════════════════════════════╝

Configuration:
  Protocol:        {protocol_name}
  WebSocket:       ws://localhost:{ws_port}
  Sample Rate:     256 Hz
  Update Interval: 1.0s

Prerequisites:
  1. Muse 2 headset powered on and nearby
  2. muselsl stream running in another terminal:
     $ muselsl stream

Next Steps:
  1. Open browser to connect to WebSocket
  2. Follow baseline calibration prompts (if required)
  3. Begin neurofeedback training session

Press Ctrl+C to stop gracefully.
"""
    print(banner)


def handle_sigint(sig, frame) -> None:
    """
    Handle SIGINT (Ctrl+C) for graceful shutdown.

    Args:
        sig: Signal number
        frame: Current stack frame
    """
    global manager

    print("\n\nShutdown signal received (Ctrl+C)...")
    print("Stopping EEG monitor gracefully...")

    if manager:
        # Schedule stop on event loop
        asyncio.create_task(manager.stop())


async def async_main(args: argparse.Namespace) -> int:
    """
    Async main function.

    Args:
        args: Parsed command-line arguments

    Returns:
        Exit code (0 for success, 1 for error)
    """
    global manager

    try:
        # Load configuration
        print(f"Loading configuration from: {args.config}")
        config = load_config(args.config)

        # Override protocol if specified
        if args.protocol:
            config.setdefault('protocols', {})['default'] = args.protocol
            print(f"Using protocol: {args.protocol}")

        # Print banner
        if not args.quiet:
            print_banner(config)

        # Create integration manager
        manager = IntegrationManager(config)

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, handle_sigint)
        signal.signal(signal.SIGTERM, handle_sigint)

        # Start the system
        print("Starting EEG monitor...\n")
        await manager.start()

        # If we get here, manager stopped normally
        print("\nEEG monitor stopped")
        return 0

    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    except ValueError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        return 1

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        if manager:
            await manager.stop()
        return 0

    except Exception as e:
        print(f"Fatal error: {e}", file=sys.stderr)
        logging.exception("Unhandled exception in main")
        return 1


def main() -> int:
    """
    Main entry point (synchronous wrapper).

    Returns:
        Exit code
    """
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description='EEG Neurofeedback Monitor with Muse 2 Integration',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s
  %(prog)s --protocol alpha_enhancement
  %(prog)s --protocol theta_beta_ratio --debug
  %(prog)s --config config/custom.yaml

Available Protocols:
  - alpha_enhancement:  Increase alpha waves for relaxation
  - theta_beta_ratio:   Reduce theta/beta for focus (ADHD)
  - alpha_asymmetry:    Balance hemispheres for mood
  - theta_enhancement:  Increase theta for deep meditation
  - beta_enhancement:   Increase beta for alertness

For more information, see docs/WEBSOCKET_API.md
        """
    )

    parser.add_argument(
        '--config',
        type=str,
        default='config/default.yaml',
        help='Path to configuration file (default: config/default.yaml)'
    )

    parser.add_argument(
        '--protocol',
        type=str,
        choices=[
            'alpha_enhancement',
            'theta_beta_ratio',
            'alpha_asymmetry',
            'theta_enhancement',
            'beta_enhancement'
        ],
        help='Neurofeedback protocol to use (overrides config)'
    )

    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug logging'
    )

    parser.add_argument(
        '--quiet',
        action='store_true',
        help='Suppress banner and info messages'
    )

    parser.add_argument(
        '--version',
        action='version',
        version='EEG Monitor v0.1.0 (Phase 5)'
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(debug=args.debug)

    # Run async main
    try:
        return asyncio.run(async_main(args))
    except KeyboardInterrupt:
        print("\n\nInterrupted")
        return 130


if __name__ == '__main__':
    sys.exit(main())
