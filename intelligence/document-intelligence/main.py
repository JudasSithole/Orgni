"""Stable runtime launcher for the imported Orgni Document Intelligence API."""
from pathlib import Path
import sys

_ROOT = Path(__file__).resolve().parent
_IMPORTED = _ROOT.parents[1] / ".migration-backup" / "intelligence" / "document-intelligence"
sys.path.insert(0, str(_IMPORTED))
_SOURCE = _IMPORTED / "main.py"
exec(compile(_SOURCE.read_text(), str(_SOURCE), "exec"), globals())