# MUSEO – Frontend 3D (Babylon.js + TypeScript)

Galería virtual inmersiva del Barniz de Pasto Mopa-Mopa. Plaza abierta con fuente, quiosco de bienvenida y seis salas de maestros. Se conecta al backend BarnizGallery (REST).

## Ejecutar
```bash
npm install
cp .env.example .env      # VITE_API_URL=https://tu-backend (o http://localhost:8080)
npm run dev               # http://localhost:5173
npm run build             # typecheck + producción
```
URL params: `?quality=low|medium|high`, `?lang=es|en`, `?debug` (expone `window.museo`).
El render calidad "high" baja solo de nivel si los FPS son bajos.

## Arquitectura (POO, una clase por archivo, código en inglés)
| Carpeta | Contenido | Patrones |
|---|---|---|
| `core/` | `Signal`, `QualityManager`, `AppConfig`, `ValueNoise`, `SeededRandom` | Observer |
| `model/` | DTOs del backend | |
| `data/` | `RoomDefinition`, `RoomCatalog` (6 salas) | |
| `i18n/` | `LocaleService` (ES/EN), traducciones, opciones del quiosco | Singleton |
| `api/` | `ApiClient`, `BackendConnection`, `GalleryRepository`, `RecommendationService`, estrategias `Remote`/`Demo`, `VisitorSession` | Strategy |
| `world/` | `World` (fachada), `SceneComponent` y sus subclases (`Terrain`, `Plaza`, `Fountain`, `Kiosk`, `SalaBuilding`, …), `MaterialLibrary`, `TextureFactory`, `ShadowRig`, `PostProcessing`, `PlayerController`, `CameraRig`, `InputController`, `InteractionSystem` | Facade, Factory, Template Method |
| `ui/` | `Hud` + componentes (`TopBar`, `IntroScreen`, `KioskModal`, …) | Composite |
| `app/` | `Application` (composition root) | |

## Gráficos
Materiales PBR (barniz con clear-coat), sombras en cascada, SSAO, rayos de luz, bloom, tone-mapping ACES, cielo en degradé, terreno con volcán Galeras, texturas procedurales con normal maps, mallas fusionadas por material.

## Notas
- El backend no trae datos semilla: sin datos o sin conexión el HUD muestra "Modo demo" y el quiosco usa recomendaciones de demostración (marcadas).
- El plan gratuito de Render duerme; la primera conexión puede tardar ~1 min.
- Pendiente: interior de las salas (GLB), interacciones, subastas por STOMP, móvil.
