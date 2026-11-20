# Accesos por rol para el backend

Esta es la matriz de accesos que ya aplica el frontend: la experiencia 3D, el panel y los servicios simulados (`src/services/mock`). La regla está en un solo lugar, `src/core/AccessPolicy.ts`. El backend debe aplicar la misma para que el frontend real se comporte igual que el simulado.

## Roles

| Rol | Quién es |
|---|---|
| **Visitante** | Nadie inició sesión (sin token). |
| **CUSTOMER** | Cliente: compra, puja, pide encargos y guarda favoritos. |
| **ARTISAN** | Maestro artesano. Antes de que la administración lo apruebe (`masters.verification_status <> 'APPROVED'`) solo puede usar su perfil y la verificación. |
| **ADMIN** | Administración de MUSEO. |

## Respuesta cuando no se permite

- **Sin token** en un endpoint que lo pide: `401` con `{ "code": "unauthorized", "message": "Sign in to continue" }`.
- **Token de un rol que no puede usar el endpoint**, o artesano sin aprobar en un endpoint de artesano aprobado: `403` con `{ "code": "forbidden", "message": "Not allowed for this role" }`.
- **Cuenta suspendida o borrada:** `403` con `{ "code": "suspended", ... }`.
- **Recurso de otro usuario** (el pedido, el encargo o la obra de otra persona): `404`, para no revelar que existe.

## Matriz general

| Acción | Visitante | Cliente | Artesano | Admin |
|---|:---:|:---:|:---:|:---:|
| Recorrer el 3D, ver obras, tiendas y subastas, quiosco de gustos | ✅ | ✅ | ✅ | ✅ |
| Carrito, comprar, pagar, mis pedidos, direcciones | 🔒 inicia sesión | ✅ | ❌ | ❌ |
| Pujar | 🔒 inicia sesión | ✅ | ❌ | ❌ |
| Pedir encargos (crear, diseños IA, publicar, aceptar ofertas, anticipo) | 🔒 inicia sesión | ✅ | ❌ | ❌ |
| Favoritos | 🔒 inicia sesión | ✅ | ❌ | ❌ |
| Notificaciones, perfil, mensajes, reportar contenido | ❌ | ✅ | ✅ | ✅ |
| Panel (`panel.html`) | ❌ | ❌ | ✅ | ✅ |
| Verificación del taller | ❌ | ❌ | ✅ (aprobado o no) | ❌ |
| Su tienda, sus obras, sus pedidos, sus encargos, sus subastas, ventas y liquidaciones | ❌ | ❌ | ✅ solo aprobado | ❌ |
| Administración completa | ❌ | ❌ | ❌ | ✅ |

## Por endpoint

**Público** = sin token. **Sesión** = cualquier rol con sesión. **Artesano aprobado** = rol ARTISAN y maestro con `verification_status = 'APPROVED'`.

### Autenticación y perfil

| Endpoint | Roles |
|---|---|
| `POST /api/auth/login`, `/register`, `/forgot-password`, `/verify-email` | Público |
| `POST /api/auth/logout` | Sesión |
| `GET /api/users/me`, `PATCH /api/users/me` | Sesión |
| `GET /api/users/me/taste-profile`, `PUT /api/users/me/taste-profile` | Sesión |
| `POST /api/users/me/recommendations` | Sesión |
| `POST /api/recommendations/preview` | Público (quiosco de gustos del visitante) |
| `POST /api/interactions` | Público (con token se asocia al usuario) |
| `GET/POST /api/users/me/addresses`, `PUT/DELETE /api/users/me/addresses/:id` | CUSTOMER |
| `POST /api/uploads/images` | Sesión |

### Catálogos y galería

| Endpoint | Roles |
|---|---|
| `GET /api/catalogs` | Público |
| `POST /api/admin/catalogs/:kind`, `PUT /api/admin/catalogs/:kind/:id` | ADMIN |
| `GET /api/artworks`, `GET /api/artworks/:slug` | Público |
| `GET /api/stores`, `GET /api/stores/:slug` | Público (las tiendas sin publicar solo las ve su dueño o ADMIN) |
| `GET /api/favorites`, `POST /api/favorites/:artworkId/toggle` | CUSTOMER |
| `POST /api/reports` | Sesión |

### Carrito, pedidos y pagos

| Endpoint | Roles |
|---|---|
| `GET /api/cart`, `POST /api/cart/items`, `PUT/DELETE /api/cart/items/:artworkId` | CUSTOMER |
| `POST /api/orders/checkout` | CUSTOMER |
| `GET /api/orders`, `GET /api/orders/:orderId`, `POST /api/orders/:orderId/cancel` | CUSTOMER (solo sus pedidos) |
| `POST /api/orders/:orderId/payments`, `GET /api/payments/:paymentId` | CUSTOMER (solo sus pedidos) |
| Webhook de la pasarela | Público, validado con la firma de la pasarela |

