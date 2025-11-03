"""
Protocol Factory for Creating Neurofeedback Protocol Instances

This module provides a factory pattern for creating protocol instances from
configuration. It maintains a registry of all available protocols and provides
methods for protocol discovery and instantiation.
"""

from typing import Dict, List, Optional, Type
import logging

from .base import NeurofeedbackProtocol
from .alpha_enhancement import AlphaEnhancement
from .theta_beta_ratio import ThetaBetaRatio
from .alpha_asymmetry import AlphaAsymmetry
from .theta_enhancement import ThetaEnhancement
from .beta_enhancement import BetaEnhancement


logger = logging.getLogger(__name__)


class ProtocolFactory:
    """
    Factory for creating neurofeedback protocol instances.

    The factory maintains a registry of all available protocols and provides
    methods for protocol creation, discovery, and metadata retrieval.

    Example:
        >>> # Create protocol from name
        >>> protocol = ProtocolFactory.create('alpha_enhancement', {'thresholds': {...}})
        >>>
        >>> # List all available protocols
        >>> protocols = ProtocolFactory.list_protocols()
        >>> print(protocols)  # ['alpha_enhancement', 'theta_beta_ratio', ...]
        >>>
        >>> # Get protocol metadata
        >>> info = ProtocolFactory.get_protocol_info('alpha_enhancement')
        >>> print(info['description'])
    """

    # Registry mapping protocol names to protocol classes
    _registry: Dict[str, Type[NeurofeedbackProtocol]] = {
        'alpha_enhancement': AlphaEnhancement,
        'theta_beta_ratio': ThetaBetaRatio,
        'alpha_asymmetry': AlphaAsymmetry,
        'theta_enhancement': ThetaEnhancement,
        'beta_enhancement': BetaEnhancement
    }

    @classmethod
    def create(cls, protocol_name: str, config: Optional[Dict] = None) -> NeurofeedbackProtocol:
        """
        Create a protocol instance from its name.

        Args:
            protocol_name: Name of the protocol to create. Must be one of:
                - 'alpha_enhancement': Alpha Enhancement Protocol
                - 'theta_beta_ratio': Theta/Beta Ratio Protocol
                - 'alpha_asymmetry': Alpha Asymmetry Protocol
                - 'theta_enhancement': Theta Enhancement Protocol
                - 'beta_enhancement': Beta Enhancement Protocol
            config: Protocol-specific configuration dictionary. If None,
                   an empty dict will be used.

        Returns:
            Instance of the requested protocol.

        Raises:
            ValueError: If protocol_name is not in the registry.

        Example:
            >>> config = {
            ...     'thresholds': {
            ...         'low': 30,
            ...         'medium': 50,
            ...         'good': 70,
            ...         'excellent': 85
            ...     }
            ... }
            >>> protocol = ProtocolFactory.create('alpha_enhancement', config)
            >>> print(protocol.name)  # "Alpha Enhancement"
        """
        if protocol_name not in cls._registry:
            available = ', '.join(cls._registry.keys())
            raise ValueError(
                f"Unknown protocol: '{protocol_name}'. "
                f"Available protocols: {available}"
            )

        protocol_class = cls._registry[protocol_name]

        # Use empty config if none provided
        if config is None:
            config = {}

        try:
            protocol = protocol_class(config)
            logger.info(f"Created protocol: {protocol.name}")
            return protocol
        except Exception as e:
            logger.error(f"Error creating protocol '{protocol_name}': {e}", exc_info=True)
            raise

    @classmethod
    def list_protocols(cls) -> List[str]:
        """
        Get list of all available protocol names.

        Returns:
            List of protocol name strings that can be passed to create().

        Example:
            >>> protocols = ProtocolFactory.list_protocols()
            >>> print(protocols)
            ['alpha_enhancement', 'theta_beta_ratio', 'alpha_asymmetry',
             'theta_enhancement', 'beta_enhancement']
        """
        return list(cls._registry.keys())

    @classmethod
    def get_protocol_info(cls, protocol_name: str) -> Optional[Dict]:
        """
        Get metadata about a protocol without instantiating it.

        Args:
            protocol_name: Name of the protocol to query

        Returns:
            Dictionary containing protocol metadata:
                {
                    'name': str,              # Human-readable name
                    'description': str,       # Protocol description
                    'frequency_bands': dict,  # Bands used by protocol
                    'class_name': str         # Python class name
                }
            Returns None if protocol not found.

        Example:
            >>> info = ProtocolFactory.get_protocol_info('alpha_enhancement')
            >>> print(info['name'])  # "Alpha Enhancement"
            >>> print(info['frequency_bands'])  # {'alpha': (8, 13)}
        """
        if protocol_name not in cls._registry:
            logger.warning(f"Protocol not found: {protocol_name}")
            return None

        protocol_class = cls._registry[protocol_name]

        try:
            # Create temporary instance to get properties
            # Use minimal config to avoid validation issues
            temp_instance = protocol_class({})

            return {
                'name': temp_instance.name,
                'description': temp_instance.description,
                'frequency_bands': temp_instance.frequency_bands,
                'class_name': protocol_class.__name__
            }
        except Exception as e:
            logger.error(f"Error getting info for protocol '{protocol_name}': {e}")
            return None

    @classmethod
    def get_all_protocol_info(cls) -> Dict[str, Dict]:
        """
        Get metadata for all available protocols.

        Returns:
            Dictionary mapping protocol names to their info dicts.

        Example:
            >>> all_info = ProtocolFactory.get_all_protocol_info()
            >>> for name, info in all_info.items():
            ...     print(f"{name}: {info['description']}")
        """
        result = {}

        for protocol_name in cls.list_protocols():
            info = cls.get_protocol_info(protocol_name)
            if info:
                result[protocol_name] = info

        return result

    @classmethod
    def register_protocol(cls, name: str, protocol_class: Type[NeurofeedbackProtocol]) -> None:
        """
        Register a new protocol with the factory.

        This allows external protocols to be added to the factory at runtime.
        Useful for plugins or custom protocol development.

        Args:
            name: Name to register the protocol under
            protocol_class: Class implementing NeurofeedbackProtocol

        Raises:
            ValueError: If name is already registered or protocol_class is invalid

        Example:
            >>> class CustomProtocol(NeurofeedbackProtocol):
            ...     # ... implementation ...
            >>>
            >>> ProtocolFactory.register_protocol('custom', CustomProtocol)
            >>> protocol = ProtocolFactory.create('custom', {})
        """
        # Validate name
        if not isinstance(name, str) or not name:
            raise ValueError("Protocol name must be a non-empty string")

        if name in cls._registry:
            raise ValueError(f"Protocol '{name}' is already registered")

        # Validate protocol_class
        if not isinstance(protocol_class, type):
            raise ValueError("protocol_class must be a class")

        if not issubclass(protocol_class, NeurofeedbackProtocol):
            raise ValueError(
                f"protocol_class must inherit from NeurofeedbackProtocol, "
                f"got {protocol_class.__name__}"
            )

        # Register the protocol
        cls._registry[name] = protocol_class
        logger.info(f"Registered new protocol: {name} ({protocol_class.__name__})")

    @classmethod
    def unregister_protocol(cls, name: str) -> None:
        """
        Unregister a protocol from the factory.

        Args:
            name: Name of the protocol to unregister

        Raises:
            ValueError: If protocol is not registered

        Example:
            >>> ProtocolFactory.unregister_protocol('custom')
        """
        if name not in cls._registry:
            raise ValueError(f"Protocol '{name}' is not registered")

        del cls._registry[name]
        logger.info(f"Unregistered protocol: {name}")

    @classmethod
    def is_registered(cls, name: str) -> bool:
        """
        Check if a protocol is registered.

        Args:
            name: Protocol name to check

        Returns:
            True if protocol is registered, False otherwise

        Example:
            >>> if ProtocolFactory.is_registered('alpha_enhancement'):
            ...     protocol = ProtocolFactory.create('alpha_enhancement', {})
        """
        return name in cls._registry
