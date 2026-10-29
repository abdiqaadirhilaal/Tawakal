# TAWAKAL API

Base URL (maxalli): `http://localhost:5000/api`

## Qaabka jawaabaha

Guul:

```json
{ "success": true, "message": "Alaabta waa la soo helay", "data": [], "pagination": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 } }
```

Khalad:

```json
{ "success": false, "message": "Xogta la soo diray sax ma aha", "errors": [{ "field": "price", "message": "Ma noqon karo wax ka yar 0" }] }
```

| Koodh | Macne |
| --- | --- |
| 200 / 201 | Guul / la abuuray |
| 400 | Xog aan sax ahayn (ama goob aan la aqoon) |
| 401 | Lama soo gelin, ama fadhigu wuu dhacay |
| 403 | Awood la'aan, ama header-ka CSRF ma jiro |
| 404 | Lama helin |
| 409 | Is-khilaaf: kayd aan ku filnayn, SKU jira, u-gudub xaalad aan la oggolayn |
| 429 | Codsiyo aad u badan, ama akoon la xiray |
| 500 | Khalad server (faahfaahin lama muujiyo) |

## Xaqiijinta

- `POST /auth/login` wuxuu dejiyaa cookie `tawakal_token` (HttpOnly, SameSite=Lax; Secure marka production). Codsiyada xiga waa in ay cookie-ga wataan (`withCredentials: true`).
- Codsi kasta oo **wax beddelaya** oo ku socda `/auth/*` ama `/admin/*` waa in uu wato header-ka `X-Requested-With: XMLHttpRequest`.
- Doorarka: `admin`, `manager`, `staff`, `cashier`. `/admin/*` = `admin`, `manager`, `staff`. `/pos/*` = `admin`, `manager`, `cashier`. **[admin]** = `admin` kaliya. **[kormeere]** = `admin` ama `manager`.

Tusaale (PowerShell):

```powershell
$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$h = @{ 'X-Requested-With' = 'XMLHttpRequest' }
$body = @{ email = 'adiga@tusaale.so'; password = 'furahaaga' } | ConvertTo-Json
Invoke-RestMethod -Method Post http://localhost:5000/api/auth/login -WebSession $s -Headers $h -ContentType 'application/json' -Body $body
Invoke-RestMethod http://localhost:5000/api/admin/dashboard/stats -WebSession $s
```

---

## Waddooyinka dadweynaha

| Hab | Waddo | Sharraxaad |
| --- | --- | --- |
| GET | `/health` | Hubinta in server-ku socdo |
| POST | `/auth/login` | `{ email, password }` |
| POST | `/auth/logout` | Wuxuu tirtiraa cookie-ga |
| GET | `/auth/me` | Isticmaalaha hadda soo galay |
| PATCH | `/auth/change-password` | `{ currentPassword, newPassword }` (ugu yaraan 10 xaraf) |
| GET | `/products` | Liiska alaabta firfircoon |
| GET | `/products/:idOrSlug` | `{ product, related }` |
| GET | `/categories` | Qaybaha firfircoon + `productCount` |
| POST | `/orders` | Abuur dalab |
| GET | `/orders/track` | `?orderNumber=TWK-261010-0001&phone=0615551234` |
| POST | `/contact` | `{ name, phone?, email?, subject?, message }` (taleefan ama email waa qasab) |
| GET | `/settings/public` | Dejinta la muujin karo oo kaliya |

### `GET /products`

| Query | Qiime |
| --- | --- |
| `page` | 1+ (default 1) |
| `limit` | 1 ilaa 48 (default 12) |
| `search` | magac ama SKU, ugu badnaan 80 xaraf |
| `category` | slug-ga qaybta |
| `sort` | `newest`, `price_asc`, `price_desc`, `name_asc`, `name_desc` |
| `featured` | `true` |

Alaabta dadweynaha: `id, name, slug, sku, category, description, price, unit, allowDecimal, stock, inStock, images, isFeatured`. `costPrice` iyo `lowStockThreshold` weligood lama soo celiyo.

### `POST /orders`

```json
{
  "idempotencyKey": "3b241101-e2bb-4255-8caf-4136c566a962",
  "customer": { "name": "Axmed Cali", "phone": "+252 61 5551234", "email": "" },
  "fulfillmentMethod": "delivery",
  "deliveryAddress": { "address": "Wadada Maka", "district": "Hodan" },
  "paymentMethod": "cash_on_delivery",
  "customerNotes": "",
  "items": [{ "productId": "665f0c0e2f8b9a0012345678", "quantity": 4 }]
}
```

