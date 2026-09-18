#!/usr/bin/env python3
"""Export SUNAT catalogs to JSON under this directory.

Primary source: reglas-validacion-cpe-*-Catálogos sheet (Anexo N°8 vigente).
Overlays: GRE reglas Catálogos for GRE-specific catalogs (20, 61, 65, D-37).
Seeds: ISO-referenced catalogs 02/03/04 when Anexo only points to external lists.
Cross-check: anexoVII-117-2017.pdf text extraction (baseline RS 117-2017).
"""

from __future__ import annotations

import json
import re
import unicodedata
import zipfile
from datetime import date
from pathlib import Path

import openpyxl
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[4]
SUNAT = ROOT / "docs" / "sunat-oficial"
OUT = Path(__file__).resolve().parent
TODAY = date.today().isoformat()

CPE_XLSX = SUNAT / "04-esquemas-validacion" / "reglas-validacion-cpe-2026-08-26.xlsx"
GRE_XLSX = SUNAT / "04-esquemas-validacion" / "reglas-validacion-gre-2026-06-20.xlsx"
ANEXO_VII_PDF = SUNAT / "01-normativa" / "anexos-117-2017" / "anexoVII-117-2017.pdf"
RS340_ZIP = SUNAT / "01-normativa" / "RS-340-2017-anexos.zip"

SLUGS: dict[str, str] = {
    "01": "document-types",
    "02": "currency",
    "03": "unit-of-measure",
    "04": "country",
    "05": "tax",
    "06": "identity-document",
    "07": "affectation",
    "08": "isc-system",
    "09": "credit-note-type",
    "10": "debit-note-type",
    "11": "summary-sale-value",
    "12": "related-tax-document",
    "13": "ubigeo",
    "14": "other-tax-concepts",
    "15": "additional-elements",
    "16": "price-type",
    "17": "operation-type-ubl20",
    "18": "transport-mode",
    "19": "summary-item-status",
    "20": "transfer-reason",
    "21": "gre-related-document",
    "22": "perception-regime",
    "23": "retention-regime",
    "24": "public-service-tariff",
    "25": "sunat-product",
    "25.1": "sunat-product-25-1",
    "25.2": "sunat-product-25-2",
    "25.3": "sunat-product-25-3",
    "26": "loan-type",
    "27": "first-home-indicator",
    "51": "operation-type",
    "52": "legends",
    "53": "charge-discount",
    "54": "detraction-goods",
    "55": "tax-concept-id",
    "56": "public-service-type",
    "57": "telecom-service-type",
    "58": "electricity-meter-type",
    "59": "payment-means",
    "60": "address-type",
    "61": "transport-related-document",
    "62": "normalized-goods",
    "63": "peru-ports",
    "64": "peru-airports",
    "65": "gre-unit-of-measure",
    "D-37": "special-transport-authorization",
}

EXTERNAL_REF = {
    "02": "ISO 4217 Alpha — Anexo N°8 only references the ISO list (not enumerated).",
    "03": "UN/ECE Recommendation 20 — Anexo N°8 only references the UN/ECE list (not enumerated).",
    "04": "ISO 3166-1 — Anexo N°8 only references the ISO list (not enumerated).",
    "13": "INEI UBIGEO — not embedded in Anexo N°8 / validation XLSX.",
    "25": "UNSPSC / Código Producto SUNAT — full list not embedded in Anexo N°8.",
    "62": "Bienes normalizados — list not embedded in validation XLSX Catálogos sheet.",
}

# Common MVP / fixture seeds when full ISO list is not in SUNAT tables.
SEED_02 = [
    {"code": "PEN", "description": "Sol"},
    {"code": "USD", "description": "US Dollar"},
    {"code": "EUR", "description": "Euro"},
]
SEED_03 = [
    {"code": "NIU", "description": "Número de unidades (units)"},
    {"code": "KGM", "description": "Kilogramo"},
    {"code": "LTR", "description": "Litro"},
    {"code": "MTR", "description": "Metro"},
    {"code": "MTK", "description": "Metro cuadrado"},
    {"code": "MTQ", "description": "Metro cúbico"},
    {"code": "BX", "description": "Caja"},
    {"code": "BG", "description": "Bolsa"},
    {"code": "BO", "description": "Botella"},
    {"code": "BJ", "description": "Balde"},
    {"code": "CT", "description": "Cartón"},
    {"code": "CS", "description": "Caja / case"},
    {"code": "DZN", "description": "Docena"},
    {"code": "ZZ", "description": "Mutuamente definido"},
]
SEED_04 = [
    {"code": "PE", "description": "Perú"},
    {"code": "US", "description": "Estados Unidos"},
    {"code": "CL", "description": "Chile"},
    {"code": "CO", "description": "Colombia"},
    {"code": "EC", "description": "Ecuador"},
    {"code": "BO", "description": "Bolivia"},
    {"code": "BR", "description": "Brasil"},
    {"code": "AR", "description": "Argentina"},
    {"code": "MX", "description": "México"},
    {"code": "ES", "description": "España"},
    {"code": "CN", "description": "China"},
]


