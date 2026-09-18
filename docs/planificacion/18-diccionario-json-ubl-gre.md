# 18 — Diccionario JSON ↔ UBL (GRE 09 / 31)

Guía de Remisión Electrónica.  
Canal SUNAT: **REST** (`api-cpe.sunat.gob.pe`) + OAuth2 — **no** SOAP clásico ni OSE.  
Raíz UBL: **`DespatchAdvice`**.

Fuentes: Manual servicios GRE, Manual URL GRE, RS 123-2022 + anexo, Excel `reglas-validacion-gre-2026-06-20.xlsx` (hojas Guía-Remitente2_0 / Guía-Transportista2_0), guía histórica remitente.

Endpoint FACTOSYS: `POST /despatch-advices`.

Convención de paths: el transportista vive **solo** en `shipment.carrier` (nunca top-level `carrier`). En tipo **31**, el emisor es el transportista (`company_id` → `DespatchSupplierParty`); el remitente va en `shipper`.

---

## 1. Reglas de producto (imprescindibles)

| Regla | Detalle |
| --- | --- |
| Timing | Debe existir **CDR aceptada antes** de iniciar el traslado |
| Auth | OAuth2 → Bearer (scope `https://api-cpe.sunat.gob.pe`) — ver §11 |
| Envío | ZIP firmado en base64 + `hashZip` SHA-256 + `nomArchivo` |
| Nombre archivo | `{RUC}-{09\|31}-{SERIE}-{CORRELATIVO}` (sin extensión en path REST) |
| Serie | Remitente típica `T###`; transportista `V###` (validar catálogo/RS vigentes) |
| v1 | 09 completo; 31 básico (campos M del Excel + shipper / placa / licencia) |

## 2. Metadatos FACTOSYS

| JSON path | Req | Nota |
| --- | --- | --- |
| `company_id` | required | Emisor: remitente si `09`; transportista si `31` |
| `document_type` | required `09`\|`31` | → `cbc:DespatchAdviceTypeCode` |
| `serie` | required | Parte de `cbc:ID` |
| `number` | optional | Correlativo; motor asigna si omitido |
| `issue_date` | required | `cbc:IssueDate` (Excel: **M**) |
| `issue_time` | recommended | `cbc:IssueTime` (Excel: **M**) |
| `notes` | optional | `cbc:Note` |

UBL fijo interno: `UBLVersionID` / `CustomizationID` según XSD GRE vigente (motor; no lo envía el cliente).

---

## 3. Partes

### Remitente (`shipper`)

| Tipo | Uso |
| --- | --- |
| **09** | Suele hidratarse de `company_id` → `cac:DespatchSupplierParty` (no hace falta reenviar `shipper` si coincide) |
| **31** | **Obligatorio** en JSON: remitente ≠ emisor → `cac:Shipment/cac:Delivery/cac:Despatch/cac:DespatchParty` |

| JSON path | Cat. | Uso |
| --- | --- | --- |
| `shipper.identity_type` | 06 | Tipo doc. identidad |
| `shipper.identity_number` | — | RUC / doc. |
| `shipper.name` | — | Razón social / nombres |

### Destinatario (`delivery_customer`) — M en 09 y 31

| JSON path | Req |
| --- | --- |
| `delivery_customer.identity_type` | required |
| `delivery_customer.identity_number` | required |
| `delivery_customer.name` | required |

### Proveedor / terceros (conditional, sobre todo 09)

| JSON path | Cuándo |
| --- | --- |
| `supplier` | Compra para traslado / terceros según motivo |
| `buyer` | Si aplica en operación |

### Transportista (`shipment.carrier`) — path único

| JSON path | Cat. | Nota |
| --- | --- | --- |
| `shipment.carrier.identity_type` | 06 | En **09** modalidad pública: RUC transportista → `cac:ShipmentStage/cac:CarrierParty` |
| `shipment.carrier.identity_number` | — | |
| `shipment.carrier.name` | — | |
| `shipment.carrier.mtc_registration` | — | Registro MTC (`CompanyID`) si aplica |

