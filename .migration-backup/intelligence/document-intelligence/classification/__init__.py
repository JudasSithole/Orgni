"""Document classification — INVOICE | PROOF_OF_PAYMENT | CONTRACT | UNKNOWN."""

from .classifier import classify, DocumentType

__all__ = ["classify", "DocumentType"]
