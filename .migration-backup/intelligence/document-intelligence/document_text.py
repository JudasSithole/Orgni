"""Text extraction for common office and text document formats."""

from __future__ import annotations

import re
import zipfile
from io import BytesIO
from xml.etree import ElementTree


def _xml_text(data: bytes, tags: set[str]) -> str:
    root = ElementTree.fromstring(data)
    values: list[str] = []
    for element in root.iter():
        if element.tag.rsplit("}", 1)[-1] in tags and element.text:
            values.append(element.text)
    return " ".join(values)


def _archive_parts(contents: bytes, prefix: str, suffix: str = ".xml") -> list[bytes]:
    with zipfile.ZipFile(BytesIO(contents)) as archive:
        names = sorted(
            name
            for name in archive.namelist()
            if name.startswith(prefix) and name.endswith(suffix)
        )
        return [archive.read(name) for name in names]


def _extract_docx(contents: bytes) -> str:
    parts = _archive_parts(contents, "word/document")
    if not parts:
        raise ValueError("Word document has no readable document body")
    return "\n".join(_xml_text(part, {"t"}) for part in parts)


def _extract_pptx(contents: bytes) -> str:
    parts = _archive_parts(contents, "ppt/slides/slide")
    if not parts:
        raise ValueError("PowerPoint file has no readable slides")
    return "\n".join(_xml_text(part, {"t"}) for part in parts)


def _extract_xlsx(contents: bytes) -> str:
    with zipfile.ZipFile(BytesIO(contents)) as archive:
        shared: list[str] = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root:
                shared.append(
                    " ".join(
                        node.text or ""
                        for node in item.iter()
                        if node.tag.rsplit("}", 1)[-1] == "t"
                    )
                )

        rows: list[str] = []
        sheet_names = sorted(
            name
            for name in archive.namelist()
            if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        )
        for sheet_name in sheet_names:
            root = ElementTree.fromstring(archive.read(sheet_name))
            for row in root.iter():
                if row.tag.rsplit("}", 1)[-1] != "row":
                    continue
                cells: list[str] = []
                for cell in row:
                    if cell.tag.rsplit("}", 1)[-1] != "c":
                        continue
                    value = next(
                        (
                            node.text or ""
                            for node in cell.iter()
                            if node.tag.rsplit("}", 1)[-1] in {"v", "t"}
                        ),
                        "",
                    )
                    if cell.attrib.get("t") == "s" and value.isdigit():
                        index = int(value)
                        value = shared[index] if index < len(shared) else value
                    cells.append(value)
                if cells:
                    rows.append("\t".join(cells))
        return "\n".join(rows)


def _extract_rtf(contents: bytes) -> str:
    text = contents.decode("utf-8", errors="replace")
    text = re.sub(r"\\'[0-9a-fA-F]{2}", " ", text)
    text = re.sub(r"\\[a-zA-Z]+-?\d* ?", " ", text)
    text = text.replace("{", " ").replace("}", " ")
    return re.sub(r"\s+", " ", text).strip()


def extract_document_text(contents: bytes, extension: str) -> str:
    """Return readable text from a supported non-PDF document."""
    extension = extension.lower()
    if extension == ".docx":
        return _extract_docx(contents)
    if extension == ".pptx":
        return _extract_pptx(contents)
    if extension == ".xlsx":
        return _extract_xlsx(contents)
    if extension == ".rtf":
        return _extract_rtf(contents)
    return contents.decode("utf-8", errors="replace")
