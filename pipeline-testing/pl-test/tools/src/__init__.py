"""
Test Data Generator Tool.

Takes a YAML/JSON interface specification and generates:
1. Test data files (in any text format: pipe-delimited, fixed-width, CSV, etc.)
2. SQL insert/cleanup scripts for all 4 pipeline stages

The specification YAML is the standard input format — authored by humans or AI
from reading an interface spec document.
"""