- `idempotencyKey` (UUID) waa qasab. Isla furaha oo mar labaad la diro wuxuu soo celinayaa dalabkii hore (`200`) isagoon kaydka mar kale dhimin.
- **Qiimo iyo wadar lama aqbalo.** Goob kasta oo dheeraad ah (`price`, `total`…) waxay keenaysaa `400`.
- `deliveryAddress` waa qasab marka `fulfillmentMethod` uu yahay `delivery`.
- `paymentMethod` waa in uu noqdaa koodh shaqeynaya oo ku jira dejinta.
- `409` + `errors[].code`: `insufficient_stock` (oo leh `available`), `unavailable`. `400`: `invalid_quantity`.
- Guul (`201`): `orderNumber, customerName, items, subtotal, deliveryFee, total, currency, paymentMethod, paymentStatus, orderStatus, createdAt`.

### `GET /orders/track`

Wuxuu u baahan yahay lambarka dalabka **iyo** taleefanka dalabka lagu sameeyey (9-ka god ee ugu dambeeya ayaa la is barbar dhigaa). Haddii midkood khaldan yahay: `404` isku farriin ah. Wuxuu soo celiyaa: magaca koowaad, xaaladda, taariikhda xaaladaha, alaabta iyo wadarta. Cinwaan, taleefan, email iyo qoraallo gudaha ah lama soo celiyo.

---

## Waddooyinka maamulka (`/admin/*`)

Dhammaantood waxay u baahan yihiin soo gelid (door `admin` ama `staff`).

### Alaabta

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/admin/products` | `page, limit (≤100), search, category (id), status = all\|active\|inactive\|low\|out\|archived` |
| GET | `/admin/products/:id` | |
| POST | `/admin/products` | `name, sku, category, price, unit` waa qasab. Ikhtiyaari: `barcode, description, costPrice, allowDecimal, stock (kaydka bilowga), lowStockThreshold, images[], isActive, isFeatured` |
| PATCH | `/admin/products/:id` | Isla goobahaas marka laga reebo `stock` (kaydka waxaa lagu beddelaa `/admin/inventory`). `isActive: true` wuxuu soo celiyaa alaab la kaydiyey. |
| DELETE | `/admin/products/:id` | Kayd-gelin (archive), ma aha tirtirid |
| POST | `/admin/uploads` | `multipart/form-data`, goobta `image` (JPG/PNG/WEBP, ≤3MB) → `{ url }` |

`costPrice`: kaliya `admin` ayaa arki kara ama beddeli kara. `unit`: `bag, piece, meter, bundle, ton, kg, liter, box, roll, sheet`.

### Qaybaha

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/admin/categories` | Dhammaan + `productCount` |
| POST | `/admin/categories` | `{ name, description?, image?, isActive? }` |
| PATCH | `/admin/categories/:id` | |
| DELETE | `/admin/categories/:id` | `409` haddii alaab ku xiran tahay |

### Dalabyada

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/admin/orders` | `page, limit, search, status, paymentStatus, from, to (YYYY-MM-DD)` |
| GET | `/admin/orders/:id` | Faahfaahin buuxda |
| PATCH | `/admin/orders/:id/status` | `{ status }` |
| PATCH | `/admin/orders/:id/payment-status` | **[admin]** `{ paymentStatus: unpaid\|paid\|refunded }` |
| POST | `/admin/orders/:id/notes` | `{ text }` qoraal gudaha ah |

U-gudubka xaaladaha ee la oggol yahay:

| Laga | Loo |
| --- | --- |
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `processing`, `cancelled` |
| `processing` | `ready_for_pickup` (qaadasho), `out_for_delivery` (gaarsiin), `cancelled` |
| `ready_for_pickup` | `delivered`, `cancelled` |
| `out_for_delivery` | `delivered`, `cancelled` |
| `delivered`, `cancelled` | (dhammaad) |

Wax kasta oo kale: `409`. `cancelled` wuxuu kaydka soo celiyaa hal mar. Dalab la joojiyey lama calaamadin karo `paid`.

### Kaydka

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/admin/inventory` | `page, limit, search, filter = all\|low\|out` → `{ items, alerts }` |
| GET | `/admin/inventory/movements` | `page, limit, product (id), type, from, to` |
| POST | `/admin/inventory/adjustments` | `{ idempotencyKey, productId, quantityChange (≠0), reason }` |
| POST | `/admin/inventory/receipts` | **[admin]** `{ idempotencyKey, productId, quantity, unitCost, supplier?, note?, updateCostPrice? }` |