En **31**, la identidad del transportista emisor sale de `company_id` (`DespatchSupplierParty`); `shipment.carrier` se usa para datos extra del carrier (p. ej. MTC / autorización), no como party top-level.

---

## 4. Traslado (`shipment`)

| JSON path | Req | Cat. / nota |
| --- | --- | --- |
| `shipment.transfer_reason_code` | required en **09** | Cat. **20** → `cbc:HandlingCode` |
| `shipment.transfer_reason_text` | conditional | Si motivo “otros” → `cbc:HandlingInstructions` |
| `shipment.transport_mode_code` | required en **09** | Cat. **18** → `ShipmentStage/cbc:TransportModeCode` |
| `shipment.gross_weight` | required | `cbc:GrossWeightMeasure` |
| `shipment.gross_weight_unit` | required | Cat. 03 (ej. KGM) `@unitCode` |
| `shipment.total_packages` | optional | `cbc:TotalTransportHandlingUnitQuantity` |
| `shipment.start_date` | required | `ShipmentStage/TransitPeriod/cbc:StartDate` |
| `shipment.start_time` | optional | |
| `shipment.indicator_*` | conditional | `cbc:SpecialInstructions` (traslado total, retorno vacío, etc.) |

### Vehículo y conductor

| JSON path | Nota |
| --- | --- |
| `shipment.vehicles[].plate` | → `TransportHandlingUnit/TransportEquipment/cbc:ID` |
| `shipment.vehicles[].authority_code` | Autorización / TUCE si aplica |
| `shipment.drivers[].job_title` | Tipo conductor (`cbc:JobTitle`; principal / secundario) |
| `shipment.drivers[].identity_type` | Cat. 06 |
| `shipment.drivers[].identity_number` | |
| `shipment.drivers[].name` | Nombres / apellidos |
| `shipment.drivers[].license` | → `DriverPerson/IdentityDocumentReference/cbc:ID` — **M en 31** (conductor principal) |

### Puntos geográficos

| JSON path | Nota |
| --- | --- |
| `shipment.origin.ubigeo` | Cat. 13 — **M** en 09 y 31 |
| `shipment.origin.address` | **M** en 09; C/condicional en 31 Excel |
| `shipment.origin.establishment_code` | Si aplica |
| `shipment.destination.ubigeo` | |
| `shipment.destination.address` | |
| `shipment.destination.establishment_code` | |
| `shipment.container_id` | Contenedor |
| `shipment.port_code` | Puerto/aeropuerto |

## 5. Documentos relacionados

| JSON path | Cat. | Uso |
| --- | --- | --- |
| `related_documents[]` | 01 / 09 / 21… | Factura, GRE previa, DAM, etc. |
| `related_documents[].document_type` | required | `DocumentTypeCode` |
| `related_documents[].serie_number` | required | `AdditionalDocumentReference/cbc:ID` |
| `voided_gre` | optional | GRE dada de baja relacionada |

## 6. Ítems a transportar (`lines`)

| JSON path | Req |
| --- | --- |
| `lines[].id` | required |
| `lines[].quantity` | required |
| `lines[].unit_code` | required cat. 03 |
| `lines[].description` | required |
| `lines[].product_code` | optional |
| `lines[].sunat_product_code` | optional |

**No hay montos IGV** en GRE: no se envían `unit_price` / taxes de CPE.

---

## 7. Mapa tag-a-tag JSON → UBL (núcleo crítico)

Fuente: Excel GRE 2026-06-20, columna **TAG UBL**. Condición **M** = obligatorio en hoja; **C** = condicional. Paths abreviados desde `/DespatchAdvice`.

### 7.1 Cabecera (09 y 31)

| # Excel | Dato | Cond | JSON FACTOSYS | TAG UBL |
| --- | --- | --- | --- | --- |
| 1 | Versión UBL | M | *(motor)* | `cbc:UBLVersionID` |
| 2 | Customization | M | *(motor)* | `cbc:CustomizationID` |
| 3 | Serie-correlativo | M | `serie` + `number` | `cbc:ID` |
| 4 | Fecha emisión | M | `issue_date` | `cbc:IssueDate` |
| 5 | Hora emisión | M | `issue_time` | `cbc:IssueTime` |
| 6 | Tipo documento | M | `document_type` (`09`\|`31`) | `cbc:DespatchAdviceTypeCode` |
| 7 | Observaciones | C | `notes` | `cbc:Note` |

