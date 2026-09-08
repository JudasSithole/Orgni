"""Canonical entry point for Orgni Document Intelligence.

The imported implementation is loaded from the preserved migration source while
the service is being maintained at this stable workspace path.
"""
from pathlib import Path
import sys

_WORKSPACE = Path(__file__).resolve().parents[3]
_IMPORTED = _WORKSPACE / ".migration-backup" / "intelligence" / "document-intelligence"
sys.path.insert(0, str(_IMPORTED))
_SOURCE = _IMPORTED / "envelope" / "builder.py"
exec(compile(_SOURCE.read_text(), str(_SOURCE), "exec"), globals())