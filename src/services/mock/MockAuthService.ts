import { AppError } from "../../domain/errors";
import type { VerificationStep } from "../../domain/gallery";
import type { LoginRequest, RegisterRequest, Session } from "../../domain/user";
import { TokenStore } from "../api/TokenStore";
import type { AuthService } from "../contracts/AuthService";
import { MockDatabase } from "./MockDatabase";
import { SeedData } from "./SeedData";
import { copy, latency, MockSession } from "./MockSession";
import type { UserRow } from "./MockTables";
import { views } from "./MockViews";
import { PasswordHasher } from "./PasswordHasher";

export class MockAuthService implements AuthService {
  private get db() {
    return MockDatabase.instance;
  }

  async login(request: LoginRequest): Promise<Session> {
    await latency();
    const user = this.db.tables.users.find((row) => row.email.toLowerCase() === request.email.trim().toLowerCase());
    if (!user || user.passwordHash !== (await PasswordHasher.hash(request.password))) {
      throw new AppError("badCredentials", "Wrong email or password", 401);
    }
    if (user.status === "SUSPENDED" || user.status === "DELETED") throw new AppError("suspended", "This account is suspended", 403);
    user.lastLoginAt = this.db.now();
    this.db.save();
    return this.open(user);
  }

  async register(request: RegisterRequest): Promise<Session> {
    await latency();
    const db = this.db;
    const email = request.email.trim().toLowerCase();
    if (db.tables.users.some((row) => row.email.toLowerCase() === email)) throw new AppError("emailTaken", "This email is already registered", 409);
    if (request.password.length < 8) throw new AppError("weakPassword", "The password needs at least 8 characters", 422);
    const now = db.now();
    const user: UserRow = {
      id: db.nextId("users"),
      email,
      fullName: request.fullName.trim(),
      role: request.role,
      status: request.role === "ARTISAN" ? "PENDING" : "ACTIVE",
      avatarId: request.avatarId,
      preferredLanguage: request.preferredLanguage,
      countryCode: request.countryCode || null,
      phone: null,
      emailVerified: false,
      createdAt: now,
      lastLoginAt: now,
      passwordHash: await PasswordHasher.hash(request.password),
    };
    db.tables.users.push(user);
    db.audit("users", user.id, "I", user.id, `Registro de ${user.fullName} (${user.role})`);
    if (request.role === "ARTISAN") this.createArtisan(user, request);
    db.save();
    return this.open(user);
  }

  /** Registering as artisan creates the master, the five verification steps and a draft store. */
  private createArtisan(user: UserRow, request: RegisterRequest): void {
    const db = this.db;
    const t = db.tables;
    const masterId = db.nextId("masters");
    const slugBase = SeedData.slug(user.fullName) || `artesano-${masterId}`;
    const slug = t.masters.some((master) => master.slug === slugBase) ? `${slugBase}-${masterId}` : slugBase;
    t.masters.push({
      id: masterId, userId: user.id, name: user.fullName, slug, city: request.city?.trim() || "Pasto",
      workshop: request.workshop?.trim() || `Taller ${user.fullName}`, biographyEs: "", biographyEn: "",
      profilePhotoUrl: null, verificationStatus: "PENDING", verifiedAt: null,
    });
    const steps: VerificationStep["step"][] = ["EMAIL", "IDENTITY", "WORKSHOP", "SAMPLES", "ADMIN_APPROVAL"];
    steps.forEach((step) => t.verifications.push({ id: db.nextId("verifications"), masterId, step, status: "PENDING", evidenceUrl: null, notes: null, reviewedAt: null }));
    const template = t.catalogs.templates.find((entry) => entry.code === "taller") ?? t.catalogs.templates[0];
    const storeId = db.nextId("stores");
    t.stores.push({
      id: storeId, masterId, slug, nameEs: `Taller ${user.fullName}`, nameEn: `${user.fullName} Workshop`, descriptionEs: "", descriptionEn: "",
      templateId: template.id, status: "DRAFT", logoUrl: null, bannerUrl: null, theme: {}, acceptsCustomOrders: true,
      sections: SeedData.sections(template.defaultLayout, db.nextId("sections") * 100), publishedAt: null,
    });
    db.audit("masters", masterId, "I", user.id, `Registro de artesano ${user.fullName}`);
  }

  async logout(): Promise<void> {
    TokenStore.clear();
  }

  async restore(): Promise<Session | null> {
    const user = MockSession.currentUser();
    if (!user || user.status === "SUSPENDED" || user.status === "DELETED") {
      TokenStore.clear();
      return null;
    }
    return this.open(user);
  }

  async requestPasswordReset(_email: string): Promise<void> {
    await latency();
  }

  /** Demo: there is no mail, so the current user's email is confirmed directly. */
  async verifyEmail(_token: string): Promise<void> {
    await latency();
    const user = MockSession.requireUser();
    user.emailVerified = true;
    const master = this.db.tables.masters.find((row) => row.userId === user.id);
    const step = this.db.tables.verifications.find((row) => row.masterId === master?.id && row.step === "EMAIL");
    if (step) {
      step.status = "APPROVED";
      step.reviewedAt = this.db.now();
    }
    this.db.save();
  }

  private open(user: UserRow): Session {
    const session: Session = { user: copy(views.user(user)), accessToken: MockSession.tokenFor(user.id) };
    TokenStore.save(session);
    return session;
  }
}