def slug_key(header: str) -> str:
    norm = unicodedata.normalize("NFKD", header)
    ascii_h = "".join(c for c in norm if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", ascii_h.lower()).strip("_") or "extra"


def find_catalogs_sheet(wb: openpyxl.Workbook):
    for name in wb.sheetnames:
        if "Retorno" in name:
            continue
        if name.startswith("Cat") or "atalog" in name:
            return wb[name]
    raise KeyError(f"Catálogos sheet not found in {wb.sheetnames}")


def parse_xlsx_catalogs(path: Path) -> dict[str, dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = find_catalogs_sheet(wb)
    catalogs: dict[str, dict] = {}
    current: str | None = None
    state: str | None = None
    extra_headers: list[str] = []

    for row in ws.iter_rows(min_row=1, max_col=8, values_only=True):
        cells = [None if c is None else str(c).replace("\xa0", " ").strip() for c in row]
        a, b = cells[0] or "", cells[1] or ""

        if a == "No." and b:
            num = b.zfill(2) if b.isdigit() else b
            current = num
            catalogs[current] = {
                "name": None,
                "items": [],
                "extra_headers": [],
            }
            state = "expect_name"
            extra_headers = []
            continue

        if current is None:
            continue

        if state == "expect_name" and a.lower().startswith("cat"):
            catalogs[current]["name"] = b or a
            state = "expect_header"
            continue

        if state == "expect_header" and ("digo" in a.lower() or a.lower() == "codigo"):
            extra_headers = [h for h in cells[2:] if h]
            catalogs[current]["extra_headers"] = extra_headers
            state = "codes"
            continue

        if state != "codes":
            continue

        if not a and not b:
            continue
        if "digo" in a.lower() and b and "escrip" in b.lower():
            continue

        if a and b:
            item: dict = {"code": a, "description": re.sub(r"\s+", " ", b).strip()}
            for idx, header in enumerate(extra_headers):
                val = cells[2 + idx] if 2 + idx < len(cells) else None
                if val:
                    key = slug_key(header)
                    item[key] = val
            catalogs[current]["items"].append(item)

    return catalogs


def merge_prefer_longer(base: dict[str, dict], overlay: dict[str, dict], keys: list[str]) -> None:
    for key in keys:
        if key not in overlay:
            continue
        if key not in base or len(overlay[key]["items"]) >= len(base.get(key, {}).get("items", [])):
            base[key] = overlay[key]


def inspect_rs340_zip() -> dict:
    """List ZIP members; anexoVIIa–d are UBL field specs, not code tables."""
    info = {"path": str(RS340_ZIP.relative_to(ROOT)).replace("\\", "/"), "members": [], "note": ""}
    if not RS340_ZIP.exists():
        info["note"] = "ZIP missing"
        return info
    with zipfile.ZipFile(RS340_ZIP) as zf:
        info["members"] = zf.namelist()
    info["note"] = (
        "anexoVIIa-d in RS-340-2017-anexos.zip are Anexo VI field matrices (UBL tags), "
        "not Anexo VII code tables. Code tables come from CPE/GRE validation XLSX + anexoVII-117 PDF."
    )
    return info


def pdf_catalog_index(pdf: Path) -> list[str]:
    if not pdf.exists():
        return []
    text = "\n".join((p.extract_text() or "") for p in PdfReader(str(pdf)).pages)
    found = sorted(
        {int(m) for m in re.findall(r"Cat[aá]logo\s*(?:No\.?|N[°ºo\.]+)?\s*(\d+)", text, re.I)}
    )
    return [str(n).zfill(2) for n in found]


def slug_for(cat: str) -> str:
    return SLUGS.get(cat, re.sub(r"[^a-z0-9]+", "-", cat.lower()).strip("-") or "catalog")


def write_catalog(
    cat: str,
    name: str | None,
    items: list[dict],
    *,
    source: str,
    version: str,
    completeness: str,
    notes: str | None = None,
    extra_meta: dict | None = None,
) -> Path:
    payload = {
        "catalog": cat if not cat.isdigit() else cat.zfill(2) if len(cat) <= 2 else cat,
        "name": name,
        "version": version,
        "source": source,
        "exported_at": TODAY,
        "completeness": completeness,
        "items": items,
    }
    if notes:
        payload["notes"] = notes
    if extra_meta:
        payload.update(extra_meta)
    # Normalize catalog id display
    if cat.isdigit() and len(cat) <= 2:
        payload["catalog"] = cat.zfill(2)
    else:
        payload["catalog"] = cat

    path = OUT / f"{payload['catalog']}-{slug_for(cat)}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> None:
    cpe = parse_xlsx_catalogs(CPE_XLSX)
    gre = parse_xlsx_catalogs(GRE_XLSX)
    merge_prefer_longer(cpe, gre, ["20", "61", "65", "D-37", "55"])

    cpe_source = str(CPE_XLSX.relative_to(ROOT)).replace("\\", "/") + " (sheet Catálogos / Anexo N°8)"
    gre_source = str(GRE_XLSX.relative_to(ROOT)).replace("\\", "/") + " (sheet Catálogos)"
    version = "cpe-2026-08-26+gre-2026-06-20"

    zip_info = inspect_rs340_zip()
    pdf_cats = pdf_catalog_index(ANEXO_VII_PDF)

    written: list[tuple[str, Path, int, str]] = []
    inventory: list[dict] = []

    # Prefer GRE source annotation for GRE-heavy catalogs when overlay applied
    gre_keys = {"20", "61", "65", "D-37"}

    for cat, data in sorted(cpe.items(), key=lambda kv: (len(kv[0]), kv[0])):
        items = data["items"]
        name = data.get("name")
        if cat in gre_keys and cat in gre:
            source = f"{cpe_source}; overlay {gre_source}"
        else:
            source = cpe_source

        if items:
            completeness = "full"
            notes = None
            path = write_catalog(
                cat,
                name,
                items,
                source=source,
                version=version,
                completeness=completeness,
                notes=notes,
            )
            written.append((cat, path, len(items), completeness))
            inventory.append(
                {
                    "file": path.name,
                    "catalog": cat,
                    "completeness": completeness,
                    "items": len(items),
                    "name": name,
                }
            )
            continue

        # Empty tables → seeds or missing external refs
        if cat == "02":
            path = write_catalog(
                cat,
                name or "Código de tipo de monedas",
                SEED_02,
                source=f"{EXTERNAL_REF['02']} Seed for MVP/fixtures.",
                version=version,
                completeness="seed",
                notes="seed-from-fixtures-pending-full-export (ISO 4217 not enumerated in SUNAT tables)",
            )
            written.append((cat, path, len(SEED_02), "seed"))
            inventory.append(
                {"file": path.name, "catalog": cat, "completeness": "seed", "items": len(SEED_02), "name": name}
            )
        elif cat == "03":
            path = write_catalog(
                cat,
                name or "Código de tipo de unidad de medida comercial",
                SEED_03,
                source=f"{EXTERNAL_REF['03']} Seed = common UN/ECE codes used in CPE/GRE fixtures + guides.",
                version=version,
                completeness="seed",
                notes=(
                    "seed-from-fixtures-pending-full-export. "
                    "See also 65-gre-unit-of-measure.json for GRE DAM/DS unit subset."
                ),
            )
            written.append((cat, path, len(SEED_03), "seed"))
            inventory.append(
                {"file": path.name, "catalog": cat, "completeness": "seed", "items": len(SEED_03), "name": name}
            )
        elif cat == "04":
            path = write_catalog(
                cat,
                name or "Código de país",
                SEED_04,
                source=f"{EXTERNAL_REF['04']} Seed for MVP.",
                version=version,
                completeness="seed",
                notes="seed-from-fixtures-pending-full-export (ISO 3166-1 not enumerated in SUNAT tables)",
            )
            written.append((cat, path, len(SEED_04), "seed"))
            inventory.append(
                {"file": path.name, "catalog": cat, "completeness": "seed", "items": len(SEED_04), "name": name}
            )
        else:
            # Write stub with empty items documenting missing external catalog
            path = write_catalog(
                cat,
                name,
                [],
                source=cpe_source,
                version=version,
                completeness="missing",
                notes=EXTERNAL_REF.get(
                    cat,
                    "Referenced by Anexo N°8 / validation workbook but code list not embedded in extractable tables.",
                ),
            )
            written.append((cat, path, 0, "missing"))
            inventory.append(
                {"file": path.name, "catalog": cat, "completeness": "missing", "items": 0, "name": name}
            )

    # Ensure D-37 from GRE if present and not already written
    if "D-37" in gre and not any(c == "D-37" for c, *_ in written):
        data = gre["D-37"]
        path = write_catalog(
            "D-37",
            data.get("name"),
            data["items"],
            source=gre_source,
            version=version,
            completeness="full",
        )
        written.append(("D-37", path, len(data["items"]), "full"))
        inventory.append(
            {
                "file": path.name,
                "catalog": "D-37",
                "completeness": "full",
                "items": len(data["items"]),
                "name": data.get("name"),
            }
        )

    # README
    full = [i for i in inventory if i["completeness"] == "full"]
    seed = [i for i in inventory if i["completeness"] == "seed"]
    missing = [i for i in inventory if i["completeness"] == "missing"]

    def table(rows: list[dict]) -> str:
        lines = ["| Archivo | Cat. | Ítems | Nombre |", "| --- | --- | ---: | --- |"]
        for r in sorted(rows, key=lambda x: (len(str(x["catalog"])), str(x["catalog"]))):
            name = (r.get("name") or "").replace("|", "/")
            lines.append(f"| `{r['file']}` | {r['catalog']} | {r['items']} | {name} |")
        return "\n".join(lines)

    readme = f"""# Catálogos SUNAT — exportados

Artefactos JSON para validación local y diccionarios FACTOSYS.

**Formato:** `NN-slug.json` con `catalog`, `version`, `source`, `completeness`, `items[]` (`code`, `description`, …).

**Exportados:** {TODAY} vía `export_from_sunat.py`.

## Fuentes

| Fuente | Rol |
| --- | --- |
| `{CPE_XLSX.relative_to(ROOT).as_posix()}` hoja Catálogos | **Primaria** — Anexo N°8 vigente embebido en reglas CPE ({version.split('+')[0]}) |
| `{GRE_XLSX.relative_to(ROOT).as_posix()}` hoja Catálogos | Overlay GRE (cat. 20+19, 61, 65, D-37, 55) |
| `{ANEXO_VII_PDF.relative_to(ROOT).as_posix()}` | Baseline RS 117-2017 (índice cat. {', '.join(pdf_cats[:12])}…) |
| `{RS340_ZIP.relative_to(ROOT).as_posix()}` | {zip_info['note']} |

### Contenido de `RS-340-2017-anexos.zip`

```
{chr(10).join(zip_info['members'])}
```

## Inventario

### Completos (tabla SUNAT extractable)

{table(full)}

### Semilla / parcial (ISO u otra lista externa no enumerada en Anexo)

{table(seed)}

### Faltantes (referenciados sin lista embebida)

{table(missing)}

## MVP mínimo cubierto

| Cat. | Archivo | Estado |
| --- | --- | --- |
| 01 | `01-document-types.json` | full |
| 02 | `02-currency.json` | seed (PEN/USD/EUR) |
| 03 | `03-unit-of-measure.json` | seed (+ ver `65-gre-unit-of-measure.json`) |
| 05 | `05-tax.json` | full |
| 06 | `06-identity-document.json` | full |
| 07 | `07-affectation.json` | full |
| 09 | `09-credit-note-type.json` | full |
| 10 | `10-debit-note-type.json` | full |
| 18 | `18-transport-mode.json` | full |
| 20 | `20-transfer-reason.json` | full (GRE overlay incl. 19) |
| 51 | `51-operation-type.json` | full |

## Re-exportar

```bash
python docs/planificacion/artifacts/catalogs/export_from_sunat.py
```

Requiere: `pypdf`, `openpyxl`.
"""
    (OUT / "README.md").write_text(readme, encoding="utf-8")

    summary = {
        "written": len(written),
        "full": len(full),
        "seed": len(seed),
        "missing": len(missing),
        "total_items": sum(i["items"] for i in inventory),
        "files": [(c, p.name, n, st) for c, p, n, st in written],
        "rs340": zip_info,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
