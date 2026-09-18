# 31 — CI quality gates (resumen)

Gates de validación SUNAT en CI. Detalle XSD/Excel/XSL: [29](29-plan-gate-xsd-xsl.md). Sandbox / WSDL: [22](22-sandbox-setup.md) + [artifacts/sunat-endpoints.md](artifacts/sunat-endpoints.md).

| Gate | Cuándo | Qué corre | Fallo |
| --- | --- | --- | --- |
| **PR** | cada PR / push | **XSD** Invoice unsigned + **Excel** subset P0 (totales, moneda, RUC, serie-número, TaxScheme) | **block** merge |
| **Nightly XSL** | cron diario (+ manual) | XSL `ValidaExprRegFactura-2.0.1.xsl` (`xsl-ubl-2.1-2022-09-06.zip`) vs golden Invoice; ampliar tipos después | **warn** en MVP (`continue-on-error`); block solo tras estabilizar (§14 de [29](29-plan-gate-xsd-xsl.md)) |
| **sunat-beta** | opcional / workflow_dispatch o label | SendBill beta + (opcional) GRE token/send con secrets | **no** en PR; requiere RUC/SOL; ver checklist live en [22](22-sandbox-setup.md) §5.1 |

**MVP Excel-first:** PR no exige XSL ni beta. Runtime API default `stages: ['xsd','excel']`.
