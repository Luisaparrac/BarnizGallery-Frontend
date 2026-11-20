# MUSEO v2 — Frontend (React + TypeScript + Vite)

Galería 3D y tienda del Barniz de Pasto Mopa-Mopa con tres interfaces: **cliente**, **artesano** y **administrador**.
Implementa solo lo modelado en la v2 (base de datos `V2__marketplace.sql` y lista de correcciones para backend); no agrega funciones nuevas.

## Cómo correrlo

Requisitos: Node 20 o superior.

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run dev               # http://localhost:5173 (3D) y http://localhost:5173/panel.html (panel)
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Revisa tipos (`tsc`) y genera `dist/` |
| `npm run preview` | Sirve la versión compilada en http://localhost:4173 |

## Datos simulados o backend real

El frontend funciona **sin backend**: cada servicio tiene una versión real (`api/`) y una simulada (`mock/`) que guarda los datos en el navegador (`localStorage`).

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL del backend (por defecto `http://localhost:8080`) |
| `VITE_USE_MOCKS` | `true` = todo simulado. `false` = todo contra el backend |
| `VITE_REAL_SERVICES` | Servicios que ya existen en el backend y se usan reales aunque `VITE_USE_MOCKS=true`. Ejemplo: `auth,catalog,gallery` |

Servicios: `auth, catalog, profile, gallery, commerce, auction, customOrder, messaging, notification, artisan, admin`.

Así el equipo puede ir pasando servicio por servicio al backend a medida que la encargada termina cada endpoint.
El enlace **«Restablecer datos de demo»** del pie de página borra los datos simulados.

## Cuentas de prueba (modo simulado)

Contraseña de todas: `museo123`

| Correo | Rol |
|---|---|
| `ana@example.com` | Cliente (idioma preferido inglés) |
| `valderrama@museo.co` | Artesano aprobado (Taller Valderrama) |
| `granja@`, `cabrera@`, `lasso@`, `caguasongo@`, `castrillon@museo.co` | Los demás maestros reales (artesanos aprobados) |
| `nueva@museo.co` | Artesana en verificación |
| `admin@museo.co` | Administrador |

## Qué incluye

- **Bienvenida**: idioma, avatar, cuestionario de gustos (colores, formas, figuras, estilo, presupuesto) y recomendaciones.
- **Experiencia 3D** (`index.html`): plaza con una sala por maestro (cada pieza es su foto enmarcada en la pared), Sala de encargos y Sala de subastas.
- **Panel** (`panel.html`): artesanos y administradores, con su propio inicio de sesión y registro de artesanos.
- **Cliente**: carrito, pago, pasarela, pedidos, favoritos, encargos con diseños de IA y ofertas de artesanos, mensajes, notificaciones, perfil (gustos y direcciones).
- **Artesano**: verificación por pasos, editor de tienda (secciones, plantilla, colores, vista previa), obras, subastas, encargos (ofertar), pedidos por enviar (anticipo y saldo), liquidaciones.
- **Administrador**: verificaciones, usuarios, tiendas, catálogos, configuración (`app_settings`), pujas sospechosas, reportes, ventas y liquidaciones, auditoría.
- Español e inglés (`src/i18n`).

### Galería 3D

Hecha con Babylon.js. Es la plaza de la versión anterior (fuente, quiosco, faroles, vegetación) con las salas abiertas:

