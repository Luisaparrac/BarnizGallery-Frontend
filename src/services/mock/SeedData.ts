import { ArtImageCodec } from "../../art/ArtImageSpec";
import type { AppSetting } from "../../domain/admin";
import type { Catalogs, SectionType, StoreTemplate } from "../../domain/catalog";
import type { Id } from "../../domain/common";
import type { OrderItem, Payment } from "../../domain/commerce";
import type { Master, Photo, SaleMode, ArtworkStatus, Store, StoreSection, VerificationStep } from "../../domain/gallery";
import type { ArtworkRow, MockTables, OrderRow, UserRow } from "./MockTables";

/** SHA-256 of "museo:museo123": every demo account uses the password museo123. */
const DEMO_PASSWORD_HASH = "e44382dafd6b4c136f69cdddd082e972a5f63caeebdf641390c269ba09a23f42";

const DAY = 86_400_000;
const at = (offsetDays: number, hours = 0): string => new Date(Date.now() + offsetDays * DAY + hours * 3_600_000).toISOString();

const SECTION_TEXT: Record<SectionType, { titleEs: string; titleEn: string; contentEs: string; contentEn: string }> = {
  COVER: { titleEs: "Bienvenidos al taller", titleEn: "Welcome to the workshop", contentEs: "Piezas de barniz de Pasto hechas a mano en Pasto, Nariño.", contentEn: "Barniz de Pasto pieces handmade in Pasto, Nariño." },
  STORY: { titleEs: "Historia del maestro", titleEn: "The master's story", contentEs: "Texto de ejemplo: aquí el maestro cuenta cómo aprendió el oficio y qué lo inspira. Reemplazar con la biografía real.", contentEn: "Sample text: here the master tells how they learned the craft and what inspires them. Replace with the real biography." },
  TECHNIQUE: { titleEs: "La técnica", titleEn: "The technique", contentEs: "La resina del mopa-mopa se limpia, se tiñe, se estira en láminas muy delgadas y se recorta a mano sobre la madera.", contentEn: "The mopa-mopa resin is cleaned, dyed, stretched into very thin sheets and cut by hand onto the wood." },
  WORKSHOP: { titleEs: "El taller", titleEn: "The workshop", contentEs: "Texto de ejemplo sobre el taller: quiénes trabajan en él y cómo visitarlo.", contentEn: "Sample text about the workshop: who works there and how to visit it." },
  GALLERY: { titleEs: "Obras", titleEn: "Works", contentEs: "", contentEn: "" },
  CATALOG: { titleEs: "Catálogo", titleEn: "Catalog", contentEs: "", contentEn: "" },
  FEATURED: { titleEs: "Destacadas", titleEn: "Featured", contentEs: "", contentEn: "" },
  AUCTIONS: { titleEs: "Subastas", titleEn: "Auctions", contentEs: "", contentEn: "" },
  CUSTOM_ORDERS: { titleEs: "Encargos", titleEn: "Custom orders", contentEs: "Este taller acepta encargos: describe la pieza que quieres y recibe una oferta.", contentEn: "This workshop takes custom orders: describe the piece you want and get an offer." },
  CONTACT: { titleEs: "Contacto", titleEn: "Contact", contentEs: "Escríbele al maestro desde MUSEO.", contentEn: "Write to the master through MUSEO." },
  FREE_TEXT: { titleEs: "", titleEn: "", contentEs: "", contentEn: "" },
};

interface ArtworkSeed {
  es: string;
  en: string;
  shape: number;
  style: number;
  colors: number[];
  motifs: number[];
  mode: SaleMode;
  status: ArtworkStatus;
  price: number | null;
  size: [number, number, number];
}

/** Demo data: catalogs, six master stores with works, customers, orders, auctions and custom orders. */
export class SeedData {
  static build(): MockTables {
    const tables: MockTables = {
      catalogs: SeedData.catalogs(),
      users: [],
      masters: [],
      verifications: [],
      stores: [],
      artworks: [],
      favorites: [],
      tastes: [],
      interactions: [],
      recommendations: [],
      addresses: [],
      carts: [],
      orders: [],
      payments: [],
      paymentEvents: [],
      payouts: [],
      auctions: [],
      bids: [],
      customRequests: [],
      offers: [],
      conversations: [],
      messages: [],
      notifications: [],
      settings: SeedData.settings(),
      reports: [],
      audit: [],
      aiUsage: [],
      counters: {},
    };
    SeedData.people(tables);
    SeedData.stores(tables);
    SeedData.works(tables);
    SeedData.commerce(tables);
    SeedData.customOrders(tables);
    SeedData.conversations(tables);
    SeedData.activity(tables);
    SeedData.counters(tables);
    return tables;
  }

