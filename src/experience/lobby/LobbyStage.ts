import {
  Color3,
  DefaultRenderingPipeline,
  DirectionalLight,
  Engine,
  HemisphericLight,
  ImageProcessingConfiguration,
  PointerEventTypes,
  Scene,
  SpotLight,
  Vector3,
  type Observer,
  type PointerInfo,
} from "@babylonjs/core";
import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import type { Language } from "../../domain/common";
import type { LoginRequest, User } from "../../domain/user";
import { Localizer } from "../../i18n/Localizer";
import { services } from "../../services/ServiceRegistry";
import type { Stage } from "../Stage";
import { PanelSurface } from "../ui/PanelSurface";
import { UiLayer } from "../ui/UiLayer";
import { LanguageView } from "../ui/views/LanguageView";
import { LoginView } from "../ui/views/LoginView";
import { RegisterView, type CustomerSignUp } from "../ui/views/RegisterView";
import { TicketOfficeView } from "../ui/views/TicketOfficeView";
import { AvatarFactory } from "../world/AvatarFactory";
import { QualityManager } from "../world/core/QualityManager";
import { MaterialLibrary } from "../world/MaterialLibrary";
import { ShadowRig } from "../world/ShadowRig";
import { AvatarPedestal } from "./AvatarPedestal";
import { LobbyCamera, type CameraShot } from "./LobbyCamera";
import { LobbyHall } from "./LobbyHall";
import { LobbyPrompt } from "./LobbyPrompt";
import { PedestalLabel } from "./PedestalLabel";
import type { LobbyAvatar, LobbyResult } from "./LobbyTypes";

export interface LobbyOptions {
  i18n: Localizer;
  user: User | null;
  avatars: LobbyAvatar[];
  quality: string | null;
}

const shot = (position: [number, number, number], target: [number, number, number]): CameraShot => ({
  position: new Vector3(...position),
  target: new Vector3(...target),
});

/** Points of view of each step of the lobby. */
const SHOTS = {
  language: shot([0, 1.7, -4.5], [0, 4.2, 9.4]),
  avatars: shot([0, 2.0, 1.2], [0, 1.0, -5.4]),
  ticket: shot([2.6, 1.7, 0.6], [7.6, 1.7, 3.0]),
  doors: shot([0, 1.7, 5.2], [0, 2.2, 12]),
  through: shot([0, 1.7, 11.5], [0, 1.9, 16]),
} as const;

/**
 * Entrance of the museum, a scene of its own before the plaza. The visitor picks the language,
 * then an avatar on the pedestals (it turns and lights up), and at the ticket office signs in,
 * creates an account or goes in as a visitor; then the doors open. With a session and an avatar
 * it starts at the ticket office, with the option to change the avatar.
 */
export class LobbyStage implements Stage {
  private static readonly PEDESTAL_RADIUS = 5.4;
  private static readonly PEDESTAL_ANGLES = [-44, -22, 0, 22, 44];
  private static readonly FILL = 0.85;
  private static readonly FILL_DIMMED = 0.6;

  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly camera: LobbyCamera;
  private readonly hall: LobbyHall;
  private readonly materials: MaterialLibrary;
  private readonly shadows: ShadowRig;
  private readonly avatarFactory: AvatarFactory;
  private readonly spot: SpotLight;
  private fill!: HemisphericLight;
  private readonly layer: UiLayer;
  private readonly surface: PanelSurface;
  private readonly pointerObserver: Observer<PointerInfo>;
  private readonly onResize = () => this.engine.resize();

