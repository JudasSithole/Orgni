"""
Orgni Docs Integration Tests — Full pipeline end-to-end.
Run from odi_pipeline/: python tests/test_pipeline.py
"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extraction.extractor import extract
from validation.engine import validate
from integrity.trust_scorer import score


CLEAN_INVOICE_PAGES = [{
    "page": 1,
    "text": """ABC Logistics (Pty) Ltd
VAT Reg No: 4560123789
Invoice No: INV-2024-0081
Invoice Date: 15/03/2024
Due Date: 15/04/2024
Bill To:
XYZ Manufacturing CC
Subtotal:    R13,043.48
VAT (15%):   R1,956.52
Total Due:   R15,000.00"""
}]

CORRUPTED_PAGES = [{
    "page": 1,
    "text": """ABC Logistics (Pty) Ltd
Invoice No: INV-2024-0081
Subtotal:  R13,043.48
VAT (15%): R1,956.52
Total Due: R1,500.00"""
}]


def print_section(title: str):
    print(f"\n{'='*55}\n  {title}\n{'='*55}")


def test_clean_pipeline():
    print_section("Clean Invoice — Full Pipeline")

    ext = extract("doc_clean", CLEAN_INVOICE_PAGES)
    print(f"  [Extraction] completeness: {ext['completeness_score']}")
    print(f"  [Extraction] fields: {list(ext['extracted_fields'].keys())}")
    print(f"  [Extraction] dates: date={ext['extracted_fields'].get('date')}, due_date={ext['extracted_fields'].get('due_date')}")

    val = validate("doc_clean", ext["extracted_fields"])
    print(f"  [Validation] passed: {val['passed']}, score: {val['integrity_score']}")

    trust = score("doc_clean", extraction_data=ext, validation_data=val)
    print(f"  [Trust]      score: {trust['trust_score']}, verdict: {trust['verdict']}")

    assert val["passed"], f"Clean invoice should pass validation: {val['issues']}"
    assert trust["verdict"] in ("APPROVED", "REVIEW")
    assert ext["extracted_fields"].get("date") == "2024-03-15"
    assert ext["extracted_fields"].get("due_date") == "2024-04-15"
    assert ext["extracted_fields"].get("invoice_total") == 15000.0
    print("  ✓ Clean pipeline passed")


def test_corrupted_pipeline():
    print_section("Corrupted Invoice — Expect BLOCKED")

    ext = extract("doc_corrupt", CORRUPTED_PAGES)
    val = validate("doc_corrupt", ext["extracted_fields"])
    trust = score("doc_corrupt", extraction_data=ext, validation_data=val)

    print(f"  [Extraction] invoice_total: {ext['extracted_fields'].get('invoice_total')}")
    print(f"  [Validation] passed: {val['passed']}, issues: {[i['rule'] for i in val['issues']]}")
    print(f"  [Trust]      score: {trust['trust_score']}, verdict: {trust['verdict']}")

    assert not val["passed"], "Corrupted invoice should fail validation"
    assert "math_subtotal_plus_vat" in [i["rule"] for i in val["issues"]]
    assert trust["verdict"] in ("REVIEW", "BLOCKED")
    print("  ✓ Corrupted pipeline correctly flagged")


def test_json_output():
    print_section("JSON Output Schema")
    ext = extract("doc_json", CLEAN_INVOICE_PAGES)
    val = validate("doc_json", ext["extracted_fields"])
    trust = score("doc_json", extraction_data=ext, validation_data=val)

    output = {
        "extraction": ext,
        "validation": val,
        "trust": trust,
    }
    print(json.dumps(trust, indent=2))

    assert "trust_score" in trust
    assert "verdict" in trust
    assert "score_breakdown" in trust
    assert "risk_factors" in trust
    print("  ✓ JSON schema valid")


if __name__ == "__main__":
    test_clean_pipeline()
    test_corrupted_pipeline()
    test_json_output()
    print("\n\n✓ All Orgni Docs pipeline integration tests passed")