### 7.2 Partes — GRE remitente (09)

| # | Dato | Cond | JSON | TAG UBL |
| --- | --- | --- | --- | --- |
| 8–9 | Remitente (emisor) | M | `company_id` → shipper hidratado | `cac:DespatchSupplierParty/.../cbc:ID` + `RegistrationName` |
| 15–16 | Destinatario | M | `delivery_customer.*` | `cac:DeliveryCustomerParty/...` |
| 17–18 | Proveedor | C | `supplier.*` | `cac:SellerSupplierParty/...` |
| 19–20 | Comprador | C | `buyer.*` | `cac:BuyerCustomerParty/...` |
| 42–43 | Transportista | C* | `shipment.carrier.*` | `cac:Shipment/cac:ShipmentStage/cac:CarrierParty/...` |
| 44 | Registro MTC | C | `shipment.carrier.mtc_registration` | `CarrierParty/.../cbc:CompanyID` |

\*Obligatorio en práctica si modalidad pública (cat. 18 = `01`).

### 7.3 Traslado / peso / modalidad (09)

| # | Dato | Cond | JSON | TAG UBL |
| --- | --- | --- | --- | --- |
| 21 | Id. traslado | M | *(motor, p.ej. `SUNAT_Envio`)* | `cac:Shipment/cbc:ID` |
| 22 | Motivo traslado | M | `shipment.transfer_reason_code` | `cac:Shipment/cbc:HandlingCode` |
| 23 | Desc. motivo | C | `shipment.transfer_reason_text` | `cac:Shipment/cbc:HandlingInstructions` |
| 26 | Peso bruto + UM | M | `shipment.gross_weight` + `gross_weight_unit` | `cbc:GrossWeightMeasure` (+ `@unitCode`) |
| 27 | Bultos/pallets | C | `shipment.total_packages` | `cbc:TotalTransportHandlingUnitQuantity` |
| 32 | Modalidad traslado | M | `shipment.transport_mode_code` | `ShipmentStage/cbc:TransportModeCode` |
| 33 | Fecha inicio | C/M† | `shipment.start_date` | `ShipmentStage/TransitPeriod/cbc:StartDate` |
| 35–40 | Indicadores | C | `shipment.indicator_*` | `cac:Shipment/cbc:SpecialInstructions` |

†Excel marca C en algunos escenarios; FACTOSYS v1 lo exige siempre.

### 7.4 Vehículo / conductor / puntos (09)

| # | Dato | Cond | JSON | TAG UBL |
| --- | --- | --- | --- | --- |
| 46 | Placa principal | C | `shipment.vehicles[0].plate` | `TransportHandlingUnit/TransportEquipment/cbc:ID` |
| 52–55 | Conductor + licencia | C | `shipment.drivers[]` | `ShipmentStage/DriverPerson` (+ `IdentityDocumentReference/cbc:ID`) |
| 60–61 | Ubigeo + dir. partida | M | `shipment.origin.*` | `Delivery/Despatch/DespatchAddress` |
| 65–66 | Ubigeo + dir. llegada | C | `shipment.destination.*` | `Delivery/DeliveryAddress` |
| 70–72 | Puerto/aeropuerto | C | `shipment.port_code` | `FirstArrivalPortLocation` |

### 7.5 Docs relacionados e ítems (09)

| # | Dato | Cond | JSON | TAG UBL |
| --- | --- | --- | --- | --- |
| 12–13 | Tipo + número doc. rel. | C | `related_documents[]` | `AdditionalDocumentReference` `DocumentTypeCode` + `cbc:ID` |
| 73–76 | Ítem / cant. / UM / desc. | C | `lines[]` | `cac:DespatchLine` |
| 77–78 | Códigos bien | C | `product_code` / `sunat_product_code` | `SellersItemIdentification` / `CommodityClassification` |

### 7.6 Partes y carga — GRE transportista (31) — ver también §8