  private i18n: Localizer;
  private user: User | null;
  private avatar: LobbyAvatar | null;
  private pedestals: AvatarPedestal[] = [];
  private prompt: LobbyPrompt | null = null;
  private label: PedestalLabel | null = null;
  private picking = false;
  private disposed = false;
  private finish: ((result: LobbyResult) => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly options: LobbyOptions,
  ) {
    this.i18n = options.i18n;
    this.user = options.user;
    this.avatar = this.catalogAvatar(options.user?.avatarId ?? VisitorSetupStore.load().avatarId);

    this.engine = new Engine(canvas, true, { stencil: true, antialias: true }, true);
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new Scene(this.engine);
    this.scene.clearColor = Color3.FromHexString("#1a100c").toColor4(1);
    this.scene.ambientColor = new Color3(0.25, 0.2, 0.18);

    const quality = new QualityManager(options.quality);
    this.camera = new LobbyCamera(this.scene, SHOTS.language);
    const light = this.buildLights();
    this.shadows = new ShadowRig(light, quality.settings);
    this.materials = new MaterialLibrary(this.scene);
    this.avatarFactory = new AvatarFactory({ scene: this.scene, materials: this.materials, shadows: this.shadows });
    this.hall = new LobbyHall(this.scene, this.materials, this.shadows);
    this.hall.build();

    this.spot = new SpotLight("pedestalSpot", new Vector3(0, 6.5, -3), new Vector3(0, -1, 0), 0.5, 2, this.scene);
    this.spot.diffuse = Color3.FromHexString("#ffd9a0");
    this.spot.intensity = 0;

    this.buildPostProcessing(quality);
    this.layer = new UiLayer(this.scene, this.camera.camera);
    this.surface = new PanelSurface(this.scene, this.layer, this.i18n.t("ui.close"));

    this.pointerObserver = this.scene.onPointerObservable.add((info) => this.onPointer(info));
    window.addEventListener("resize", this.onResize);
    this.engine.runRenderLoop(() => this.frame());
  }

  /** Runs the lobby; resolves while the camera goes through the doors (the caller fades out). */
  run(): Promise<LobbyResult> {
    const promise = new Promise<LobbyResult>((resolve) => (this.finish = resolve));
    if (this.user && this.avatar) void this.ticketStep();
    else if (this.user) void this.avatarStep();
    else this.languageStep();
    return promise;
  }

  dispose(): void {
    this.disposed = true;
    window.removeEventListener("resize", this.onResize);
    this.scene.onPointerObservable.remove(this.pointerObserver);
    this.pedestals.forEach((pedestal) => pedestal.dispose());
    this.label?.dispose();
    this.surface.dispose();
    this.layer.dispose();
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
  }

  // ---------------------------------------------------------------- steps

  private languageStep(): void {
    this.layer.usePanelPointer(true);
    this.surface.open(new LanguageView(this.i18n, (language) => this.chooseLanguage(language)));
  }

  private chooseLanguage(language: Language): void {
    this.i18n = new Localizer(language);
    document.documentElement.lang = language;
    VisitorSetupStore.saveLanguage(language);
    this.surface.close();
    void this.avatarStep();
  }

  private async avatarStep(): Promise<void> {
    this.layer.usePanelPointer(false);
    this.buildPedestals();
    if (!this.prompt) {
      this.prompt = new LobbyPrompt(this.layer.hudTexture, this.i18n.t("lobby.continue"));
      this.prompt.continuePressed.subscribe(() => void this.confirmAvatar());
      this.label = new PedestalLabel(this.layer.hudTexture);
    }
    const chosen = this.pedestals.find((pedestal) => pedestal.item.code === this.avatar?.code);
    await this.camera.moveTo(chosen ? this.closeShot(chosen) : SHOTS.avatars, 1.8);
    this.picking = true;
    this.refreshPrompt();
  }

  private async confirmAvatar(): Promise<void> {
    if (!this.avatar) return;
    this.picking = false;
    this.prompt?.hide();
    this.setHovered(null);
    // With a session the choice is saved in the profile ("Change avatar", or an account without one).
    if (this.user && this.avatar.id !== null && this.avatar.id !== this.user.avatarId) {
      this.user = await services.profile.updateProfile({ avatarId: this.avatar.id }).catch(() => this.user);
    }
    await this.ticketStep();
  }

  private async ticketStep(): Promise<void> {
    await this.camera.moveTo(SHOTS.ticket, 1.6);
    this.layer.usePanelPointer(true);
    this.surface.open(this.ticketView());
  }