Noocyada dhaqdhaqaaqa: `initial, receipt, adjustment, sale` (dalab online), `cancellation_restore, pos_sale, refund_restock`. Mid kasta wuxuu kaydiyaa `quantityChange, stockBefore, stockAfter, reason, user, createdAt`. Dhimis ka badan kaydka: `409`.

### Dashboard iyo warbixinno

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/admin/dashboard/stats` | Tirooyinka alaabta iyo dalabyada, dakhliga, dalabyadii dambe, alaabta ugu iibka badan |
| GET | `/admin/dashboard/sales` | `period = 7d\|30d\|12m` |
| GET | `/admin/reports/sales` | `from, to, groupBy = day\|week\|month\|year` |
| GET | `/admin/reports/inventory` | Qiimaha kaydka (cost: admin kaliya), kayd yar, kayd dhammaaday |

Qeexitaan: **iib** (`sales`) = dalabyada aan la joojin; **dakhli** (`revenue`) = dalabyada `delivered`. Taariikhaha waxaa lagu xisaabiyaa `REPORT_TIMEZONE`.

### Kuwa kale

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/admin/customers` | `page, limit, search` (laga soo saaray dalabyada) |
| GET | `/admin/customers/:phoneKey/orders` | Taariikhda dalabyada macmiil |
| GET | `/admin/messages` | `page, limit, status = all\|new\|read\|resolved` |
| PATCH | `/admin/messages/:id/status` | `{ status }` |
| GET | `/admin/settings` | Dhammaan dejinta |
| PATCH | `/admin/settings` | **[admin]** goob kasta oo dejin ah (qayb ahaan waa la diri karaa) |
| GET | `/admin/users` | **[admin]** |
| POST | `/admin/users` | **[admin]** `{ name, email, password, role: admin\|manager\|staff\|cashier }` |
| PATCH | `/admin/users/:id` | **[admin]** `{ name?, role?, isActive? }` |

## Waddooyinka kaashka (`/pos/*`)

