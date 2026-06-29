"""
Interface Plugin Registry.

Provides registration and lookup of interface plugins.
Each interface type (e.g., icd_d06) registers itself here on import.
"""
from typing import Dict, List
from src.interfaces.base import InterfacePlugin


_registry: Dict[str, InterfacePlugin] = {}


def register(plugin: InterfacePlugin) -> None:
    """Register an interface plugin with the framework."""
    if plugin.interface_type in _registry:
        raise ValueError(f"Interface type '{plugin.interface_type}' is already registered.")
    _registry[plugin.interface_type] = plugin


def get_interface(interface_type: str) -> InterfacePlugin:
    """
    Get a registered interface plugin by its type code.

    Raises:
        KeyError: If the interface type is not registered.
    """
    if interface_type not in _registry:
        available = ", ".join(_registry.keys()) or "(none)"
        raise KeyError(
            f"Unknown interface type: '{interface_type}'. Available: {available}"
        )
    return _registry[interface_type]


def list_interfaces() -> List[InterfacePlugin]:
    """Return all registered interface plugins."""
    return list(_registry.values())


def list_interface_types() -> List[str]:
    """Return all registered interface type codes."""
    return list(_registry.keys())


# ─── Explicit plugin imports (each registers itself on import) ───────────────
import src.interfaces.icd_d06  # noqa: F401, E402
import src.interfaces.icd_d12  # noqa: F401, E402