| # | Dato | Cond | JSON | TAG UBL |
| --- | --- | --- | --- | --- |
| 8–9 | Transportista (emisor) | M | `company_id` | `cac:DespatchSupplierParty/...` |
| 16–17 | **Remitente** | M | **`shipper.*`** | `Shipment/Delivery/Despatch/DespatchParty/...` |
| 18–19 | Destinatario | M | `delivery_customer.*` | `cac:DeliveryCustomerParty/...` |
| 29 | Ubigeo partida | M | `shipment.origin.ubigeo` | `DespatchAddress/cbc:ID` |
| 35 | Placa | M | `shipment.vehicles[0].plate` | `TransportEquipment/cbc:ID` |
| 41–44 | Conductor principal + licencia | M | `shipment.drivers[0].*` + **`license`** | `DriverPerson` + `IdentityDocumentReference/cbc:ID` |
| 49 | Id. traslado | M | *(motor)* | `cac:Shipment/cbc:ID` |
| 50 | Fecha inicio | M | `shipment.start_date` | `TransitPeriod/cbc:StartDate` |
| 52 | Peso bruto | M | `shipment.gross_weight` (+ unit) | `cbc:GrossWeightMeasure` |

---

## 8. Tipo 31 — campos obligatorios (Excel Guía-Transportista)

Emisor = **empresa de transporte** (`company_id`, serie `V###`). El JSON **debe** incluir remitente explícito.

| Campo JSON | Excel # | Cond | Notas |
| --- | --- | --- | --- |
| `company_id` (+ datos empresa) | 8–9 | M | Transportista → `DespatchSupplierParty` |
| `shipper.identity_type/number/name` | 16–17 | M | Remitente → `DespatchParty` |
| `delivery_customer.*` | 18–19 | M | Destinatario |
| `issue_date` / `issue_time` | 4–5 | M | |
| `document_type: "31"` | 6 | M | |
| `shipment.origin.ubigeo` | 29 | M | Partida |
| `shipment.vehicles[].plate` | 35 | M | ≥1 placa principal |
| `shipment.drivers[].job_title` | 41 | M | Tipo conductor (principal) |
| `shipment.drivers[].identity_*` + `name` | 42–43 | M | |
| `shipment.drivers[].license` | 44 | M | Licencia conductor principal |
| `shipment.start_date` | 50 | M | |
| `shipment.gross_weight` + unit | 52 | M | |