  private ticketView(): TicketOfficeView {
    return new TicketOfficeView(this.i18n, this.user, this.avatar ? this.i18n.name(this.avatar) : null, {
      login: () => this.surface.open(new LoginView(this.i18n, () => this.surface.open(this.ticketView()), (request) => this.login(request))),
      register: () =>
        this.surface.open(
          new RegisterView(this.i18n, () => this.surface.open(this.ticketView()), (request) => this.register(request), () => window.open(`${import.meta.env.BASE_URL}panel.html#/register`, "_blank", "noopener")),
        ),
      guest: () => {
        VisitorSetupStore.save({ ...VisitorSetupStore.load(), avatarId: this.avatar?.id ?? null });
        void this.enter();
      },
      enter: () => void this.enter(),
      changeAvatar: () => {
        this.surface.close();
        void this.avatarStep();
      },
    });
  }

  private async login(request: LoginRequest): Promise<void> {
    const session = await services.auth.login(request);
    this.user = await this.adoptAvatar(session.user);
    void this.enter();
  }

  private async register(request: CustomerSignUp): Promise<void> {
    const session = await services.auth.register({ ...request, role: "CUSTOMER", preferredLanguage: this.i18n.language, avatarId: this.avatar?.id ?? null });
    this.user = session.user;
    void this.enter();
  }

  /** The account's avatar wins; an account without one keeps the avatar picked on the pedestals. */
  private async adoptAvatar(user: User): Promise<User> {
    const own = this.catalogAvatar(user.avatarId);
    if (own) {
      this.avatar = own;
      return user;
    }
    if (this.avatar?.id == null) return user;
    return services.profile.updateProfile({ avatarId: this.avatar.id }).catch(() => user);
  }

  /** The doors open and the camera walks through them; the result is given half-way. */
  private async enter(): Promise<void> {
    this.surface.close();
    this.layer.usePanelPointer(false);
    await this.camera.moveTo(SHOTS.doors, 1.4);
    this.hall.openDoors();
    await this.wait(0.7);
    void this.camera.moveTo(SHOTS.through, 2.4);
    await this.wait(1.2);
    this.finish?.({ language: this.i18n.language, user: this.user, avatar: this.avatar });
    this.finish = null;
  }

  // ---------------------------------------------------------------- pedestals

  private buildPedestals(): void {
    if (this.pedestals.length) {
      this.markSelected();
      return;
    }
    const items = this.options.avatars.slice(0, LobbyStage.PEDESTAL_ANGLES.length);
    const spread = LobbyStage.PEDESTAL_ANGLES.slice(0, items.length);
    const offset = (spread[0] + spread[spread.length - 1]) / 2;
    items.forEach((item, index) => {
      const angle = Math.PI + ((spread[index] - offset) * Math.PI) / 180;
      const x = Math.sin(angle) * LobbyStage.PEDESTAL_RADIUS;
      const z = Math.cos(angle) * LobbyStage.PEDESTAL_RADIUS;
      const pedestal = new AvatarPedestal(this.scene, this.materials, this.shadows, item, this.i18n.name(item), x, z, Math.atan2(-x, -z));
      this.pedestals.push(pedestal);
      void this.avatarFactory.create(item.code).then((model) => (this.disposed ? model.dispose() : pedestal.setAvatar(model)));
    });
    this.markSelected();
  }

  private onPointer(info: PointerInfo): void {
    if (!this.picking) return;
    if (info.type === PointerEventTypes.POINTERMOVE) {
      this.setHovered(this.pedestalAtPointer());
    } else if (info.type === PointerEventTypes.POINTERTAP) {
      if (this.layer.pointerOverHud) return;
      const pedestal = this.pedestalAtPointer();
      if (pedestal) this.select(pedestal);
    }
  }

