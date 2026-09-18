# 07 — Seguridad y cumplimiento (técnico)

Solo controles técnicos y de datos. Sin políticas de personal ni costos.

## 1. Activos sensibles

| Activo | Riesgo si se filtra |
| --- | --- |
| Clave SOL + usuario | Emisión / consultas en nombre del RUC |
| Certificado digital + password | Firma de comprobantes falsos |
| `client_id` / `client_secret` GRE | Abuso de API CPE |
| XML/CDR/PDF | Datos comerciales y PII de clientes finales |
| API keys FACTOSYS | Emisión no autorizada en el tenant |
| JWT sesión consola + passwords | Acceso admin al tenant |

## 2. Principios

1. **Least privilege** por tenant, por API key **y por rol RBAC** (consola).
2. **Secretos nunca en logs**, métricas ni respuestas de error.
3. **Cifrado en reposo** del material criptográfico.
4. **Cifrado en tránsito** (TLS 1.2+).
5. **Separación beta / producción** (credenciales y bases distintas).
6. **Auditoría inmutable** de quién emitió qué (API key **o** user_id + timestamp + hash).

## 3. Custodia de certificados

| Paso | Diseño |
| --- | --- |
| Upload | Solo `.pfx`/`.p12` por canal autenticado |
| Almacenamiento | Blob cifrado (envelope encryption); password del pfx cifrado aparte |
| Uso | Cargar en memoria solo durante firma; no escribir PEM en disco claro |
| Rotación | Permitir N certificados; marcar uno activo por RUC |
| Revocación | Soft-delete + bloqueo inmediato de firmas |

## 4. Credenciales SOL y OAuth SUNAT

- Guardar usuario SOL y clave cifrados.
- Para GRE: almacenar client credentials; cachear access token en Redis con TTL &lt; expiración SUNAT.
- Prohibido devolver estos campos en GET de empresa.

## 5. API FACTOSYS (máquina)

| Control | Detalle |
| --- | --- |
| Auth | `Authorization: Bearer <api_key>` |
| Scopes | `documents:write`, `documents:read`, `credentials:manage`, `webhooks:manage`, `validations:cpe` |
| Idempotency-Key | Header obligatorio en POST de emisión |
| Rate limit | Por organization y por company |
| IP allowlist | Opcional por organization |

## 5.1 Consola (humano) — RBAC

| Control | Detalle |
| --- | --- |
| Auth | JWT access + refresh; password Argon2id |
| Roles | `owner`, `admin`, `operator`, `developer`, `viewer` |
| Permisos | Ver matriz en [33-console-ui-y-rbac.md](33-console-ui-y-rbac.md) |
| Separación | API keys ≠ sesiones usuario; no mezclar tokens |

## 6. Webhooks

- URL solo HTTPS.
- Firma HMAC-SHA256 en header (`X-Factosys-Signature`).
- Reintentos con backoff; desactivar tras N fallos.
- Payload sin certificados ni SOL; solo IDs + estado + URLs firmadas de artefactos.

## 7. Datos personales

El CPE incluye nombre/documento del adquirente. Tratar como dato personal:

- Retención configurable por tenant.
- Export/delete bajo solicitud del tenant (diseñar endpoint admin).
- No usar datos de producción en demos.

## 8. Cumplimiento SUNAT vs cumplimiento FACTOSYS

| Capa | Qué cubre |
| --- | --- |
| Validaciones SUNAT | XSD, reglas, CDR |
| FACTOSYS | Auth, tenancy, secretos, integridad de correlativos, no-repudio interno (audit log) |

Ser OSE (ISO 27001, anexos A/C) **no es requisito de v1**, pero el diseño de vault y audit no debe impedir crecer hacia ese camino.

## 9. Checklist de seguridad antes de producción

- [ ] Secrets fuera del repo (nunca en git)
- [ ] Cifrado de pfx verificado
- [ ] Logs redactados (tests que fallen si aparece `password`/`sol`)
- [ ] Separación beta/prod
- [ ] Backups de Postgres + artefactos probados
- [ ] Rotación de API keys documentada
- [ ] Threat model básico (suplantación RUC, replay, webhook poisoning)