### Subastas

| Endpoint | Roles |
|---|---|
| `GET /api/auctions`, `GET /api/auctions/:id`, `GET /api/auctions/:id/bids` | Público (en el historial, los nombres de los postores van enmascarados: «A*** C.») |
| `POST /api/auctions/:id/bids` | CUSTOMER |
| `POST /api/auctions`, `GET /api/artisan/auctions` | Artesano aprobado (solo obras de su tienda) |
| `POST /api/auctions/:id/cancel` | Artesano aprobado dueño de la obra, o ADMIN |
| Canal en vivo `/topic/auctions/{id}` | Público (solo lectura) |

### Encargos

| Endpoint | Roles |
|---|---|
| `GET /api/custom-requests`, `POST /api/custom-requests` | CUSTOMER |
| `GET /api/custom-requests/:id`, `PUT /api/custom-requests/:id` | CUSTOMER dueño del encargo |
| `POST /api/custom-requests/:id/designs`, `/designs/:designId/select`, `/publish`, `/cancel` | CUSTOMER dueño del encargo |
| `POST /api/custom-requests/:id/offers/:offerId/accept`, `/reject` | CUSTOMER dueño del encargo |
| `GET /api/artisan/custom-requests/open` | Artesano aprobado (abiertos a todos y dirigidos a él, sin los que rechazó). El nombre del cliente va enmascarado. |
| `GET /api/artisan/custom-requests/accepted`, `/declined` | Artesano aprobado (los suyos) |
| `POST /api/custom-requests/:id/offers` | Artesano aprobado (encargo abierto a todos o dirigido a él) |
| `POST /api/custom-requests/:id/offers/:offerId/withdraw` | Artesano aprobado dueño de la oferta |
| `POST /api/custom-requests/:id/decline` (body `{ "reason": string \| null }`) | Artesano aprobado. Si el encargo era para él, se avisa al cliente. |

### Mensajes y notificaciones

| Endpoint | Roles |
|---|---|
| `GET/POST /api/conversations`, `GET/POST /api/conversations/:id/messages` | Sesión (solo las conversaciones donde participa) |
| `GET /api/notifications`, `GET /api/notifications/unread-count` | Sesión (solo las suyas) |
| `POST /api/notifications/:id/read`, `POST /api/notifications/read-all` | Sesión (solo las suyas) |

### Artesano

| Endpoint | Roles |
|---|---|
| `GET /api/artisan/master`, `PATCH /api/artisan/master` | ARTISAN (aprobado o no) |
| `GET /api/artisan/verification`, `POST /api/artisan/verification/:step` | ARTISAN (aprobado o no) |
| `GET/PUT /api/artisan/store`, `POST /api/artisan/store/template/:templateId`, `/publish`, `/unpublish` | Artesano aprobado |
| `GET/POST /api/artisan/artworks`, `GET/PUT/DELETE /api/artisan/artworks/:id` | Artesano aprobado (solo sus obras) |
| `GET /api/artisan/sales`, `GET /api/artisan/payouts` | Artesano aprobado |
| `GET /api/artisan/order-items`, `POST /api/artisan/order-items/:itemId/preparing \| shipped \| delivered \| balance` | Artesano aprobado (solo ítems de su tienda) |

### Administración

| Endpoint | Roles |
|---|---|
| Todos los `/api/admin/...` (dashboard, verificaciones, usuarios, tiendas, catálogos, configuración, pujas sospechosas, reportes, ventas, liquidaciones, auditoría) | ADMIN |

## Notificaciones que generan estas acciones

- **Encargo publicado:** a los artesanos aprobados, o solo al artesano al que va dirigido («Un cliente te pidió un encargo»).
- **Oferta enviada (el maestro acepta un encargo):** al cliente, `NEW_CUSTOM_OFFER`.
- **El cliente acepta la oferta:** al maestro, `OFFER_ACCEPTED`; a los demás que ofertaron, `OFFER_REJECTED`.
- **El maestro rechaza un encargo dirigido a él:** al cliente, `SYSTEM` con el motivo.
- **Pago aprobado:** al cliente, `PAYMENT_APPROVED`; al maestro, `NEW_ORDER`.
- **Te superaron en una puja:** al anterior líder, `OUTBID`.
- **Subasta ganada:** al ganador, `AUCTION_WON`.