- Cada taller publicado es una sala (hasta 6 salas en la plaza, hasta 6 cuadros por sala, en las paredes de la izquierda, la derecha y el fondo, con una banca en el centro).
- Cada pieza es su **foto principal enmarcada** (proporción real, lado mayor de 1,4 m, centro a la altura de los ojos) con paspartú claro, un foco con haz y halo emisivos y una placa con título, maestro, técnica, medidas y precio o estado. Clic o **E** abre el tablero de la pieza.
- Las fotos se dibujan con una segunda cámara (`PhotoPass`) después del post-proceso, así que conservan sus colores reales; la textura es de 1024 px en la sala y 2048 px de cerca.
- **Sala de encargos** (sureste): mostrador, muro con los diseños de IA de mis encargos, pizarra de ofertas y mesa de trabajo.
- **Sala de subastas** (suroeste): podio, las obras en subasta como cuadros y un tablero en vivo con la puja más alta, la cuenta regresiva y el número de pujas; clic o **E** sobre una obra abre su subasta para pujar.
- **WhatsApp**: si el maestro tiene número (columna `whatsapp` de `data/maestros.csv`), el tablero de la pieza y un atril en su sala abren `wa.me` con un mensaje listo.
- **Notificaciones**: campana en el HUD con las no leídas, lista con "Marcar todas como leídas" y avisos emergentes (pago aprobado, oferta nueva, te superaron en una puja, ganaste una subasta).
- Las 2 salas que más coinciden con los gustos del visitante se marcan con una columna de luz.
- Controles: **W A S D** caminar, **Shift** correr, mouse mirar (clic para capturarlo, **Esc** para soltarlo), **V** cambiar cámara.
- En celulares y tabletas sin mouse muestra un aviso.
- Parámetros de URL: `?quality=low|medium|high` (calidad gráfica; baja sola si los FPS caen) y `?debug` (expone `window.museo`).
- Babylon.js pesa ~6 MB y solo lo descarga `index.html`; el panel no lo carga.

### Pasarela de pagos

En modo simulado la pasarela es **de prueba**: no pide datos de tarjeta ni cobra dinero; solo deja elegir «Aprobar» o «Rechazar» y hace lo que haría el webhook.
Con backend real, `POST /api/orders/:orderId/payments` debe devolver `checkoutUrl` (URL externa de la pasarela) y el frontend redirige allí.

### Maestros y obras reales

Los datos simulados usan los 6 maestros reales y sus 21 obras con fotos reales. La fuente es el inventario en `data/`:

- `data/maestros.csv`: clave, nombre, carpeta de fotos, nombre de la tienda (ES/EN), ciudad, avatar, biografía (ES/EN) y `whatsapp` (número en formato internacional, solo dígitos, por ejemplo `573001234567`; vacío = sin botón de WhatsApp).
- `data/obras.csv`: una fila por obra con sus fotos, recorte opcional, forma, colores, figuras, estilo, descripción, precio, medidas (ancho × alto × fondo en cm), modo de venta (`Directa` o `Subasta`) y stock. La columna `precio provisional` marca los precios que aún no son los definitivos.

Dos scripts repetibles (Node 22.18 o superior, sin compilar) pasan el inventario a la app:

```bash
# 1. Fotos: copia los originales optimizados a public/obras/<maestro>/<obra>-<n>.webp
npm run import:obras -- --src "C:\ruta\Obras-BarnizGallery"

# 2. Datos: genera src/services/mock/RealInventory.ts (maestros y obras que usa SeedData)
npm run seed:obras
```

- `import:obras` usa `sharp`: acepta avif, png, webp y jpeg, deja todo en WebP de máximo 1600 px de lado y unos 300 KB, aplica el recorte de la columna `recorte` (`n:izquierda,arriba,ancho,alto` en píxeles de la foto n) y borra de `public/obras/<clave>/` las fotos que ya no estén en el inventario. Los originales solo se leen.
- `--src` es la carpeta con una subcarpeta por maestro (columna `carpeta`). Los originales no están en el repo: solo las WebP optimizadas de `public/obras/<clave>/`.
- Fotos de la misma obra: `Bandeja (2).jpg` es otro ángulo de `Bandeja.jpg`. La foto sin número es la principal; si no existe, la `(1)`. Las demás siguen en orden.
- `RealInventory.ts` no se edita a mano: se cambian los CSV y se corre `seed:obras`, que antes revisa que existan las fotos.

### Diseños de IA y fotos

Las «fotos» de demo son ilustraciones SVG generadas en código (`src/art/`), con URLs `art:...`. Con backend real se usan las URLs de imágenes que devuelva la API.
Los diseños de IA de los encargos también son simulados hasta que el backend conecte el proveedor (`ai.image_provider`).

## Arquitectura

