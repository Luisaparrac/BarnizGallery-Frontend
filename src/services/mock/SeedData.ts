import { ArtImageCodec } from "../../art/ArtImageSpec";
import type { AppSetting } from "../../domain/admin";
import type { Catalogs, SectionType, StoreTemplate } from "../../domain/catalog";
import type { Id } from "../../domain/common";
import type { OrderItem, Payment } from "../../domain/commerce";
import type { Master, Photo, Store, StoreSection, VerificationStep } from "../../domain/gallery";
import type { ArtworkRow, MockTables, OrderRow, UserRow } from "./MockTables";
import { RealInventory, type RealMaster } from "./RealInventory";

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

/** First user id of the real masters: user 1 is the admin, then one user per master in RealInventory order. */
const FIRST_MASTER_USER = 2;

/**
 * Demo data: catalogs, the real masters with their stores and works (RealInventory, generated from
 * the CSV files in data/), customers, orders, auctions and custom orders.
 */
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
        ["banco", "Banco", "Stool"],
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
        ["artesano", "Artesano", "Artisan (man)"], ["artesana", "Artesana", "Artisan (woman)"], ["viajera", "Viajera", "Traveler"],
        ["cuy", "Cuy", "Guinea pig"], ["indigena", "Indígena", "Indigenous"],
      ].map(([code, es, en], index) => ({ ...item(index + 1, code, es, en), imageUrl: `/avatars/${code}.png` })),
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
    t.users.push(SeedData.user(1, "Administración MUSEO", "admin@museo.co", "ADMIN", { avatarId: 3 }));
    const avatarId = (code: string) => t.catalogs.avatars.find((avatar) => avatar.code === code)?.id ?? null;
    RealInventory.masters.forEach((real, index) => {
      const userId = FIRST_MASTER_USER + index;
      const masterId = index + 1;
      t.users.push(SeedData.user(userId, real.name, `${real.key}@museo.co`, "ARTISAN", { avatarId: avatarId(real.avatar) }));
      t.masters.push(SeedData.realMaster(masterId, userId, real));
      SeedData.steps(t, masterId, "APPROVED");
    });
    const pendingMasterId = t.masters.length + 1;
    t.users.push(SeedData.user(8, "Carolina Benavides", "nueva@museo.co", "ARTISAN", { status: "PENDING", avatarId: 2, createdAt: at(-3) }));
    t.masters.push(SeedData.master(pendingMasterId, 8, "Carolina Benavides", "benavides", "Taller Benavides", "IN_REVIEW"));
    SeedData.steps(t, pendingMasterId, "MIXED");

    t.users.push(SeedData.user(9, "Ana Collins", "ana@example.com", "CUSTOMER", { avatarId: 4, preferredLanguage: "en", countryCode: "US", createdAt: at(-40) }));
    t.users.push(SeedData.user(10, "Kenji Morita", "kenji@example.com", "CUSTOMER", { avatarId: 3, preferredLanguage: "en", countryCode: "JP", createdAt: at(-25) }));
    t.users.push(SeedData.user(11, "Lucía Gómez", "lucia@example.com", "CUSTOMER", { avatarId: 5, countryCode: "CO", createdAt: at(-10) }));

    t.addresses.push(
      { id: 1, userId: 9, recipientName: "Ana Collins", line1: "245 Hudson St, Apt 3B", line2: null, city: "New York", region: "NY", postalCode: "10013", countryCode: "US", phone: "+1 212 555 0148", isDefault: true },
      { id: 2, userId: 10, recipientName: "Kenji Morita", line1: "2-11-3 Meguro", line2: null, city: "Tokyo", region: null, postalCode: "153-0063", countryCode: "JP", phone: null, isDefault: true },
    );
    // Ana likes red and gold vases and plates with animals.
    t.tastes.push({ userId: 9, profile: { colorIds: [1, 11], shapeIds: [3, 4], styleIds: [1], motifIds: [2], budgetRangeId: 3 }, updatedAt: at(-40) });
  }

  private static realMaster(id: Id, userId: Id, real: RealMaster): Master {
    return {
      id, userId, name: real.name, slug: real.key, city: real.city, workshop: real.storeEs,
      biographyEs: real.biographyEs, biographyEn: real.biographyEn,
      profilePhotoUrl: null, verificationStatus: "APPROVED", verifiedAt: at(-100),
    };
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
      const real = RealInventory.masters.find((entry) => entry.key === master.slug);
      const templateId = real ? templates[index % templates.length] : 1;
      const template = t.catalogs.templates.find((item) => item.id === templateId)!;
      const sections = SeedData.sections(template.defaultLayout, master.id * 100).map((section) =>
        section.type === "STORY" && real ? { ...section, contentEs: real.biographyEs, contentEn: real.biographyEn } : section,
      );
      const firstWork = RealInventory.works.find((work) => work.masterKey === master.slug);
      const published = master.verificationStatus === "APPROVED";
      const store: Store = {
        id: master.id,
        masterId: master.id,
        slug: master.slug,
        nameEs: real?.storeEs ?? `Taller ${master.name}`,
        nameEn: real?.storeEn ?? `${master.name} Workshop`,
        descriptionEs: `Barniz de Pasto del maestro ${master.name}, en ${master.city}.`,
        descriptionEn: `Barniz de Pasto by master ${master.name}, in ${master.city}.`,
        templateId,
        status: published ? "PUBLISHED" : "DRAFT",
        logoUrl: null,
        bannerUrl: firstWork?.photos[0] ?? ArtImageCodec.encode({ shape: "bandeja", motif: "floral", colors: [], seed: 500 + master.id, view: "detail" }),
        theme: {},
        acceptsCustomOrders: true,
        sections,
        publishedAt: published ? at(-90) : null,
      };
      t.stores.push(store);
    });
  }

  static sections(layout: SectionType[], firstId: Id): StoreSection[] {
    return layout.map((type, index) => ({ id: firstId + index, type, ...SECTION_TEXT[type], imageUrl: null, sortOrder: index, isVisible: true }));
  }

  /** The real works, in RealInventory order (that order gives the ids). Catalog codes become ids here. */
  private static works(t: MockTables): void {
    const idOf = (list: { id: Id; code: string }[], code: string, kind: string): Id => {
      const found = list.find((entry) => entry.code === code);
      if (!found) throw new Error(`Unknown ${kind} code "${code}" in RealInventory`);
      return found.id;
    };
    let photoId = 0;
    RealInventory.works.forEach((work, index) => {
      const id = index + 1;
      const store = t.stores.find((entry) => entry.slug === work.masterKey)!;
      const photos: Photo[] = work.photos.map((url, position) => ({
        id: ++photoId,
        url,
        altEs: position === 0 ? work.titleEs : `${work.titleEs}, foto ${position + 1}`,
        altEn: position === 0 ? work.titleEn : `${work.titleEn}, photo ${position + 1}`,
        angle: position === 0 ? "frente" : null,
        sortOrder: position,
        isPrimary: position === 0,
      }));
      const row: ArtworkRow = {
        id,
        storeId: store.id,
        slug: `${work.slug}-${id}`,
        titleEs: work.titleEs,
        titleEn: work.titleEn,
        historyEs: work.descriptionEs,
        historyEn: work.descriptionEn,
        technique: "Barniz de Pasto (mopa-mopa) sobre madera",
        widthCm: work.widthCm,
        heightCm: work.heightCm,
        depthCm: work.depthCm,
        weightG: null,
        shapeId: idOf(t.catalogs.shapes, work.shape, "shape"),
        styleId: idOf(t.catalogs.styles, work.style, "style"),
        colorIds: work.colors.map((code) => idOf(t.catalogs.colors, code, "color")),
        motifIds: work.motifs.map((code) => idOf(t.catalogs.motifs, code, "motif")),
        saleMode: work.saleMode,
        status: "EXHIBITED",
        // Auction works have no fixed price: their CSV price is the auction's base price.
        price: work.saleMode === "SALE" ? work.price : null,
        currency: work.currency,
        stock: work.stock,
        photos,
        publishedAt: at(-80 + id),
        createdAt: at(-85 + id),
        deletedAt: null,
      };
      t.artworks.push(row);
    });
  }

  /** A seeded work by its inventory slug (without the "-id" suffix). */
  private static work(t: MockTables, slug: string): ArtworkRow {
    const found = t.artworks.find((artwork) => artwork.slug === `${slug}-${artwork.id}`);
    if (!found) throw new Error(`The demo data needs the work "${slug}" in data/obras.csv`);
    return found;
  }

  /** CSV price of a work (the base price of auction works). */
  private static listPrice(slug: string): number {
    return RealInventory.works.find((work) => work.slug === slug)?.price ?? 100;
  }

  /** User id of the master who made a work. */
  private static makerOf(t: MockTables, artwork: ArtworkRow): Id {
    const store = t.stores.find((entry) => entry.id === artwork.storeId)!;
    return t.masters.find((master) => master.id === store.masterId)!.userId!;
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
    const sell = (artwork: ArtworkRow) => {
      artwork.status = "SOLD";
      artwork.stock = 0;
    };

    // Delivered purchase: Gilberto Granja's "Jarrón Flora Azul" bought by Ana.
    const vase = SeedData.work(t, "jarron-flora-azul");
    const vasePrice = vase.price!;
    t.orders.push(order({
      id: 1, buyerId: 9, type: "PURCHASE", status: "DELIVERED", subtotal: vasePrice, shippingAddress: address(1), paidAt: at(-20), createdAt: at(-20, -1),
      items: [SeedData.item(1, 1, vase.storeId, vase.id, vase.titleEs, vasePrice, { fulfillmentStatus: "DELIVERED", carrier: "DHL", trackingNumber: "DHL4471200931", shippedAt: at(-17), deliveredAt: at(-12) })],
      history: [
        { fromStatus: null, toStatus: "PENDING_PAYMENT", changedAt: at(-20, -1), note: null },
        { fromStatus: "PENDING_PAYMENT", toStatus: "PAID", changedAt: at(-20), note: null },
        { fromStatus: "PAID", toStatus: "SHIPPED", changedAt: at(-17), note: null },
        { fromStatus: "SHIPPED", toStatus: "DELIVERED", changedAt: at(-12), note: null },
      ],
    }));
    sell(vase);

    // Paid purchase that Valderrama still has to ship: "Jarrón Colibrí" for Kenji.
    const hummingbird = SeedData.work(t, "jarron-colibri");
    const hummingbirdPrice = hummingbird.price!;
    t.orders.push(order({
      id: 2, buyerId: 10, type: "PURCHASE", status: "PAID", subtotal: hummingbirdPrice, shippingAddress: address(2), paidAt: at(-1), createdAt: at(-1, -1),
      items: [SeedData.item(2, 2, hummingbird.storeId, hummingbird.id, hummingbird.titleEs, hummingbirdPrice)],
      history: [
        { fromStatus: null, toStatus: "PENDING_PAYMENT", changedAt: at(-1, -1), note: null },
        { fromStatus: "PENDING_PAYMENT", toStatus: "PAID", changedAt: at(-1), note: null },
      ],
    }));
    sell(hummingbird);

    const payment = (id: Id, orderId: Id, amount: number, approvedAt: string): Payment => ({
      id, orderId, gateway: "SIMULATED", reference: `MUS-PAY-${id}`, method: "CARD", status: "APPROVED", amount, currency: "USD", checkoutUrl: `/pay/${id}`, createdAt: approvedAt, approvedAt,
    });
    t.payments.push(payment(1, 1, vasePrice + 25, at(-20)), payment(2, 2, hummingbirdPrice + 25, at(-1)));

    // The two auction works of the inventory: a finished auction won by Ana (order waiting for
    // payment) and an active one with a suspicious bid for the admin to review.
    const cabinet = SeedData.work(t, "bargueno-colonial");
    const plate = SeedData.work(t, "plato-decorado");
    const cabinetBase = SeedData.listPrice("bargueno-colonial");
    const plateBase = SeedData.listPrice("plato-decorado");
    t.auctions.push(
      { id: 1, artworkId: cabinet.id, basePrice: cabinetBase, reservePrice: cabinetBase + 200, minIncrement: 20, currency: "USD", startDate: at(-6), endDate: at(-1, -6), status: "FINISHED", createdBy: SeedData.makerOf(t, cabinet), winningBidId: 3, orderId: 3 },
      { id: 2, artworkId: plate.id, basePrice: plateBase, reservePrice: null, minIncrement: 10, currency: "USD", startDate: at(-2), endDate: at(2, 4), status: "ACTIVE", createdBy: SeedData.makerOf(t, plate), winningBidId: null, orderId: null },
    );
    cabinet.status = "RESERVED";
    plate.status = "IN_AUCTION";
    const winningBid = cabinetBase + 250;
    const firstPlateBid = plateBase + 10;
    t.bids.push(
      { id: 1, auctionId: 1, userId: 11, amount: cabinetBase + 50, currency: "USD", bidDate: at(-5), reviewStatus: "VALID", reviewReason: null },
      { id: 2, auctionId: 1, userId: 10, amount: cabinetBase + 120, currency: "USD", bidDate: at(-3), reviewStatus: "VALID", reviewReason: null },
      { id: 3, auctionId: 1, userId: 9, amount: winningBid, currency: "USD", bidDate: at(-2), reviewStatus: "VALID", reviewReason: null },
      { id: 4, auctionId: 2, userId: 11, amount: firstPlateBid, currency: "USD", bidDate: at(-1, -5), reviewStatus: "VALID", reviewReason: null },
      { id: 5, auctionId: 2, userId: 10, amount: firstPlateBid * 11, currency: "USD", bidDate: at(-1, -2), reviewStatus: "SUSPICIOUS", reviewReason: `El monto es más de 10 veces la referencia (${firstPlateBid})` },
    );
    t.orders.push(order({
      id: 3, buyerId: 9, type: "AUCTION", status: "PENDING_PAYMENT", subtotal: winningBid, shippingAddress: address(1), createdAt: at(-1, -6), paymentDueAt: at(1, 18),
      items: [SeedData.item(3, 3, cabinet.storeId, cabinet.id, `${cabinet.titleEs} (subasta)`, winningBid, { auctionId: 1 })],
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
    const panel = SeedData.work(t, "cuadro-mujer-y-tradicion");
    t.conversations.push(
      { id: 1, customerId: 9, masterId: 1, artworkId: panel.id, customRequestId: null, orderId: null, subject: panel.titleEs, status: "OPEN", createdAt: at(-6), lastMessageAt: at(-5) },
      { id: 2, customerId: 10, masterId: 1, artworkId: null, customRequestId: null, orderId: 2, subject: "Envío a Japón", status: "OPEN", createdAt: at(-1), lastMessageAt: at(-1) },
    );
    t.messages.push(
      { id: 1, conversationId: 1, senderId: 9, content: "Hola, ¿el cuadro trae soporte para colgarlo en la pared?", readAt: at(-6), createdAt: at(-6) },
      { id: 2, conversationId: 1, senderId: SeedData.makerOf(t, panel), content: "Sí, ya viene con su soporte atrás, listo para colgar.", readAt: null, createdAt: at(-5) },
      { id: 3, conversationId: 2, senderId: 10, content: "¿Cuánto tarda el envío a Tokio?", readAt: null, createdAt: at(-1) },
    );
  }

  private static activity(t: MockTables): void {
    const panel = SeedData.work(t, "cuadro-mujer-y-tradicion");
    const sun = SeedData.work(t, "sol-de-los-pastos");
    const mask = SeedData.work(t, "mascara-musico");
    const cabinet = SeedData.work(t, "bargueno-colonial");
    const hummingbird = SeedData.work(t, "jarron-colibri");
    const galeras = SeedData.work(t, "galeras");
    t.favorites.push({ userId: 9, artworkId: panel.id, createdAt: at(-6) }, { userId: 9, artworkId: sun.id, createdAt: at(-5) }, { userId: 10, artworkId: mask.id, createdAt: at(-3) });
    t.notifications.push(
      { id: 1, userId: 9, type: "AUCTION_WON", title: `Ganaste la subasta de «${cabinet.titleEs}»`, body: "Tienes 48 horas para pagar.", link: "/account/orders/3", readAt: null, createdAt: at(-1, -6) },
      { id: 2, userId: 9, type: "NEW_CUSTOM_OFFER", title: "Nueva oferta para tu encargo", body: "María Cabrera envió una contraoferta.", link: "/account/custom/1", readAt: null, createdAt: at(-2) },
      { id: 3, userId: 9, type: "NEW_MESSAGE", title: "Richard Valderrama te respondió", body: null, link: "/messages/1", readAt: null, createdAt: at(-5) },
      { id: 4, userId: SeedData.makerOf(t, hummingbird), type: "NEW_ORDER", title: "Nuevo pedido MUS-2026-000002", body: hummingbird.titleEs, link: "/artisan/orders", readAt: null, createdAt: at(-1) },
      { id: 5, userId: 1, type: "SYSTEM", title: "Carolina Benavides envió documentos para verificación", body: null, link: "/admin/verifications", readAt: null, createdAt: at(-1) },
    );
    t.reports.push({ id: 1, reporterId: 11, entityType: "ARTWORK", entityId: galeras.id, reason: "La foto es pequeña y no deja ver bien los detalles del plato.", status: "OPEN", createdAt: at(-2), resolvedAt: null });
    t.interactions.push(
      { id: 1, userId: 9, artworkId: panel.id, storeId: null, action: "VIEW", durationSeconds: 45, date: at(-6) },
      { id: 2, userId: 9, artworkId: panel.id, storeId: null, action: "ZOOM", durationSeconds: null, date: at(-6) },
      { id: 3, userId: 9, artworkId: sun.id, storeId: null, action: "FAVORITE", durationSeconds: null, date: at(-5) },
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
