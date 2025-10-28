"""
Polar H10 Heart Rate Monitor Interface
Connects to Polar H10 via Bluetooth LE and streams RR intervals
"""

import asyncio
import logging
from typing import Callable, Optional
from bleak import BleakClient, BleakScanner
from bleak.backends.characteristic import BleakGATTCharacteristic


logger = logging.getLogger(__name__)


class PolarH10:
    """
    Interface for Polar H10 heart rate monitor.

    Connects via Bluetooth LE and streams RR interval data
    using the standard Heart Rate Service (UUID: 0x180D).
    """

    # Bluetooth LE Heart Rate Service UUIDs
    HEART_RATE_SERVICE_UUID = "0000180d-0000-1000-8000-00805f9b34fb"
    HEART_RATE_MEASUREMENT_UUID = "00002a37-0000-1000-8000-00805f9b34fb"

    def __init__(self, config: dict, on_rr_interval: Optional[Callable[[float], None]] = None):
        """
        Initialize Polar H10 connection.

        Args:
            config: Configuration dictionary
            on_rr_interval: Callback function called with each RR interval (ms)
        """
        self.config = config
        self.device_name = config['polar']['device_name']
        self.auto_reconnect = config['polar']['auto_reconnect']
        self.reconnect_delay = config['polar']['reconnect_delay']
        self.max_reconnect_attempts = config['polar']['max_reconnect_attempts']

        self.on_rr_interval = on_rr_interval
        self.client: Optional[BleakClient] = None
        self.is_connected = False
        self.reconnect_count = 0

    async def connect(self) -> bool:
        """
        Scan for and connect to Polar H10 device.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            logger.info(f"Scanning for {self.device_name}...")

            # Scan for devices
            devices = await BleakScanner.discover(timeout=10.0)

            # Find Polar H10
            polar_device = None
            for device in devices:
                if device.name and self.device_name.lower() in device.name.lower():
                    polar_device = device
                    break

            if not polar_device:
                import platform
                is_mac = platform.system() == 'Darwin'

                error_msg = f"{self.device_name} not found during BLE scan."

                if is_mac:
                    error_msg += (
                        f"\n\nIMPORTANT: The Polar H10 will NOT appear in macOS System Settings → Bluetooth."
                        f"\nThis is normal for BLE devices. The app scans for it directly."
                        f"\n\nTroubleshooting checklist:"
                        f"\n  1. Is the H10 WORN? (Must have skin contact to power on)"
                        f"\n  2. Are electrodes moistened?"
                        f"\n  3. Is it connected to another device (iPhone/iPad)?"
                        f"\n     → Disconnect/forget it in that device's Bluetooth settings"
                        f"\n  4. Is Bluetooth enabled on this Mac?"
                        f"\n  5. Try: Download 'LightBlue' app to verify H10 is discoverable"
                    )
                else:
                    error_msg += (
                        f"\n\nMake sure:"
                        f"\n  1. Device is powered on (LED flashing)"
                        f"\n  2. Electrodes are moistened and making skin contact"
                        f"\n  3. Not connected to another device"
                        f"\n  4. Bluetooth is enabled"
                        f"\n  5. Device is in range (within 10 meters)"
                    )

                logger.error(error_msg)
                return False

            logger.info(f"Found {polar_device.name} at {polar_device.address}")

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

            logger.info("Heart rate notifications started")
            return True

        except asyncio.TimeoutError:
            logger.error("Bluetooth scan timeout - device not found")
            self.is_connected = False
            return False
        except Exception as e:
            # Catch other unexpected errors but log with more context
            logger.error(f"Unexpected connection error: {e}", exc_info=True)
            self.is_connected = False
            return False

    async def disconnect(self) -> None:
        """Disconnect from Polar H10."""
        if self.client and self.is_connected:
            try:
                await self.client.stop_notify(self.HEART_RATE_MEASUREMENT_UUID)
                await self.client.disconnect()
                logger.info("Disconnected from Polar H10")
            except (OSError, asyncio.TimeoutError) as e:
                # Expected errors during disconnect (device already disconnected, timeout)
                logger.warning(f"Disconnect warning: {e}")
            except Exception as e:
                # Unexpected errors
                logger.error(f"Unexpected disconnect error: {e}", exc_info=True)
            finally:
                self.is_connected = False

    def _notification_handler(self, sender: BleakGATTCharacteristic, data: bytearray) -> None:
        """
        Handle heart rate measurement notifications.

        Heart Rate Measurement format (Bluetooth spec):
        - Byte 0: Flags
            - Bit 0: Heart Rate Value Format (0 = uint8, 1 = uint16)
            - Bit 3-4: RR-Interval present (1 if present)
        - Bytes 1-2: Heart Rate Value
        - Bytes 3+: RR-Intervals (if present)

        Args:
            sender: GATT characteristic that sent the notification
            data: Raw notification data
        """
        try:
            flags = data[0]

            # Check if RR intervals are present (bit 4)
            rr_present = (flags & 0x10) != 0

            if not rr_present:
                return

            # Determine heart rate value size
            hr_format = flags & 0x01
            if hr_format == 0:
                # uint8 heart rate
                hr_offset = 2
            else:
                # uint16 heart rate
                hr_offset = 3

            # Parse RR intervals
            # Each RR interval is 2 bytes (uint16) with 1/1024 second resolution
            rr_data = data[hr_offset:]
            rr_count = len(rr_data) // 2

            for i in range(rr_count):
                # Extract 16-bit RR value (little-endian)
                rr_value = int.from_bytes(rr_data[i*2:(i*2)+2], byteorder='little')

                # Convert from 1/1024 second to milliseconds
                rr_ms = (rr_value / 1024.0) * 1000.0

                # Validate RR interval before calling callback
                # Physiologically valid range: 300-2000ms (20-200 bpm)
                if self.on_rr_interval and self._is_valid_rr_interval(rr_ms):
                    self.on_rr_interval(rr_ms)

        except (IndexError, ValueError) as e:
            # Expected parsing errors from malformed data
            logger.warning(f"Error parsing heart rate data (malformed packet): {e}")
        except Exception as e:
            # Unexpected errors - log with full traceback
            logger.error(f"Unexpected error parsing heart rate data: {e}", exc_info=True)

    async def maintain_connection(self) -> None:
        """
        Maintain connection with auto-reconnect.

        Monitors connection status and attempts to reconnect if disconnected.
        """
        while True:
            if not self.is_connected and self.auto_reconnect:
                if self.reconnect_count < self.max_reconnect_attempts:
                    self.reconnect_count += 1
                    logger.info(f"Attempting to reconnect ({self.reconnect_count}/{self.max_reconnect_attempts})...")
                    await self.connect()
                    if self.is_connected:
                        logger.info("Reconnection successful")
                    else:
                        await asyncio.sleep(self.reconnect_delay)
                else:
                    logger.error(f"Max reconnect attempts ({self.max_reconnect_attempts}) reached")
                    break

            await asyncio.sleep(1)

    def _is_valid_rr_interval(self, rr_ms: float) -> bool:
        """
        Validate RR interval value.

        Checks if the RR interval is physiologically plausible.
        Valid range: 300-2000ms (corresponding to 30-200 bpm)

        Args:
            rr_ms: RR interval in milliseconds

        Returns:
            True if valid, False otherwise
        """
        # Check for valid number
        if not isinstance(rr_ms, (int, float)):
            logger.warning(f"Invalid RR interval type: {type(rr_ms)}")
            return False

        # Check for finite value
        if not (rr_ms == rr_ms):  # NaN check
            logger.warning("RR interval is NaN")
            return False

        # Physiological range check
        # Lower bound: 300ms = 200 bpm (extreme tachycardia)
        # Upper bound: 2000ms = 30 bpm (extreme bradycardia)
        if not (300 <= rr_ms <= 2000):
            logger.warning(f"Out-of-range RR interval: {rr_ms:.1f}ms (valid range: 300-2000ms)")
            return False

        return True

    def get_status(self) -> dict:
        """
        Get connection status.

        Returns:
            Dictionary with connection information
        """
        return {
            'connected': self.is_connected,
            'device_name': self.device_name,
            'reconnect_count': self.reconnect_count,
            'client_address': self.client.address if self.client else None
        }