  static catalogs(): Catalogs {
    const item = (id: number, code: string, nameEs: string, nameEn: string) => ({ id, code, nameEs, nameEn, sortOrder: id, isActive: true });
    const template = (id: number, code: string, nameEs: string, nameEn: string, descriptionEs: string, descriptionEn: string, defaultLayout: SectionType[], theme: StoreTemplate["defaultTheme"]): StoreTemplate => ({
      id, code, nameEs, nameEn, descriptionEs, descriptionEn, previewUrl: `/templates/${code}.png`, defaultLayout, defaultTheme: theme, sortOrder: id, isActive: true,
    });
    return {
      colors: [
        ["rojo", "Rojo", "Red", "#B3261E"], ["verde", "Verde", "Green", "#2E7D32"], ["amarillo", "Amarillo", "Yellow", "#F2C230"],
        ["naranja", "Naranja", "Orange", "#E07B24"], ["azul", "Azul", "Blue", "#1F4E9C"], ["morado", "Morado", "Purple", "#6B3FA0"],
        ["rosado", "Rosado", "Pink", "#D9668B"], ["cafe", "Café", "Brown", "#6B4226"], ["negro", "Negro", "Black", "#1A1A1A"],
        ["blanco", "Blanco", "White", "#F5F1E8"], ["dorado", "Dorado", "Gold", "#C9A227"], ["plateado", "Plateado", "Silver", "#B8BCC2"],
        ["multicolor", "Multicolor", "Multicolor", null],
      ].map(([code, es, en, hex], index) => ({ ...item(index + 1, code as string, es as string, en as string), hex: hex as string | null })),
      shapes: [
        ["bandeja", "Bandeja", "Tray"], ["caja", "Caja / cofre", "Box / chest"], ["jarron", "Jarrón", "Vase"], ["plato", "Plato", "Plate"],
        ["cuenco", "Cuenco / totuma", "Bowl"], ["joyero", "Joyero", "Jewelry box"], ["mascara", "Máscara", "Mask"], ["escultura", "Escultura / figura", "Sculpture"],
        ["marco", "Marco / espejo", "Frame / mirror"], ["cuadro", "Cuadro decorativo", "Wall panel"], ["mueble", "Mueble", "Furniture"], ["accesorio", "Accesorio / joya", "Accessory"],
      ].map(([code, es, en], index) => item(index + 1, code, es, en)),
      motifs: [
        ["floral", "Floral", "Floral"], ["zoomorfo", "Animales (zoomorfo)", "Animals (zoomorphic)"], ["precolombino", "Precolombino", "Pre-Columbian"],
        ["geometrico", "Geométrico", "Geometric"], ["paisaje", "Paisaje andino", "Andean landscape"], ["antropomorfo", "Figura humana", "Human figure"],
        ["religioso", "Religioso", "Religious"], ["abstracto", "Abstracto", "Abstract"],
      ].map(([code, es, en], index) => item(index + 1, code, es, en)),
      styles: [
        ["tradicional", "Tradicional", "Traditional"], ["contemporaneo", "Contemporáneo", "Contemporary"], ["fusion", "Fusión", "Fusion"],
      ].map(([code, es, en], index) => item(index + 1, code, es, en)),
      budgets: [
        ["0-100", "Hasta 100", "Up to 100", 0, 100], ["100-300", "100 – 300", "100 – 300", 100, 300],
        ["300-800", "300 – 800", "300 – 800", 300, 800], ["800+", "Más de 800", "Over 800", 800, null],
      ].map(([code, es, en, min, max], index) => ({ ...item(index + 1, code as string, es as string, en as string), minAmount: min as number, maxAmount: max as number | null, currency: "USD" })),
      avatars: [
        ["artesano", "Artesano", "Artisan (man)"], ["artesana", "Artesana", "Artisan (woman)"], ["coleccionista", "Coleccionista", "Collector"],
        ["viajera", "Viajera", "Traveler"], ["estudiante", "Estudiante", "Student"], ["curadora", "Curadora", "Curator"],
        ["colibri", "Colibrí", "Hummingbird"], ["condor", "Cóndor", "Condor"],
      ].map(([code, es, en], index) => ({ ...item(index + 1, code, es, en), imageUrl: `/avatars/${code}.svg` })),
      templates: [
        template(1, "taller", "Taller clásico", "Classic workshop", "Portada con foto del taller, historia del maestro y galería en cuadrícula.", "Workshop cover photo, the master's story and a grid gallery.",
          ["COVER", "STORY", "GALLERY", "CUSTOM_ORDERS", "CONTACT"], { primary: "#7A1F1A", accent: "#C9A227", background: "#F5F1E8", font: "serif" }),
        template(2, "galeria", "Galería minimalista", "Minimal gallery", "Fondo claro, fotos grandes y pocas palabras: la obra es la protagonista.", "Light background, large photos and few words: the artwork comes first.",
          ["COVER", "FEATURED", "GALLERY", "CONTACT"], { primary: "#1A1A1A", accent: "#B3261E", background: "#FFFFFF", font: "sans" }),
        template(3, "vitrina", "Vitrina de tienda", "Shop window", "Pensada para vender: precios visibles, filtros por color y forma, botón de compra.", "Built to sell: visible prices, color and shape filters, buy button.",
          ["COVER", "FEATURED", "CATALOG", "AUCTIONS", "CUSTOM_ORDERS", "CONTACT"], { primary: "#2E7D32", accent: "#F2C230", background: "#FAF7F0", font: "sans" }),
        template(4, "relato", "Relato del maestro", "Master's story", "Recorrido narrativo: la historia del maestro, su técnica y sus piezas en orden.", "Narrative journey: the master's story, technique and pieces in order.",
          ["COVER", "STORY", "TECHNIQUE", "GALLERY", "WORKSHOP", "CONTACT"], { primary: "#6B4226", accent: "#E07B24", background: "#F7EFE4", font: "serif" }),
      ],
    };
  }

