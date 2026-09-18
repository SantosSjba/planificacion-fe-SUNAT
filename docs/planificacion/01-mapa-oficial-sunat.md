# 01 — Mapa oficial del SEE peruano

Resumen operativo extraído de la biblioteca oficial. No reemplaza a los PDF.  
Ver también: [04-recursos-documentarios.md](04-recursos-documentarios.md) · [03-matriz-documentos-y-mvp.md](03-matriz-documentos-y-mvp.md).

## 1. Qué es el Sistema de Emisión Electrónica

SUNAT no tiene “una sola API de facturación”. Hay varios sistemas, con contratos distintos:

| Sistema | Norma base | Quién emite | Canal técnico |
| --- | --- | --- | --- |
| SEE SOL / App Emprender | Varias RS | El contribuyente en el portal o app de SUNAT | UI, no API propia |
| SEE del contribuyente | RS 097-2012 y modificatorias | El software del emisor | SOAP + XML UBL + ZIP + CDR |
| SEE-OSE | RS 117-2017 | El emisor a través de un OSE | El OSE recibe del emisor y reenvía a SUNAT |
| SEE-SFS | RS 182-2016 | Facturador gratuito SUNAT | TXT / JSON / XML plano |
| PSE | RS 199-2015 | Un tercero emite en nombre del contribuyente | Similar al SEE del contribuyente |

Una API comercial peruana hoy casi siempre envuelve el **SEE del contribuyente** y, desde 2022, también la **GRE REST**. SIRE es otro producto (libros electrónicos), no la emisión del CPE.

## 2. Documentos que hay que emitir

| Código | Documento | Envío |
| --- | --- | --- |
| 01 | Factura electrónica | Individual, síncrono (`SendBill`) |
| 03 | Boleta de venta electrónica | Individual o por resumen diario |
| 07 | Nota de crédito | Según el comprobante que modifica |
| 08 | Nota de débito | Según el comprobante que modifica |
| 09 | GRE remitente | REST GRE, **antes del traslado**, con CDR aceptada |
| 31 | GRE transportista | REST GRE, mismas reglas de timing |
| 20 | Retención | SOAP “otros CPE” |
| 40 | Percepción | SOAP “otros CPE” |
| RA | Comunicación de baja | Asíncrono (`SendSummary` + ticket) |
| RC | Resumen diario de boletas y notas | Asíncrono (`SendSummary` + ticket) |

La boleta **no queda válida solo con emitirse**: debe informarse en el resumen diario (o enviarse individualmente, según las reglas vigentes). Eso es una diferencia clave frente a la factura.

## 3. Contrato técnico del SEE del contribuyente

Fuente: *Manual del Programador*.

1. Generar XML UBL 2.1 (factura/boleta/notas) o UBL 2.0 (resúmenes/bajas).
2. Firmar con certificado digital (XMLDSig) registrado en SOL.
3. Empaquetar **un XML por ZIP** (salvo lotes / resúmenes).
4. Nombrar así: `RUC-TIPO-SERIE-CORRELATIVO.xml` / `.zip`.
   - Ejemplo factura: `20100066603-01-F001-1.ZIP`
   - Baja: `20100066603-RA-20110522-002.ZIP`
   - GRE: `RUC-09|31-T###-NNNNNNNN.ZIP`
5. Enviar por SOAP con **WS-Security UsernameToken** (RUC + usuario SOL + clave SOL).
6. Recibir **CDR** (`ApplicationResponse`): aceptada, aceptada con observación o rechazada.

### Métodos SOAP

- `SendBill`: documentos individuales (factura, nota, GRE histórica SOAP, etc.).
- `SendSummary`: resúmenes y bajas. Devuelve ticket.
- `getStatus`: consulta el ticket y obtiene la CDR.
- `SendPack`: lotes (usado sobre todo en el flujo OSE → SUNAT).

### Autenticación

No hay API key moderna en el SOAP clásico. Las credenciales son **Clave SOL** del emisor. En GRE REST sí hay `client_id` / `client_secret` + token Bearer de 1 hora.

## 4. GRE moderna (REST)

Fuente: *Manual de Servicios Web Plataforma Nueva GRE* y RS 123-2022.

- La GRE **ya no se emite por OSE**.
- Se autentica contra `api-seguridad.sunat.gob.pe`.
- Scope: `https://api-cpe.sunat.gob.pe`.
- Errores funcionales: HTTP 422 + código SUNAT.
- Debe existir CDR aceptada **antes de iniciar el traslado**.

Esto obliga a que una API moderna trate GRE como un producto de primer nivel, no como “un XML más del SOAP viejo”.

## 5. Consultas y post-emisión

| Capacidad | Contrato |
| --- | --- |
| Validez de un CPE | REST `validarcomprobante` o SOAP `billValidService` |
| Estado / CDR | SOAP `billConsultService` o ticket GRE |
| Libros RVIE / RCE | APIs SIRE Ventas y Compras |
| Confirmación / conformidad | Plataforma de confirmación (manual aparte) |

Una API que “solo emite y se olvida” deja al cliente a medias: el mercado real necesita estado, PDF, XML, CDR, baja, nota, GRE y cruce con SIRE.

## 6. Validación

SUNAT valida en capas:

1. **XSD**: el XML es UBL correcto.
2. **XSL / Excel de reglas**: reglas de negocio peruanas (catálogos, totales, detracciones, IGV, fechas).
3. **CDR**: aceptación o rechazo con código de error.

El Excel `reglas-validacion-cpe-2026-08-26.xlsx` es el insumo más actual para un validador local. Eso es una ventaja competitiva: devolver el error **antes** de gastar un correlativo o un envío a SUNAT.

## 7. Implicancia para revolucionar el mercado

Las APIs existentes suelen vender “envía tu JSON y nosotros hablamos con SUNAT”. El dolor real, según la propia complejidad oficial, está en otro lado:

- Mapear bien UBL 2.1 y los 50+ catálogos.
- No perder correlativos por rechazos.
- Separar factura síncrona, boleta + resumen, GRE REST y SIRE.
- Exponer estados (aceptado / observado / rechazado / ticket pendiente) de forma humana.
- Multi-empresa, certificados, ambientes beta/producción y webhooks de CDR.

El diferenciador no es “cumplir SUNAT”. Eso es el piso. El diferenciador es **hacer que SUNAT se sienta una API de 2026**, no un SOAP de 2012.