Dhammaantood waxay u baahan yihiin soo gelid iyo door `admin`, `manager` ama `cashier`. Kaashiyuhu wuxuu arkaa oo kaliya iibkiisa, celintiisa iyo shifts-kiisa; isku dayga xogta qof kale wuxuu soo celiyaa `404`.

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/pos/config` | Dejinta kaashka: lacagta, siyaasadda qiimo-dhimista, hababka lacag bixinta ee shaqeynaya, qaybaha |
| GET | `/pos/products` | `page, limit (≤60), search, category (id)`. Alaabta la iibin karo oo kaliya; `costPrice` kuma jiro |
| GET | `/pos/products/search` | `?q=`. Marka hore barcode ama SKU oo sax ah (`exact: true`), haddii kale magac |
| POST | `/pos/sales` | Dhammaystir iib |
| GET | `/pos/sales` | `page, limit, search, cashier (id, kormeere kaliya), paymentMethod, status, from, to` → `{ items, totals }` |
| GET | `/pos/sales/:id` | `{ sale, refunds }` |
| GET | `/pos/sales/:id/receipt` | `{ sale, company }`. `?reprint=true` waxaa lagu qoraa diiwaanka hawlaha |
| POST | `/pos/sales/:id/refunds` | Celin |
| GET | `/pos/refunds`, `/pos/refunds/:id` | Celinta |
| POST | `/pos/shifts/open` | `{ openingCash }`. `409` haddii shift furan jiro |
| GET | `/pos/shifts/current` | Shift-ka furan + koobitaan, ama `null` |
| POST | `/pos/shifts/close` | `{ actualClosingCash, closingNotes?, shiftId? }`. `shiftId` qof kale: kormeere kaliya |
| GET | `/pos/shifts/history` | `page, limit, cashier, status, from, to` |
| GET | `/pos/shifts/:id` | |
| POST | `/pos/shifts/:id/adjustments` | **[kormeere]** `{ amount (≠0, + ama −), reason }`. Shift furan oo kaliya |
| GET | `/pos/cashiers` | **[kormeere]** liiska shaandhaynta |

### `POST /pos/sales`

```json
{
  "idempotencyKey": "3b241101-e2bb-4255-8caf-4136c566a962",
  "items": [{ "productId": "665f0c0e2f8b9a0012345678", "quantity": 20 }],
  "customerName": "Xasan",
  "customerPhone": "0615000000",
  "discount": { "kind": "percent", "value": 10 },
  "approval": { "email": "manager@tusaale.so", "password": "..." },
  "payment": { "method": "cash", "amountReceived": 250, "reference": "" }
}
```

- `unitPrice`, `lineTotal`, `grandTotal` iyo goob kasta oo kale oo dheeraad ah: `400`. Qiimaha waxaa laga soo qaadaa database-ka.
- `discount.kind`: `percent` ama `amount`. Ka badan `cashierMaxDiscountPercent`: `approval` (maamule/manager) waa qasab, haddii kale `403` + `approval_required`. Ka badan `maxDiscountPercent`: `400`.
- `payment.method`: koodh shaqeynaya oo ku jira dejinta POS. Caddaan: `amountReceived` waa qasab, waana in uu ku filnaado (`400` + `insufficient_payment`). Habab kale: `reference` ikhtiyaari; iibka waxaa lagu calaamadiyaa `paymentVerification: "recorded_unverified"`.
- `409`: `no_open_shift`, `insufficient_stock` (oo leh `available`), `unavailable`.
- Isla `idempotencyKey`: `200` + iibkii hore.
- Guul (`201`): `saleNumber, receiptNumber, items[] (unitPrice, lineTotal, discountShare, netTotal), subtotal, totalDiscount, grandTotal, amountReceived, changeGiven, paymentMethod, paymentReference, cashierName, shiftId, status, completedAt`.

### `POST /pos/sales/:id/refunds`

```json
{
  "idempotencyKey": "9f1c2a44-0d5e-4c1b-9a7e-2b3c4d5e6f70",
  "reason": "Alaab khaldan",
  "method": "cash",
  "items": [{ "productId": "665f0c0e2f8b9a0012345678", "quantity": 4, "restock": true }],
  "approval": { "email": "manager@tusaale.so", "password": "..." }
}
```

- `reason` waa qasab. `method` default waa habkii iibka. `restock: true` kaliya marka alaabta la soo celiyey oo la iibin karo.
- Kaashiye: iibkiisa oo kaliya + `approval`. Kormeere: `approval` looma baahna.
- Lacagta = qiimaha saafiga ah ee safka × tirada / tirada la iibiyey. `409` + `over_refund` haddii tiradu ka badan tahay inta hartay; `409` haddii iibka hore si buuxda loo celiyey ama celin kale isla markaas dhacday.
- Celin caddaan ah: shift furan ayaa loo baahan yahay (`409` + `no_open_shift`).

### Warbixinnada POS (`/admin/reports/*`, **[kormeere]**)

| Hab | Waddo | Fiiro |
| --- | --- | --- |
| GET | `/admin/reports/pos-sales` | `from, to, groupBy`. `totals`, `series` (sales, gross, refunds, net), `byProduct`, `byCategory` |
| GET | `/admin/reports/cashier-performance` | `from, to`. Kaashiye kasta: iib, wadar, dhimis, celin, saafi, celceliska iibka |
| GET | `/admin/reports/payment-methods` | `from, to`. `pos[]` (iib, celin, saafi) iyo `online[]` (dalabyada la gaarsiiyey) |
| GET | `/admin/reports/shifts` | `page, limit, cashier, status, from, to`. `{ items, totals: { closed, expected, actual, variance, withVariance } }` |
| GET | `/admin/audit-logs` | **[admin]** `page, limit, action, from, to` |

`GET /admin/dashboard/stats` wuxuu hadda soo celiyaa `channels`: `pos { sales, gross, refunds, net }`, `online { completedOrders, revenue }`, `totalRevenue`, `byPaymentMethod`, `byCashier`. `GET /admin/dashboard/sales` saf kasta wuxuu leeyahay `sales` (online), `posNet`, iyo `combined`.

## Xaddidaadda codsiyada

| Waddo | Xad (IP kasta) |
| --- | --- |
| Dhammaan `/api` | 600 / 15 daqiiqo |
| `POST /auth/login` | 10 / 15 daqiiqo |
| `POST /orders` | 30 / saacad |
| `GET /orders/track` | 30 / 15 daqiiqo |
| `POST /contact` | 8 / saacad |
