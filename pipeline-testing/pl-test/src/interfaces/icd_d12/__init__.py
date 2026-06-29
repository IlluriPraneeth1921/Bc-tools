"""
ICD-D12: FSIA (Functional Screen / Initial Assessment) File interface plugin.

This module registers the ICD-D12 plugin with the interface registry on import.
"""
from src.interfaces.icd_d12.plugin import IcdD12Plugin
from src.interfaces import register

# Register this plugin with the framework
register(IcdD12Plugin())
