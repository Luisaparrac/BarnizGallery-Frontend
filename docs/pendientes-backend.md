# Pendientes del backend frente al frontend

Revisión del 20 de noviembre de 2026 contra `https://barniz-gallery-backend.onrender.com`. Usé solo peticiones GET públicas y OPTIONS de CORS, sin cuentas ni claves. Las rutas se compararon con el OpenAPI público del backend (`GET /v3/api-docs`, 166 rutas).

## Ya resuelto

- **Encargos:** las 16 rutas que usa el frontend existen (`/api/custom-requests/...` y `/api/artisan/custom-requests/open | accepted | declined`).
- **Diseños con IA:** `POST /api/custom-requests/{id}/designs` y `.../designs/{designId}/select`.
  - La imagen llega como data URI en `imageUrl`.
  - Un diseño fallido llega con `status: "FAILED"` y el motivo en `prompt`. El frontend ya muestra ambos casos.
- **Revisión de pujas:** cada puja trae `reviewStatus` y `reviewReason`.
- **Servicios que ya coinciden:** las rutas de `auth`, `catalog`, `gallery`, `notification`, `profile`, `commerce`, `messaging` y `customOrder`.
- **Salud:** `GET /api/health` → `{"status":"UP","aiEnabled":true,"storageEnabled":false}`.

## Sigue pendiente

| # | Servicio | Problema | Efecto en el frontend | Qué hacer en el backend |
|---|---|---|---|---|
| 1 | gallery | `artwork.slug` es `null` en las 21 obras | El 3D abre la pieza con `GET /api/artworks/null` → `404`. No se abre ninguna obra. | Llenar `slug` (la ruta `/api/artworks/{idOrSlug}` ya lo acepta) |
| 2 | gallery | `price` y `currency` en `null` en las 21 obras | No se puede comprar ninguna pieza | Cargar el precio y la moneda del inventario |
| 3 | gallery | `saleMode: "AUCTION"` en las 21 obras; en el inventario 19 son de venta directa y 2 de subasta | La placa de cada cuadro dice "En subasta" | Poner `DIRECT` a las 19 de venta directa |
| 4 | gallery | `master.whatsapp` no viene en `/api/stores` ni en `/api/stores/{slug}` | No aparecen los botones ni los atriles de WhatsApp | Exponer `whatsapp` en el maestro |
| 5 | auction | `minIncrement` en `null` en las 4 subastas | El tablero muestra "—" y la puja mínima queda igual a la base | Llenar `minIncrement` |
| 6 | auction | `POST /api/auctions/{id}/bids` exige `userId`, `amount` y `currency` | El frontend manda solo `{ amount }`, así que pujar falla | Aceptar `{ amount }`: tomar `userId` del token y `currency` de la subasta |
| 7 | catalog | `colors[].hex` vacío en los 13 colores; `avatars` vacío; los presupuestos no traen `nameEs`/`nameEn` | Las muestras de color salen vacías, los botones de presupuesto no tienen texto y el vestíbulo usa los avatares por defecto | Llenar `hex`, los nombres de los presupuestos y el catálogo `avatars` (5 códigos: `artesano`, `artesana`, `viajera`, `cuy`, `indigena`) |
| 8 | admin | Faltan 11 rutas | El panel del administrador no funciona con datos reales | Ver la lista de abajo |
| 9 | artisan | Faltan 9 rutas y no hay almacenamiento de imágenes (`storageEnabled: false`) | El panel del artesano no funciona con datos reales | Ver la lista de abajo |
| 10 | CORS | `https://barniz-gallery-frontend-git-main-vuelos1.vercel.app` recibe `403` y no trae `Access-Control-Allow-Origin` (localhost y el dominio principal sí responden bien) | Las vistas previas de Vercel no pueden llamar al backend | Agregar ese origen, o un patrón para las vistas previas, a CORS |

**Otros detalles de datos** (no bloquean):
- Las subastas 1 y 2 son datos de prueba en COP, de obras que no están en `/api/artworks`, y la 1 tiene una portada que no es imagen.
- Las fechas de las subastas vienen sin zona horaria (`2026-11-23T19:26:39`).
- Los títulos de las obras no tienen tildes ("Jarron Clasico").

### Rutas que usa el frontend y no existen

**admin (11):**
- `GET /api/admin/dashboard`
- `POST /api/admin/verifications/steps/{id}`
- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}`
- `PATCH /api/admin/stores/{id}`
- `GET /api/admin/bids/suspicious`
- `POST /api/admin/bids/{id}/valid`
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/{id}`
- `GET /api/admin/sales`
- `GET /api/admin/audit`

Algunas existen con otro nombre: `/api/admin/masters` y `PUT /api/admin/verifications/{id}`.

**artisan (9 + 1 de subastas):**
- `GET /api/artisan/master`
- `PATCH /api/artisan/master`
- `POST /api/artisan/store/template/{id}`
- `POST /api/artisan/store/unpublish`
- `GET /api/artisan/sales`
- `GET /api/artisan/payouts`
- `POST /api/artisan/order-items/{id}/preparing`
- `POST /api/artisan/order-items/{id}/balance`
- `POST /api/uploads/images`
- `GET /api/artisan/auctions`

## Servicios para `VITE_REAL_SERVICES`

- **Se pueden activar:** `auth`, `notification`, `catalog` (con los detalles visuales del punto 7) y `customOrder`.
- **Deben seguir simulados hasta corregir lo de arriba:**
  - `gallery`: puntos 1 a 4.
  - `auction`: puntos 5 y 6.
  - `commerce`: sin precios no hay nada que comprar.
  - `admin` y `artisan`: faltan rutas.
  - `profile` y `messaging`: no se pudieron probar sin cuenta.