Condicionales frecuentes 31: MTC (#10), docs relacionados (#13–14, p.ej. GRE 09), dirección partida (#30), destino (#32–33), conductor secundario (#45–48), indicadores (#53–58), subcontrato / pagador flete (#57–63).

**No** exigir en v1 de 31 (a diferencia de 09): `transfer_reason_code` / `transport_mode_code` como M en Excel transportista — si el cliente los envía, el motor los mapea si el XSD lo permite; no fallar prevalidación 31 solo por omitirlos.

---

## 9. Envío REST (motor interno)

Tras firmar XML:

```json
{
  "archivo": {
    "nomArchivo": "20100066603-09-T001-1.zip",
    "arcGreZip": "<base64>",
    "hashZip": "<sha256 hex>"
  }
}
```

Flujo estados FACTOSYS: `validated` → `sent` → `ticket_pending` → `accepted` | `accepted_with_observation` | `rejected`.

## 10. Ejemplo mínimo GRE remitente (09)

```json
{
  "company_id": "11111111-1111-1111-1111-111111111111",
  "document_type": "09",
  "serie": "T001",
  "issue_date": "2026-09-17",
  "issue_time": "10:00:00",
  "delivery_customer": {
    "identity_type": "6",
    "identity_number": "20123456789",
    "name": "ACME SAC"
  },
  "shipment": {
    "transfer_reason_code": "01",
    "transport_mode_code": "01",
    "gross_weight": 10.5,
    "gross_weight_unit": "KGM",
    "start_date": "2026-09-17",
    "carrier": {
      "identity_type": "6",
      "identity_number": "20600000000",
      "name": "TRANSPORTE SAC"
    },
    "origin": {
      "ubigeo": "150101",
      "address": "Av. Emisor 123"
    },
    "destination": {
      "ubigeo": "150122",
      "address": "Av. Destino 456"
    }
  },
  "related_documents": [
    { "document_type": "01", "serie_number": "F001-00000015" }
  ],
  "lines": [
    {
      "id": 1,
      "quantity": 10,
      "unit_code": "NIU",
      "description": "Cajas de producto"
    }
  ]
}
```

Fixture 31: `artifacts/fixtures/31-gre-transportista-min.json`.

## 11. OAuth2 GRE (token + envío)

Fuente: *Manual de Servicios Web Plataforma Nueva GRE* + [docs/sunat-oficial/README.md](../sunat-oficial/README.md). Detalle operativo sandbox: [22-sandbox-setup.md](22-sandbox-setup.md). Spike: [24 § Spike D](24-plan-spikes-emision.md).

### 11.1 Credenciales (por empresa, fuera de git)

| Variable / secreto | Uso |
| --- | --- |
| `SUNAT_GRE_CLIENT_ID` | Client id portal GRE / `credentials/gre` |
| `SUNAT_GRE_CLIENT_SECRET` | Client secret |
| `SUNAT_SOL_USER` | Usuario SOL (`RUC` + usuario) |
| `SUNAT_SOL_PASSWORD` | Clave SOL |
| `SUNAT_GRE_BASE_URL` | Default `https://api-cpe.sunat.gob.pe` |

### 11.2 Token

| Ítem | Valor |
| --- | --- |
| Token URL | `https://api-seguridad.sunat.gob.pe/v1/clientessol/<client_id>/oauth2/token/` |
| Grant | **password** (SOL + `client_id` / `client_secret`) — confirmar manual vigente al implementar |
| Scope | `https://api-cpe.sunat.gob.pe` |
| Respuesta | `access_token` Bearer |
| TTL | ~**1 hora** (3600 s) — cachear en Redis con TTL &lt; expiración SUNAT |
| Refresh | Re-pedir token al expirar (no asumir refresh_token estable); invalidar caché ante 401 |

Body típico (`application/x-www-form-urlencoded`): `grant_type=password`, `scope=https://api-cpe.sunat.gob.pe`, `username`, `password`, más auth client según manual.

### 11.3 Envío y consulta

1. Obtener Bearer.  
2. `POST` ZIP GRE a API CPE (path según manual URL GRE vigente).  
3. Recibir ticket → poll estado → CDR.  
4. Errores funcionales frecuentes: HTTP **422** + código SUNAT.

---

## 12. Matriz modalidad × campos (09, borrador v1)

Cat. **18** (modo) × exigencia típica:

| `transport_mode_code` | Nombre típico | `shipment.carrier` | `vehicles` | `drivers` |
| --- | --- | --- | --- | --- |
| `01` | Transporte público | required (RUC transportista) | optional* | optional* |
| `02` | Transporte privado | optional / N/A | required (≥1 placa) | required (≥1 conductor; `license` si Excel/XSL lo exige) |

\*En público, placa/conductor pueden ser condicionales según motivo y reglas SUNAT.

Motivos cat. **20** frecuentes (09): `01` venta, `02` venta sujeta a confirmación, `04` traslado entre establecimientos, `05` consignación, `06` otros (exige `transfer_reason_text`), `08` importación, `09` exportación, `13` otros no domiciliado, `14` venta itinerante — obligatoriedad de docs relacionados varía; el motor usa Excel GRE.

## 13. Pendiente de endurecer (v1 → v2)

- [x] Path único `shipment.carrier` (sin top-level)
- [x] Mapa tag-a-tag núcleo vs Excel GRE 2026-06-20 (§7)
- [x] GRE 31: campos M + `shipper` + licencia + placa (§8 / fixture)
- [x] Nota OAuth2 GRE (§11) + Spike D en plan 24
- [ ] Completar matriz motivo (20) × modalidad (18) campo a campo (resto de filas Excel)
- [ ] Atributos de lista (`@listAgencyName`, etc.) en builder UBL
- [ ] Indicadores de bienes fiscalizados / subcontrato 31 en API pública