  static settings(): AppSetting[] {
    const now = at(0);
    const setting = (key: string, value: AppSetting["value"], description: string, isPublic: boolean): AppSetting => ({ key, value, description, isPublic, updatedAt: now });
    return [
      setting("currency.default", "USD", "Moneda de precios, subastas y pagos", true),
      setting("languages.supported", ["es", "en"], "Idiomas de la interfaz", true),
      setting("commerce.platform_fee_percent", 10, "Comisión que MUSEO cobra en cada venta (%)", false),
      setting("commerce.shipping_flat_cost", 25, "Costo fijo de envío internacional por pedido", true),
      setting("commerce.cart_reservation_minutes", 30, "Minutos que una pieza única queda reservada durante el pago", false),
      setting("auction.min_increment", 1, "Incremento mínimo por defecto entre pujas", true),
      setting("auction.max_bids_per_minute", 5, "Pujas permitidas por usuario por minuto", false),
      setting("auction.suspicious_multiplier", 10, "Una puja mayor a este número × la referencia se marca como sospechosa", false),
      setting("auction.winner_payment_hours", 48, "Horas que tiene el ganador de una subasta para pagar", true),
      setting("custom_orders.deposit_percent", 50, "Anticipo que se paga al aceptar la oferta de un encargo (%)", true),
      setting("custom_orders.expiry_days", 15, "Días que un encargo publicado sigue abierto", true),
      setting("custom_orders.max_ai_designs", 4, "Diseños de IA que un cliente puede generar por encargo", true),
      setting("ai.text_provider", "none", "Proveedor de IA para texto (none, gemini, openai, claude)", false),
      setting("ai.image_provider", "none", "Proveedor de IA para las imágenes de encargos", false),
      setting("payments.gateway", "simulada", "Pasarela activa (simulada, wompi, paypal, mercadopago)", false),
      setting("payments.sandbox", true, "Usar el entorno de prueba de la pasarela", false),
      setting("stores.require_admin_approval", true, "Las tiendas necesitan un artesano aprobado para publicarse", false),
    ];
  }

  private static user(id: Id, fullName: string, email: string, role: UserRow["role"], extra: Partial<UserRow> = {}): UserRow {
    return {
      id, email, fullName, role, status: "ACTIVE", avatarId: null, preferredLanguage: "es", countryCode: "CO", phone: null,
      emailVerified: true, createdAt: at(-120), lastLoginAt: null, passwordHash: DEMO_PASSWORD_HASH, ...extra,
    };
  }

  private static people(t: MockTables): void {
    t.users.push(SeedData.user(1, "Administración MUSEO", "admin@museo.co", "ADMIN", { avatarId: 6 }));
    const masters: [string, string, string, number][] = [
      ["Richard Valderrama", "valderrama", "Taller Valderrama", 1],
      ["José Naria", "naria", "Taller Naria", 1],
      ["María Cabrera", "cabrera", "Taller Cabrera", 2],
      ["Ricardo Hernaza", "hernaza", "Taller Hernaza", 1],
      ["David Uzcátegui", "uzcategui", "Taller Uzcátegui", 1],
      ["Wilson Chávez", "chavez", "Taller Chávez", 1],
    ];
    masters.forEach(([name, key, workshop, avatarId], index) => {
      const userId = index + 2;
      const masterId = index + 1;
      t.users.push(SeedData.user(userId, name, `${key}@museo.co`, "ARTISAN", { avatarId }));
      t.masters.push(SeedData.master(masterId, userId, name, key, workshop, "APPROVED"));
      SeedData.steps(t, masterId, "APPROVED");
    });
    t.users.push(SeedData.user(8, "Carolina Benavides", "nueva@museo.co", "ARTISAN", { status: "PENDING", avatarId: 2, createdAt: at(-3) }));
    t.masters.push(SeedData.master(7, 8, "Carolina Benavides", "benavides", "Taller Benavides", "IN_REVIEW"));
    SeedData.steps(t, 7, "MIXED");

    t.users.push(SeedData.user(9, "Ana Collins", "ana@example.com", "CUSTOMER", { avatarId: 4, preferredLanguage: "en", countryCode: "US", createdAt: at(-40) }));
    t.users.push(SeedData.user(10, "Kenji Morita", "kenji@example.com", "CUSTOMER", { avatarId: 3, preferredLanguage: "en", countryCode: "JP", createdAt: at(-25) }));
    t.users.push(SeedData.user(11, "Lucía Gómez", "lucia@example.com", "CUSTOMER", { avatarId: 5, countryCode: "CO", createdAt: at(-10) }));

    t.addresses.push(
      { id: 1, userId: 9, recipientName: "Ana Collins", line1: "245 Hudson St, Apt 3B", line2: null, city: "New York", region: "NY", postalCode: "10013", countryCode: "US", phone: "+1 212 555 0148", isDefault: true },
      { id: 2, userId: 10, recipientName: "Kenji Morita", line1: "2-11-3 Meguro", line2: null, city: "Tokyo", region: null, postalCode: "153-0063", countryCode: "JP", phone: null, isDefault: true },
    );
    t.tastes.push({ userId: 9, profile: { colorIds: [1, 11], shapeIds: [1, 6], styleIds: [1], motifIds: [2], budgetRangeId: 2 }, updatedAt: at(-40) });
  }

