# ADR-001 — Política de correlativos ante fallos

Estado: **Aceptado** (planificación)  
Fecha: 2026-09-17

## Contexto

Al emitir, FACTOSYS reserva un correlativo antes o durante el envío a SUNAT. Un fallo de red / timeout deja ambigüedad: ¿reintentar con el mismo número o liberarlo?

## Decisión

| Momento del fallo | Acción |
| --- | --- |
| Antes de firmar / antes de tocar SUNAT | **Liberar** correlativo; estado `rejected` o no persistir número |
| Tras `SendBill` / REST GRE enviado (o timeout post-envío) | **Retener** correlativo; estado `failed` o `ticket_pending`; reintento **idempotente** del mismo documento |
| CDR `rejected` por negocio | Correlativo **consumido** (no reutilizar); cliente emite nuevo número |
| CDR `accepted` | Consumido definitivamente |

## Consecuencias

- Idempotency-Key evita doble correlativo en reintentos del cliente.
- `failed` + mismo `document_id` permite `POST .../retry` interno sin nueva numeración.
- Liberar solo en fallos pre-wire reduce huecos de serie.
- Documentar en API: “timeout no implica rechazado; consultar `GET /documents/{id}`”.

## Alternativas descartadas

- Siempre liberar tras timeout → riesgo de duplicar en SUNAT si el envío sí llegó.
- Siempre consumir aunque no se envió → agujeros innecesarios de numeración.
