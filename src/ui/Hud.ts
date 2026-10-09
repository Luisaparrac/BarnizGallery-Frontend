import { Signal } from "../core/Signal";
import { LocaleService } from "../i18n/LocaleService";
import type { ApiStatus, CameraMode, Language } from "../model/models";
import { ClickHint } from "./ClickHint";
import { ControlsPanel } from "./ControlsPanel";
import { Crosshair } from "./Crosshair";
import { IntroScreen } from "./IntroScreen";
import { PromptBanner } from "./PromptBanner";
import { ToastNotifier } from "./ToastNotifier";
import { TopBar } from "./TopBar";
import type { UiComponent } from "./UiComponent";

/** Composes the overlay widgets and re-renders them when the language changes (Composite). */
export class Hud {
  readonly enterClicked = new Signal();
  readonly cameraToggleClicked = new Signal();
  readonly languagePicked = new Signal<Language>();

  private readonly topBar = new TopBar();
  private readonly intro = new IntroScreen();
  private readonly controls = new ControlsPanel();
  private readonly prompt = new PromptBanner();
  private readonly toast = new ToastNotifier();
  private readonly crosshair = new Crosshair();
  private readonly clickHint = new ClickHint();
  private readonly components: UiComponent[];

  constructor(readonly root: HTMLElement) {
    this.components = [this.topBar, this.intro, this.controls, this.prompt, this.toast, this.crosshair, this.clickHint];
    root.append(...this.components.map((component) => component.element));

    this.intro.enterClicked.subscribe(() => this.enterClicked.emit());
    this.topBar.cameraToggleClicked.subscribe(() => this.cameraToggleClicked.emit());
    this.topBar.languagePicked.subscribe((language) => this.languagePicked.emit(language));
    this.intro.languagePicked.subscribe((language) => this.languagePicked.emit(language));
    LocaleService.instance.changed.subscribe(() => this.refresh());
    this.refresh();
  }

  refresh(): void {
    this.components.forEach((component) => component.refresh());
  }

  hideIntro(): void {
    this.intro.hide();
  }

  setPlaying(playing: boolean): void {
    this.root.classList.toggle("playing", playing);
  }

  setStatus(status: ApiStatus): void {
    this.topBar.setStatus(status);
  }

  setCameraMode(mode: CameraMode): void {
    this.topBar.setCameraMode(mode);
    this.crosshair.setVisible(mode === "FIRST_PERSON");
  }

  /** `source` is re-evaluated on language changes; pass null to hide the prompt. */
  setPrompt(source: (() => string) | null): void {
    this.prompt.setSource(source);
  }

  showToast(text: string): void {
    this.toast.show(text);
  }

  setClickHintVisible(visible: boolean): void {
    this.clickHint.setVisible(visible);
  }
}
