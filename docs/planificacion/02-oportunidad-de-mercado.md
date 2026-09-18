# 02 — Oportunidad de mercado

Enfoque de producto y diferenciación. **Sin precios ni headcount.**

## 1. Contexto

En Perú conviven OSE/PSE, ERPs con conector, Facturador SUNAT (SFS) e integraciones artesanales que reimplementan el Manual del Programador.

El usuario final no quiere “hablar con SUNAT”: quiere cobrar, anular, trasladar bienes y cerrar el periodo.

## 2. Hueco

Las APIs locales suelen:

- Exponer jerga SUNAT sin modelo de dominio claro.
- Mezclar factura, boleta, resumen y GRE en un solo endpoint opaco.
- Dar poca visibilidad de ticket, CDR y XML.
- Tratar GRE y SIRE como afterthought.
- Fallar en idempotencia y en no quemar correlativos.

## 3. Tesis FACTOSYS

API de **cumplimiento tributario peruano** developer-first:

| Capacidad | v1 | Después |
| --- | --- | --- |
| Emisión 01/03/07/08 | Sí | — |
| RA / RC | Sí | — |
| GRE REST | Sí | Endurecer 31 |
| Consulta validez + artefactos | Sí | — |
| Pre-validación + webhooks | Sí | — |
| Retención / percepción | — | v2 |
| SIRE | — | v2 |

## 4. Diferenciadores (no negociables de producto)

1. JSON canónico estable → UBL interno.
2. Idempotencia real.
3. Pre-validación con reglas oficiales antes del wire.
4. Estados humanos + `sunat_code`.
5. Webhooks de CDR.
6. Multi-RUC con vault de certificados.
7. Sandbox que reproduce rechazos reales.

## 5. Riesgos de mercado/técnicos

| Riesgo | Mitigación |
| --- | --- |
| SUNAT cambia reglas sin semver | Biblioteca versionada + changelog + motor de reglas actualizable |
| SOAP legacy + REST GRE | Dos adapters, un modelo de estados unificado |
| Expectativa de “somos OSE” | Comunicación clara: v1 = SEE contribuyente / API |
| Fuga de SOL/certificados | Diseño de vault desde el día 0 |

## 6. Audiencia primaria v1

Software houses, SaaS verticales y ERPs que necesitan emitir en Perú sin mantener un equipo de UBL interno.

Audiencia secundaria: empresas con sistema propio que hoy usan SFS o scripts frágiles.
