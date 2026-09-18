# 00 — Bases del proyecto

## 1. Qué es FACTOSYS

Plataforma de **APIs de cumplimiento tributario electrónico en Perú**.  
El cliente envía un JSON estable; FACTOSYS genera UBL, firma, valida, envía a SUNAT, guarda CDR/XML/PDF y notifica estados.

No es un ERP. No es un contador en la nube. Es la capa de emisión y ciclo de vida que otros sistemas consumen.

## 2. Posicionamiento v1 (cerrado)

| Opción | Descripción | Decisión |
| --- | --- | --- |
| **A** | API developer-first sobre SEE del contribuyente | **Elegida para v1** |
| B | OSE completo (homologación + ISO 27001) | Diferido |
| C | Capa encima de un OSE tercero | Alternativa táctica si se acelera time-to-market; no es la arquitectura objetivo |

**Implicancia:** cada emisor usa su propio RUC, Clave SOL y certificado digital. FACTOSYS opera como software del contribuyente / PSE de emisión, no como OSE calificado en la primera versión.

## 3. Objetivos de producto

1. Hacer que integrar facturación electrónica en Perú sea **predecible** (OpenAPI, estados claros, errores bilingües: humano + código SUNAT).
2. Cubrir el **ciclo completo**: emitir → consultar → anular/baja → notas → GRE → (luego) SIRE.
3. **Pre-validar** antes de quemar correlativo o pegarle a SUNAT.
4. Ser **multi-RUC** desde el día uno (tenancy por organización / empresa).
5. Exponer **artefactos** (XML firmado, ZIP, CDR, representación impresa/PDF) sin fricción.

## 4. Alcance de este repo de planificación

Incluye:

- Biblioteca oficial SUNAT.
- Arquitectura, stack, seguridad técnica, matriz MVP, borrador de API.
- Trazabilidad norma ↔ capacidad de producto.

Excluye (gestión aparte):

- Presupuesto, pricing, headcount, organigramas.
- Contratos comerciales, SLAs de venta, marketing.
- Código de producción (hasta cerrar el plan).

## 5. Principios de diseño

| Principio | Significado |
| --- | --- |
| Norma primero | Si SUNAT lo exige, el sistema lo cumple; no se “simplifica” saltándose validaciones |
| JSON canónico | El cliente no conoce tags UBL; nosotros compilamos |
| Idempotencia | Misma clave de idempotencia = mismo comprobante |
| Correlativo sagrado | Solo se consume numeración tras pasar pre-validación (y reglas de negocio propias) |
| Observabilidad | Todo envío tiene trace: request, XML, ticket, CDR, webhook |
| Separación de secretos | SOL y certificados nunca salen en logs ni en respuestas de API |
| Clean / modular | Backend clean architecture; frontend modular cuando exista UI |
| Ambiente dual | Beta SUNAT y producción, aislados por configuración |

## 6. Restricciones duras (técnicas / normativas)

- UBL **2.1** para factura, boleta y notas; UBL **2.0** para resumen diario y comunicación de baja.
- SOAP + WS-Security UsernameToken para CPE clásico.
- REST + OAuth2 para GRE moderna y consulta integrada.
- CDR aceptada obligatoria en GRE **antes** del traslado.
- Boletas deben informarse vía resumen diario (o envío individual según reglas vigentes).
- Certificado digital del emisor debe estar registrado en SOL.
- Encoding XML: reglas SUNAT (incl. ISO-8859-1 cuando aplique según manual).

## 7. Actores

| Actor | Rol |
| --- | --- |
| Integrador / SaaS / ERP | Consume la API pública FACTOSYS |
| Emisor (contribuyente) | Dueño del RUC, SOL y certificado |
| SUNAT | Autoridad; valida y responde CDR |
| Adquirente / receptor | Recibe XML/PDF; puede consultar validez |
| FACTOSYS | Orquesta firma, envío, estado y notificaciones |

## 8. Ambientes

| Ambiente | Uso |
| --- | --- |
| `local` | Desarrollo; mocks o beta |
| `sandbox` | Clientes de prueba; apunta a beta SUNAT + motor de reglas local |
| `production` | Emisión real |

## 9. Criterio de “listo para implementar”

El plan se considera cerrado para empezar código cuando existan:

1. Matriz MVP firmada (este directorio).
2. Stack y arquitectura sin puntos abiertos críticos.
3. Borrador OpenAPI de recursos v1.
4. Lista de documentos oficiales mapeados a cada capacidad.
5. Decisiones de seguridad técnica documentadas.