```
src/
  experience/   Experiencia 3D sin React (entrada de index.html)
    world/      Mundo 3D (Babylon.js): plaza, salas, cuadros, salas de encargos y subastas, jugador, cámara
  panel/        Panel React con HashRouter (entrada de panel.html)
  config/       AppConfig: lee las variables .env
  domain/       Tipos del modelo (usuario, galería, comercio, subasta, encargo...)
  services/
    contracts/  Interfaces de cada servicio
    api/        Implementación real (HttpClient + endpoints)
    mock/       Implementación simulada (MockDatabase, reglas, semilla)
    ServiceRegistry.ts  Elige api o mock por servicio
  state/        Contextos: sesión, idioma, catálogos, avisos
  pages/        artisan, admin y shared (usadas por el panel)
  components/   Componentes reutilizables y layout
  art/          Generador de las imágenes de demo
  i18n/         Textos en español e inglés
  styles/       CSS
```

Patrones usados:

| Patrón | Dónde |
|---|---|
| Strategy + Factory | `ServiceRegistry` elige la implementación real o simulada de cada contrato |
| Adapter | `Api*Service` y `Mock*Service` implementan la misma interfaz |
| Singleton | `HttpClient`, `MockDatabase`, `ServiceRegistry` |
| Observer | `Signal` / `AppEvents` (carrito, notificaciones, mensajes) y subastas en vivo |
| Composition root | `PanelApp.tsx` arma proveedores y rutas del panel; `Experience` arma la experiencia 3D |
| Facade | `World` es la única puerta al mundo 3D |
| Template Method | `SceneComponent` y sus partes (`SalaBuilding`, `Kiosk`, `Fountain`...); `PlazaHall` con `CommissionHall` y `AuctionHall` |
| Factory | `MaterialLibrary`, `TextureFactory`, `MeshFactory` |
| Flyweight | `GalleryLights`: los materiales del haz y el halo de los focos, compartidos por todos los cuadros |
| Builder | `HallRoomShell` arma el cuarto de las salas de la plaza |
| Adapter | `WorldRoomsLoader` convierte talleres y obras en salas y cuadros; `CommissionHallLoader` y `AuctionBoardFeed` llenan las salas de encargos y subastas |
| Mediator | `PurchaseFlow`, `CommissionFlow`, `AuctionFlow` deciden qué tablero sigue |
| Observer | `NotificationCenter` (campana y avisos) y `AuctionBoardFeed` (tablero de subastas) |

Convenciones: código en inglés, textos al usuario en español (e inglés). Los enums viajan en mayúsculas en inglés (`PAID`, `ARTISAN`); el backend los convierte a los valores de la base de datos.

## Endpoints que espera el frontend

Propuestos para el backend (todos con `Authorization: Bearer <token>` salvo los públicos).

**Auth y perfil**
```
POST   /api/auth/login | /api/auth/register | /api/auth/logout
POST   /api/auth/forgot-password | /api/auth/verify-email
GET    /api/users/me            PATCH /api/users/me
GET    /api/users/me/taste-profile     PUT /api/users/me/taste-profile
POST   /api/users/me/recommendations?strategy=...
POST   /api/recommendations/preview    POST /api/interactions
GET    /api/users/me/addresses   POST /api/users/me/addresses
PUT    /api/users/me/addresses/:id     DELETE /api/users/me/addresses/:id
POST   /api/uploads/images       (multipart, campo "file")
```

**Catálogos y galería**
```
GET    /api/catalogs
POST   /api/admin/catalogs/:kind       PUT /api/admin/catalogs/:kind/:id
GET    /api/artworks             GET /api/artworks/:slug
GET    /api/stores               GET /api/stores/:slug
GET    /api/favorites            POST /api/favorites/:artworkId/toggle
POST   /api/reports
```

**Carrito, pedidos y pagos**
```
GET    /api/cart                 POST /api/cart/items
PUT    /api/cart/items/:artworkId      DELETE /api/cart/items/:artworkId
POST   /api/orders/checkout      GET /api/orders      GET /api/orders/:orderId
POST   /api/orders/:orderId/cancel
POST   /api/orders/:orderId/payments   GET /api/payments/:paymentId
```

**Subastas**
```
GET    /api/auctions             GET /api/auctions/:id
GET    /api/auctions/:id/bids    POST /api/auctions/:id/bids
POST   /api/auctions             POST /api/auctions/:id/cancel
GET    /api/artisan/auctions
```

