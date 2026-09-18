# ADR-003 — Separación `sunat-ubl` / `sunat-sign`

Estado: **Aceptado** (planificación)  
Fecha: 2026-09-17

## Contexto

El builder UBL y la firma XMLDSig podrían vivir en un solo package. El spike de firma es el mayor riesgo técnico y puede forzar cambio de librería (ADR-002).

## Decisión

Dos packages:

| Package | Responsabilidad |
| --- | --- |
| `sunat-ubl` | JSON canónico → XML UBL **sin** firma |
| `sunat-sign` | XML → XML firmado (`SignXmlPort`) |

El empaquetado ZIP puede vivir en `sunat-ubl`, `sunat-soap` o `shared` (decidir en spike C); no acoplar a la lib de firma.

## Consecuencias

- Swap de implementación de firma sin tocar mapeos de diccionario 11.
- Tests de golden XML unsigned estables aunque cambie la firma.
- `apps/api` orquesta: build → sign → zip → send.

## Alternativa descartada

Package único `sunat-xml`: más simple al inicio, más costoso si ADR-002 pivota a sidecar Java.