  private static master(id: Id, userId: Id, name: string, key: string, workshop: string, status: Master["verificationStatus"]): Master {
    return {
      id, userId, name, slug: key, city: "Pasto", workshop,
      biographyEs: `Biografía de ejemplo de ${name}. Reemplazar con la biografía real del maestro.`,
      biographyEn: `Sample biography of ${name}. Replace with the master's real biography.`,
      profilePhotoUrl: null, verificationStatus: status, verifiedAt: status === "APPROVED" ? at(-100) : null,
    };
  }

  private static steps(t: MockTables, masterId: Id, mode: "APPROVED" | "MIXED"): void {
    const types: VerificationStep["step"][] = ["EMAIL", "IDENTITY", "WORKSHOP", "SAMPLES", "ADMIN_APPROVAL"];
    const mixed: VerificationStep["status"][] = ["APPROVED", "SUBMITTED", "SUBMITTED", "PENDING", "PENDING"];
    types.forEach((step, index) => {
      const status = mode === "APPROVED" ? "APPROVED" : mixed[index];
      t.verifications.push({
        id: t.verifications.length + 1,
        masterId,
        step,
        status,
        evidenceUrl: status === "SUBMITTED" ? ArtImageCodec.encode({ shape: "cuadro", motif: "geometrico", colors: ["#6B4226", "#F5F1E8"], seed: 900 + index, view: "front" }) : null,
        notes: null,
        reviewedAt: status === "APPROVED" ? at(-2) : null,
      });
    });
  }

  private static stores(t: MockTables): void {
    const templates = [1, 2, 4, 3, 1, 3];
    t.masters.forEach((master, index) => {
      const templateId = master.id === 7 ? 1 : templates[index];
      const template = t.catalogs.templates.find((item) => item.id === templateId)!;
      const store: Store = {
        id: master.id,
        masterId: master.id,
        slug: master.slug,
        nameEs: `Taller ${master.name}`,
        nameEn: `${master.name} Workshop`,
        descriptionEs: `Barniz de Pasto del taller de ${master.name}.`,
        descriptionEn: `Barniz de Pasto from ${master.name}'s workshop.`,
        templateId,
        status: master.verificationStatus === "APPROVED" ? "PUBLISHED" : "DRAFT",
        logoUrl: null,
        bannerUrl: ArtImageCodec.encode({ shape: "bandeja", motif: ["floral", "precolombino", "zoomorfo", "geometrico", "paisaje", "abstracto", "floral"][index], colors: [], seed: 500 + master.id, view: "detail" }),
        theme: {},
        acceptsCustomOrders: true,
        sections: SeedData.sections(template.defaultLayout, master.id * 100),
        publishedAt: master.verificationStatus === "APPROVED" ? at(-90) : null,
      };
      t.stores.push(store);
    });
  }

  static sections(layout: SectionType[], firstId: Id): StoreSection[] {
    return layout.map((type, index) => ({ id: firstId + index, type, ...SECTION_TEXT[type], imageUrl: null, sortOrder: index, isVisible: true }));
  }