**Encargos con IA**
```
GET    /api/custom-requests      POST /api/custom-requests
GET    /api/custom-requests/:id  PUT /api/custom-requests/:id
POST   /api/custom-requests/:id/designs
POST   /api/custom-requests/:id/designs/:designId/select
POST   /api/custom-requests/:id/publish | /cancel
POST   /api/custom-requests/:id/offers
POST   /api/custom-requests/:id/offers/:offerId/accept | /reject | /withdraw
GET    /api/artisan/custom-requests/open | /accepted
```

**Mensajes y notificaciones**
```
GET    /api/conversations        POST /api/conversations
GET    /api/conversations/:id/messages  POST /api/conversations/:id/messages
GET    /api/notifications        GET /api/notifications/unread-count
POST   /api/notifications/:id/read      POST /api/notifications/read-all
```

**Artesano**
```
GET    /api/artisan/master       PATCH /api/artisan/master
GET    /api/artisan/verification POST /api/artisan/verification/:step
GET    /api/artisan/store        PUT /api/artisan/store
POST   /api/artisan/store/template/:templateId
POST   /api/artisan/store/publish | /unpublish
GET    /api/artisan/artworks     POST /api/artisan/artworks
GET    /api/artisan/artworks/:id PUT /api/artisan/artworks/:id   DELETE /api/artisan/artworks/:id
GET    /api/artisan/sales        GET /api/artisan/payouts
GET    /api/artisan/order-items
POST   /api/artisan/order-items/:itemId/preparing | /shipped | /delivered | /balance
```

**Administración**
```
GET    /api/admin/dashboard
GET    /api/admin/verifications  POST /api/admin/verifications/steps/:stepId
GET    /api/admin/users          PATCH /api/admin/users/:id
GET    /api/admin/stores         PATCH /api/admin/stores/:storeId
GET    /api/admin/settings       PUT /api/admin/settings/:key
GET    /api/admin/bids/suspicious      POST /api/admin/bids/:bidId/valid
GET    /api/admin/reports        PATCH /api/admin/reports/:id
GET    /api/admin/sales
GET    /api/admin/payouts        POST /api/admin/payouts     POST /api/admin/payouts/:id/paid
GET    /api/admin/audit
```

Errores: el backend debe responder `{ "code": "...", "message": "..." }`. El frontend traduce el `code` (ver `error.*` en `src/i18n/messages/common.ts`).

## Patrones de la interfaz

Los tableros de la experiencia 3D (iniciar sesión, pago, carrito, pieza, controles…) no dependen de cómo se dibujan.

- **`UiKit` (Abstract Factory)** — `src/experience/ui/kit/UiKit.ts` es una interfaz que fabrica las piezas de un tablero: títulos, textos, campos, botones, tarjetas seleccionables, resumen del pedido, pasos, galería, etc. Los nodos son opacos: una vista solo los mete en cajas y usa unos pocos métodos (`setText`, `setEnabled`, `value`…).
- **Dos fábricas concretas:**
  - `DomUiKit`: HTML y CSS sobre el canvas (`dom-ui.css`). Texto nítido, campos reales con `autocomplete` y foco accesible.
  - `BabylonUiKit`: Babylon GUI en un tablero dentro del mundo 3D.
- **Bridge** — las vistas (`BoardView` y sus subclases, en `src/experience/ui/views`) son la abstracción y la fábrica más su superficie (`DomPanelSurface` o `BabylonPanelSurface`) son la implementación. `PanelSurface` elige la implementación sin que las vistas cambien.
- **Template Method** — `BoardView` fija la estructura del tablero (encabezado, título, contenido y botones) y `BoardFormView` agrega la validación, el error y el envío con Enter.
- **Mediator** — `PurchaseFlow` decide qué tablero sigue en la compra; los tableros no se conocen entre sí.

### Cómo probar las dos fábricas

1. `npm run dev`
2. Abre `http://localhost:5173/`: los tableros salen en HTML (por defecto).
3. Abre `http://localhost:5173/?ui=babylon`: los mismos tableros salen dibujados con Babylon GUI dentro del mundo 3D, con marco de madera. Hay pequeñas diferencias visuales; por ejemplo, la tarjeta "Agregar dirección" tiene borde sólido porque Babylon GUI no dibuja bordes punteados.
4. Con `?debug` aparece abajo a la izquierda un contador de FPS y draw calls.
