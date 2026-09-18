# ADR-002 — Librería de firma XMLDSig / XAdES

Estado: **Propuesto** (pendiente spike)  
Fecha: 2026-09-17

## Contexto

Todo CPE y GRE requiere XML firmado (XMLDSig, política SUNAT). La elección de librería condiciona el monorepo (`packages/sunat-ubl` + signing).

## Criterios de éxito del spike

1. Firmar Invoice UBL 2.1 mínimo con `.pfx` de prueba.
2. Validar firma con herramienta oficial / SFS / validador equivalente.
3. Empaquetar ZIP `{RUC}-{tipo}-{serie}-{n}.zip` y obtener CDR en beta (ideal) o al menos pasar validación local.
4. API estable en Node 20+; mantenida; sin dependencia nativa frágil si es posible.

## Candidatos a evaluar (orden de prueba)

| # | Opción | Notas |
| --- | --- | --- |
| A | `xml-crypto` + `@xmldom/xmldom` | Madura en Node; control fino de Reference/Transforms |
| B | Wrapper sobre OpenSSL / `node-forge` + construcción manual SignedInfo | Más trabajo; útil si A falla en C14N |
| C | Llamada a proceso Java (Apache Santuario) vía CLI | Escape hatch; no preferido en v1 por ops |

## Decisión provisional

Preferir **A** si el spike lo confirma. No congelar en package.json hasta CDR o validación SFS en verde.

## Consecuencias

- Spike es el **primer ticket** del monorepo junto con builder Invoice mínimo.
- Certificados solo en vault/env; nunca en fixtures git.
- Misma librería para Invoice/NC/ND/RA/RC/GRE (un solo `SignXmlPort`).

## Relacionado

- Plan de ejecución del spike: [24-plan-spikes-emision.md](../24-plan-spikes-emision.md) §A
- Stack: `06-stack-tecnologico.md` §4
- Separación packages: [ADR-003](003-separacion-ubl-sign.md)
- Correlativos post-firma: [ADR-001](001-correlativos-ante-fallos.md)