  private pedestalAtPointer(): AvatarPedestal | null {
    const hit = this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh.isPickable && mesh.isEnabled(), false, this.camera.camera);
    return this.pedestals.find((pedestal) => pedestal.owns(hit?.pickedMesh)) ?? null;
  }

  private select(pedestal: AvatarPedestal): void {
    if (pedestal.item.code === this.avatar?.code) return;
    this.avatar = pedestal.item;
    this.markSelected();
    this.refreshPrompt();
    void this.camera.moveTo(this.closeShot(pedestal), 0.6);
  }

  /** Lights the chosen pedestal and dims the others. */
  private markSelected(): void {
    const chosen = this.pedestals.find((pedestal) => pedestal.item.code === this.avatar?.code);
    this.pedestals.forEach((pedestal) => {
      pedestal.setSelected(pedestal === chosen);
      pedestal.setDimmed(!!chosen && pedestal !== chosen);
    });
  }

  /** The avatars' shot, a little closer to the chosen pedestal. */
  private closeShot(pedestal: AvatarPedestal): CameraShot {
    const base = SHOTS.avatars;
    const place = pedestal.root.position;
    const position = base.position.add(new Vector3(place.x - base.position.x, 0, place.z - base.position.z).scale(0.18));
    const target = Vector3.Lerp(base.target, new Vector3(place.x, 1.25, place.z), 0.45);
    return { position, target };
  }

  /** While an avatar is chosen the hall's fill light goes down, so its spotlight stands out. */
  private dimHall(delta: number): void {
    const chosen = this.picking && !!this.avatar;
    const target = chosen ? LobbyStage.FILL_DIMMED : LobbyStage.FILL;
    this.fill.intensity += (target - this.fill.intensity) * Math.min(1, delta * 5);
  }

  private setHovered(hovered: AvatarPedestal | null): void {
    this.pedestals.forEach((pedestal) => pedestal.setHovered(pedestal === hovered));
    this.canvas.style.cursor = hovered ? "pointer" : "";
    this.label?.show(hovered ? this.i18n.name(hovered.item) : null, hovered?.labelAnchor);
  }

  private refreshPrompt(): void {
    if (!this.prompt) return;
    const text = this.avatar ? this.i18n.t("lobby.chosenAvatar", { name: this.i18n.name(this.avatar) }) : this.i18n.t("lobby.pickAvatar");
    this.prompt.show(text, !!this.avatar);
  }

  // ---------------------------------------------------------------- scene

  private buildLights(): DirectionalLight {
    const fill = new HemisphericLight("lobbyFill", new Vector3(0, 1, 0), this.scene);
    this.fill = fill;
    fill.intensity = LobbyStage.FILL;
    fill.diffuse = Color3.FromHexString("#ffe6c4");
    fill.groundColor = Color3.FromHexString("#5a4030");
    fill.specular = Color3.Black();
    // Light falling from the oculus of the dome; it casts the shadows of the pedestals.
    const oculus = new DirectionalLight("lobbyOculus", new Vector3(0.15, -1, 0.25).normalize(), this.scene);
    oculus.position = new Vector3(0, 16, -2);
    oculus.intensity = 2.2;
    oculus.diffuse = Color3.FromHexString("#ffe2b8");
    return oculus;
  }

  private buildPostProcessing(quality: QualityManager): void {
    const pipeline = new DefaultRenderingPipeline("lobbyPipeline", true, this.scene, [this.camera.camera]);
    pipeline.samples = quality.settings.msaaSamples;
    pipeline.fxaaEnabled = quality.settings.msaaSamples <= 1;
    pipeline.bloomEnabled = quality.settings.bloom;
    pipeline.bloomThreshold = 0.8;
    pipeline.bloomWeight = 0.35;
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipeline.imageProcessing.exposure = 1.1;
  }

  private frame(): void {
    const delta = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
    this.camera.update(delta);
    this.hall.update(delta);
    this.pedestals.forEach((pedestal) => pedestal.update(delta, this.camera.camera.position));
    this.dimHall(delta);
    this.label?.update(delta, this.camera.camera);
    this.aimSpot(delta);
    this.scene.render();
  }

  /** The spotlight follows the chosen pedestal while picking. */
  private aimSpot(delta: number): void {
    const chosen = this.picking ? this.pedestals.find((pedestal) => pedestal.item.code === this.avatar?.code) : undefined;
    const target = chosen ? 90 : 0;
    this.spot.intensity += (target - this.spot.intensity) * Math.min(1, delta * 5);
    if (!chosen) return;
    const position = chosen.root.position;
    const from = new Vector3(position.x * 0.6, 6.5, position.z * 0.6);
    this.spot.position.copyFrom(from);
    this.spot.direction.copyFrom(new Vector3(position.x, chosen.focusHeight - 0.6, position.z).subtract(from).normalize());
  }

  private catalogAvatar(id: number | null | undefined): LobbyAvatar | null {
    return id == null ? null : (this.options.avatars.find((avatar) => avatar.id === id) ?? null);
  }

  private wait(seconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, seconds * 1000));
  }
}