  private static works(t: MockTables): void {
    const seeds: ArtworkSeed[][] = [
      [
        { es: "Bandeja de colibríes", en: "Hummingbird tray", shape: 1, style: 1, colors: [1, 2, 11], motifs: [2, 1], mode: "SALE", status: "EXHIBITED", price: 240, size: [42, 30, 3] },
        { es: "Cofre de la cosecha", en: "Harvest chest", shape: 2, style: 1, colors: [1, 3, 9], motifs: [1], mode: "SALE", status: "EXHIBITED", price: 310, size: [28, 18, 16] },
        { es: "Plato del sol de los pastos", en: "Plate of the Pasto sun", shape: 4, style: 1, colors: [3, 4, 1], motifs: [3], mode: "AUCTION", status: "IN_AUCTION", price: null, size: [36, 36, 3] },
        { es: "Joyero de flores rojas", en: "Red flower jewelry box", shape: 6, style: 1, colors: [1, 10, 2], motifs: [1], mode: "SALE", status: "EXHIBITED", price: 150, size: [16, 10, 9] },
      ],
      [
        { es: "Jarrón de la laguna", en: "Lagoon vase", shape: 3, style: 2, colors: [5, 2, 10], motifs: [5], mode: "SALE", status: "SOLD", price: 420, size: [18, 34, 18] },
        { es: "Cuenco de geometrías", en: "Bowl of geometries", shape: 5, style: 2, colors: [9, 11], motifs: [4], mode: "SALE", status: "EXHIBITED", price: 180, size: [24, 12, 24] },
        { es: "Panel de montañas", en: "Mountain panel", shape: 10, style: 2, colors: [5, 2, 8], motifs: [5], mode: "EXHIBITION", status: "EXHIBITED", price: null, size: [40, 60, 2] },
        { es: "Caja negra y oro", en: "Black and gold box", shape: 2, style: 2, colors: [9, 11], motifs: [4], mode: "SALE", status: "EXHIBITED", price: 260, size: [22, 12, 12] },
      ],
      [
        { es: "Máscara del carnaval", en: "Carnival mask", shape: 7, style: 1, colors: [13], motifs: [6, 1], mode: "SALE", status: "EXHIBITED", price: 340, size: [22, 30, 10] },
        { es: "Bandeja de la abuela", en: "Grandmother's tray", shape: 1, style: 1, colors: [1, 2, 3], motifs: [1], mode: "SALE", status: "EXHIBITED", price: 210, size: [38, 26, 3] },
        { es: "Escultura de cóndor", en: "Condor sculpture", shape: 8, style: 3, colors: [9, 10, 1], motifs: [2], mode: "EXHIBITION", status: "EXHIBITED", price: null, size: [20, 32, 14] },
        { es: "Espejo dorado", en: "Golden mirror", shape: 9, style: 1, colors: [11, 1], motifs: [1, 7], mode: "SALE", status: "EXHIBITED", price: 380, size: [40, 50, 3] },
      ],
      [
        { es: "Gran cuadro de la plaza", en: "Large plaza panel", shape: 10, style: 2, colors: [13], motifs: [6, 5], mode: "AUCTION", status: "RESERVED", price: null, size: [80, 60, 3] },
        { es: "Totuma de pájaros", en: "Bird bowl", shape: 5, style: 1, colors: [2, 3, 1], motifs: [2], mode: "SALE", status: "EXHIBITED", price: 120, size: [20, 10, 20] },
        { es: "Arete de mopa-mopa", en: "Mopa-mopa earring", shape: 12, style: 2, colors: [1, 11], motifs: [4], mode: "SALE", status: "EXHIBITED", price: 60, size: [4, 6, 1] },
        { es: "Mesa auxiliar de grecas", en: "Fretwork side table", shape: 11, style: 3, colors: [9, 1, 11], motifs: [3], mode: "SALE", status: "EXHIBITED", price: 950, size: [45, 55, 45] },
      ],
      [
        { es: "Cofre de los astros", en: "Chest of the stars", shape: 2, style: 1, colors: [5, 11, 10], motifs: [7, 4], mode: "AUCTION", status: "EXHIBITED", price: null, size: [30, 20, 18] },
        { es: "Plato de venados", en: "Deer plate", shape: 4, style: 1, colors: [8, 3, 2], motifs: [2], mode: "SALE", status: "EXHIBITED", price: 190, size: [32, 32, 3] },
        { es: "Jarrón de espirales", en: "Spiral vase", shape: 3, style: 1, colors: [1, 9, 3], motifs: [3], mode: "SALE", status: "EXHIBITED", price: 360, size: [16, 30, 16] },
        { es: "Bandeja abstracta", en: "Abstract tray", shape: 1, style: 2, colors: [6, 7, 4], motifs: [8], mode: "SALE", status: "EXHIBITED", price: 230, size: [40, 28, 3] },
      ],
      [
        { es: "Marco de colibríes", en: "Hummingbird frame", shape: 9, style: 1, colors: [2, 1, 11], motifs: [2, 1], mode: "SALE", status: "EXHIBITED", price: 270, size: [30, 36, 3] },
        { es: "Joyero azul", en: "Blue jewelry box", shape: 6, style: 2, colors: [5, 12], motifs: [4], mode: "SALE", status: "EXHIBITED", price: 140, size: [15, 10, 8] },
        { es: "Figura del danzante", en: "Dancer figure", shape: 8, style: 3, colors: [1, 3, 5], motifs: [6], mode: "EXHIBITION", status: "EXHIBITED", price: null, size: [14, 28, 10] },
        { es: "Cuadro del volcán", en: "Volcano panel", shape: 10, style: 2, colors: [4, 1, 8], motifs: [5], mode: "SALE", status: "DRAFT", price: 520, size: [50, 40, 2] },
      ],
    ];
    const colorHex = (id: Id) => t.catalogs.colors.find((color) => color.id === id)?.hex ?? null;
    const code = (list: { id: Id; code: string }[], id: Id) => list.find((entry) => entry.id === id)?.code ?? "";
    let artworkId = 0;
    let photoId = 0;
    seeds.forEach((works, storeIndex) => {
      works.forEach((seed) => {
        artworkId++;
        const colors = seed.colors.map(colorHex).filter((hex): hex is string => !!hex);
        const shape = code(t.catalogs.shapes, seed.shape);
        const motif = code(t.catalogs.motifs, seed.motifs[0]);
        const photos: Photo[] = (["front", "side", "detail"] as const).map((view, index) => ({
          id: ++photoId,
          url: ArtImageCodec.encode({ shape, motif, colors, seed: artworkId * 7 + index, view }),
          altEs: `${seed.es}, ${view === "front" ? "vista frontal" : view === "side" ? "vista lateral" : "detalle del barniz"}`,
          altEn: `${seed.en}, ${view === "front" ? "front view" : view === "side" ? "side view" : "varnish detail"}`,
          angle: view === "front" ? "frente" : view === "side" ? "lado" : "detalle",
          sortOrder: index,
          isPrimary: index === 0,
        }));
        const row: ArtworkRow = {
          id: artworkId,
          storeId: storeIndex + 1,
          slug: `${SeedData.slug(seed.es)}-${artworkId}`,
          titleEs: seed.es,
          titleEn: seed.en,
          historyEs: `Historia de ejemplo de «${seed.es}». Aquí el maestro cuenta de dónde salió la idea, qué figuras usó y cuánto tiempo tomó.`,
          historyEn: `Sample story of “${seed.en}”. Here the master tells where the idea came from, which figures were used and how long it took.`,
          technique: "Barniz de Pasto (mopa-mopa) sobre madera",
          widthCm: seed.size[0],
          heightCm: seed.size[1],
          depthCm: seed.size[2],
          weightG: Math.round(seed.size[0] * seed.size[1] * 1.2),
          shapeId: seed.shape,
          styleId: seed.style,
          colorIds: seed.colors,
          motifIds: seed.motifs,
          saleMode: seed.mode,
          status: seed.status,
          price: seed.price,
          currency: "USD",
          stock: seed.status === "SOLD" ? 0 : 1,
          photos,
          publishedAt: seed.status === "DRAFT" ? null : at(-80 + artworkId),
          createdAt: at(-85 + artworkId),
          deletedAt: null,
        };
        t.artworks.push(row);
      });
    });
  }

