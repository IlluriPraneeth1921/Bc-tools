"""
ICD-D06: Medicaid Provider File interface plugin.

This module registers the ICD-D06 plugin with the interface registry on import.
"""
from src.interfaces.icd_d06.plugin import IcdD06Plugin
from src.interfaces import register

# Register this plugin with the framework
register(IcdD06Plugin())