  static slug(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private static item(id: Id, orderId: Id, storeId: Id, artworkId: Id | null, description: string, price: number, extra: Partial<OrderItem> = {}): OrderItem {
    return {
      id, orderId, storeId, storeName: "", artworkId, auctionId: null, customOfferId: null, description, quantity: 1, unitPrice: price, lineTotal: price,
      artisanAmount: Math.round(price * 0.9 * 100) / 100, fulfillmentStatus: "PENDING", carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null, payoutId: null, ...extra,
    };
  }

  private static commerce(t: MockTables): void {
    const address = (id: Id) => {
      const { id: _id, userId: _user, isDefault: _default, ...rest } = t.addresses.find((entry) => entry.id === id)!;
      return rest;
    };
    const order = (row: Partial<OrderRow> & Pick<OrderRow, "id" | "buyerId" | "type" | "status" | "subtotal" | "items">): OrderRow => ({
      code: `MUS-2026-${String(row.id).padStart(6, "0")}`, currency: "USD", shippingCost: 25, platformFee: Math.round(row.subtotal * 10) / 100,
      total: row.subtotal + 25, shippingAddress: null, notes: null, history: [], paymentDueAt: null, paidAt: null, createdAt: at(-1), balanceOfOrderId: null, ...row,
    });

    // Delivered purchase: "Jarrón de la laguna" (Naria) bought by Ana.
    t.orders.push(order({
      id: 1, buyerId: 9, type: "PURCHASE", status: "DELIVERED", subtotal: 420, shippingAddress: address(1), paidAt: at(-20), createdAt: at(-20, -1),
      items: [SeedData.item(1, 1, 2, 5, "Jarrón de la laguna", 420, { fulfillmentStatus: "DELIVERED", carrier: "DHL", trackingNumber: "DHL4471200931", shippedAt: at(-17), deliveredAt: at(-12) })],
      history: [
        { fromStatus: null, toStatus: "PENDING_PAYMENT", changedAt: at(-20, -1), note: null },
        { fromStatus: "PENDING_PAYMENT", toStatus: "PAID", changedAt: at(-20), note: null },
        { fromStatus: "PAID", toStatus: "SHIPPED", changedAt: at(-17), note: null },
        { fromStatus: "SHIPPED", toStatus: "DELIVERED", changedAt: at(-12), note: null },
      ],
    }));
    // Paid purchase that Valderrama still has to ship: "Joyero de flores rojas" for Kenji.
    t.orders.push(order({
      id: 2, buyerId: 10, type: "PURCHASE", status: "PAID", subtotal: 150, shippingAddress: address(2), paidAt: at(-1), createdAt: at(-1, -1),
      items: [SeedData.item(2, 2, 1, 4, "Joyero de flores rojas", 150)],
      history: [
        { fromStatus: null, toStatus: "PENDING_PAYMENT", changedAt: at(-1, -1), note: null },
        { fromStatus: "PENDING_PAYMENT", toStatus: "PAID", changedAt: at(-1), note: null },
      ],
    }));
    const joyero = t.artworks.find((artwork) => artwork.id === 4)!;
    joyero.status = "SOLD";
    joyero.stock = 0;

    const payment = (id: Id, orderId: Id, amount: number, approvedAt: string): Payment => ({
      id, orderId, gateway: "SIMULATED", reference: `MUS-PAY-${id}`, method: "CARD", status: "APPROVED", amount, currency: "USD", checkoutUrl: `/pay/${id}`, createdAt: approvedAt, approvedAt,
    });
    t.payments.push(payment(1, 1, 445, at(-20)), payment(2, 2, 175, at(-1)));

    // Finished auction won by Ana: order waiting for payment.
    t.auctions.push(
      { id: 1, artworkId: 13, basePrice: 150, reservePrice: 600, minIncrement: 10, currency: "USD", startDate: at(-6), endDate: at(-1, -6), status: "FINISHED", createdBy: 5, winningBidId: 3, orderId: 3 },
      { id: 2, artworkId: 3, basePrice: 180, reservePrice: null, minIncrement: 5, currency: "USD", startDate: at(-2), endDate: at(2, 4), status: "ACTIVE", createdBy: 2, winningBidId: null, orderId: null },
      { id: 3, artworkId: 17, basePrice: 220, reservePrice: 300, minIncrement: 10, currency: "USD", startDate: at(1, 2), endDate: at(5), status: "SCHEDULED", createdBy: 6, winningBidId: null, orderId: null },
    );
    t.bids.push(
      { id: 1, auctionId: 1, userId: 11, amount: 200, currency: "USD", bidDate: at(-5), reviewStatus: "VALID", reviewReason: null },
      { id: 2, auctionId: 1, userId: 10, amount: 2100, currency: "USD", bidDate: at(-3), reviewStatus: "SUSPICIOUS", reviewReason: "El monto es más de 10 veces la referencia (200)" },
      { id: 3, auctionId: 1, userId: 9, amount: 2150, currency: "USD", bidDate: at(-2), reviewStatus: "VALID", reviewReason: null },
      { id: 4, auctionId: 2, userId: 11, amount: 190, currency: "USD", bidDate: at(-1, -5), reviewStatus: "VALID", reviewReason: null },
      { id: 5, auctionId: 2, userId: 10, amount: 210, currency: "USD", bidDate: at(-1, -2), reviewStatus: "VALID", reviewReason: null },
    );
    t.orders.push(order({
      id: 3, buyerId: 9, type: "AUCTION", status: "PENDING_PAYMENT", subtotal: 2150, shippingAddress: address(1), createdAt: at(-1, -6), paymentDueAt: at(1, 18),
      items: [SeedData.item(3, 3, 4, 13, "Gran cuadro de la plaza (subasta)", 2150, { auctionId: 1 })],
      history: [{ fromStatus: null, toStatus: "PENDING_PAYMENT", changedAt: at(-1, -6), note: "Subasta ganada" }],
    }));
  }

  private static customOrders(t: MockTables): void {
    const design = (id: Id, seed: number, selected: boolean) => ({
      id, provider: "simulada", model: "demo", status: "COMPLETED" as const, isSelected: selected, createdAt: at(-4),
      prompt: "Barniz de Pasto tray, red and gold, hummingbirds and flowers, traditional style",
      imageUrl: ArtImageCodec.encode({ shape: "bandeja", motif: seed % 2 ? "zoomorfo" : "floral", colors: ["#B3261E", "#C9A227", "#2E7D32"], seed, view: "front" }),
    });
    t.customRequests.push(
      {
        id: 1, buyerId: 9, targetMasterId: null, title: "Bandeja con colibríes para un regalo",
        description: "Una bandeja mediana en rojo y dorado con colibríes y flores alrededor del borde. Es un regalo de bodas.",
        shapeId: 1, styleId: 1, colorIds: [1, 11], motifIds: [2, 1], sizeNotes: "Unos 40 × 30 cm", offeredPrice: 260, currency: "USD", desiredDate: at(45).slice(0, 10),
        status: "WITH_OFFERS", acceptedOfferId: null, designs: [design(1, 301, true), design(2, 302, false)], expiresAt: at(11), createdAt: at(-4),
      },
      {
        id: 2, buyerId: 10, targetMasterId: null, title: "Joyero con figuras precolombinas",
        description: "Joyero pequeño en negro con grecas precolombinas en dorado, estilo contemporáneo.",
        shapeId: 6, styleId: 2, colorIds: [9, 11], motifIds: [3], sizeNotes: null, offeredPrice: 180, currency: "USD", desiredDate: null,
        status: "PUBLISHED", acceptedOfferId: null,
        designs: [{ ...design(3, 303, true), prompt: "Barniz de Pasto jewelry box, black and gold, pre-Columbian frets", imageUrl: ArtImageCodec.encode({ shape: "joyero", motif: "precolombino", colors: ["#1A1A1A", "#C9A227"], seed: 303, view: "front" }) }],
        expiresAt: at(13), createdAt: at(-2),
      },
    );
    t.offers.push(
      { id: 1, requestId: 1, masterId: 1, type: "ACCEPT_PRICE", price: 260, currency: "USD", estimatedDays: 25, message: "Puedo hacerla con el borde de flores y cuatro colibríes.", designId: 1, status: "SENT", createdAt: at(-3) },
      { id: 2, requestId: 1, masterId: 3, type: "COUNTER_OFFER", price: 320, currency: "USD", estimatedDays: 30, message: "Propongo madera más gruesa y hoja de oro en los bordes.", designId: 1, status: "SENT", createdAt: at(-2) },
    );
  }

  private static conversations(t: MockTables): void {
    t.conversations.push(
      { id: 1, customerId: 9, masterId: 1, artworkId: 1, customRequestId: null, orderId: null, subject: "Bandeja de colibríes", status: "OPEN", createdAt: at(-6), lastMessageAt: at(-5) },
      { id: 2, customerId: 10, masterId: 1, artworkId: null, customRequestId: null, orderId: 2, subject: "Envío a Japón", status: "OPEN", createdAt: at(-1), lastMessageAt: at(-1) },
    );
    t.messages.push(
      { id: 1, conversationId: 1, senderId: 9, content: "Hola, ¿la bandeja se puede colgar en la pared?", readAt: at(-6), createdAt: at(-6) },
      { id: 2, conversationId: 1, senderId: 2, content: "Sí, le pongo un soporte atrás sin costo.", readAt: null, createdAt: at(-5) },
      { id: 3, conversationId: 2, senderId: 10, content: "¿Cuánto tarda el envío a Tokio?", readAt: null, createdAt: at(-1) },
    );
  }

  private static activity(t: MockTables): void {
    t.favorites.push({ userId: 9, artworkId: 1, createdAt: at(-6) }, { userId: 9, artworkId: 12, createdAt: at(-5) }, { userId: 10, artworkId: 8, createdAt: at(-3) });
    t.notifications.push(
      { id: 1, userId: 9, type: "AUCTION_WON", title: "Ganaste la subasta de «Gran cuadro de la plaza»", body: "Tienes 48 horas para pagar.", link: "/account/orders/3", readAt: null, createdAt: at(-1, -6) },
      { id: 2, userId: 9, type: "NEW_CUSTOM_OFFER", title: "Nueva oferta para tu encargo", body: "María Cabrera envió una contraoferta.", link: "/account/custom/1", readAt: null, createdAt: at(-2) },
      { id: 3, userId: 9, type: "NEW_MESSAGE", title: "Richard Valderrama te respondió", body: null, link: "/messages/1", readAt: null, createdAt: at(-5) },
      { id: 4, userId: 2, type: "NEW_ORDER", title: "Nuevo pedido MUS-2026-000002", body: "Joyero de flores rojas", link: "/artisan/orders", readAt: null, createdAt: at(-1) },
      { id: 5, userId: 1, type: "SYSTEM", title: "Carolina Benavides envió documentos para verificación", body: null, link: "/admin/verifications", readAt: null, createdAt: at(-1) },
    );
    t.reports.push({ id: 1, reporterId: 11, entityType: "ARTWORK", entityId: 14, reason: "La descripción dice totuma pero en la foto parece un plato.", status: "OPEN", createdAt: at(-2), resolvedAt: null });
    t.interactions.push(
      { id: 1, userId: 9, artworkId: 1, storeId: null, action: "VIEW", durationSeconds: 45, date: at(-6) },
      { id: 2, userId: 9, artworkId: 1, storeId: null, action: "ZOOM", durationSeconds: null, date: at(-6) },
      { id: 3, userId: 9, artworkId: 12, storeId: null, action: "FAVORITE", durationSeconds: null, date: at(-5) },
    );
    t.audit.push(
      { id: 1, tableName: "masters", rowId: "7", operation: "I", userId: 8, summary: "Registro de artesana Carolina Benavides", changedAt: at(-3) },
      { id: 2, tableName: "auctions", rowId: "1", operation: "U", userId: null, summary: "Subasta 1 finalizada; ganadora Ana Collins", changedAt: at(-1, -6) },
      { id: 3, tableName: "orders", rowId: "2", operation: "U", userId: null, summary: "Pedido MUS-2026-000002 pagado", changedAt: at(-1) },
    );
  }

  private static counters(t: MockTables): void {
    const max = (rows: { id: number }[]) => rows.reduce((value, row) => Math.max(value, row.id), 0);
    const designs = t.customRequests.flatMap((request) => request.designs);
    const sections = t.stores.flatMap((store) => store.sections);
    const photos = t.artworks.flatMap((artwork) => artwork.photos);
    const items = t.orders.flatMap((order) => order.items);
    t.counters = {
      users: max(t.users), masters: max(t.masters), verifications: max(t.verifications), stores: max(t.stores), sections: max(sections),
      artworks: max(t.artworks), photos: max(photos), interactions: max(t.interactions), recommendations: 0, addresses: max(t.addresses),
      orders: max(t.orders), orderItems: max(items), payments: max(t.payments), paymentEvents: 0, payouts: 0, auctions: max(t.auctions),
      bids: max(t.bids), customRequests: max(t.customRequests), designs: max(designs), offers: max(t.offers), conversations: max(t.conversations),
      messages: max(t.messages), notifications: max(t.notifications), reports: max(t.reports), audit: max(t.audit), aiUsage: 0,
    };
  }
}
