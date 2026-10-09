import { Signal } from "../core/Signal";

/** Keyboard, mouse and pointer-lock input, exposed as simple polled values and signals. */
export class InputController {
  readonly toggleViewPressed = new Signal();
  readonly interactPressed = new Signal();
  readonly pointerLockChanged = new Signal<boolean>();

  private readonly keys = new Set<string>();
  private enabled = false;
  private locked = false;
  private dragging = false;
  private lookX = 0;
  private lookY = 0;
  private wheel = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (event) => this.onKeyDown(event));
    window.addEventListener("keyup", (event) => this.keys.delete(event.code));
    window.addEventListener("blur", () => this.keys.clear());
    canvas.addEventListener("click", () => this.requestPointerLock());
    canvas.addEventListener("pointerdown", () => (this.dragging = true));
    window.addEventListener("pointerup", () => (this.dragging = false));
    window.addEventListener("mousemove", (event) => this.onMouseMove(event));
    canvas.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
      this.pointerLockChanged.emit(this.locked);
    });
  }

  get isPointerLocked(): boolean {
    return this.locked;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) return;
    this.keys.clear();
    this.dragging = false;
    this.lookX = this.lookY = this.wheel = 0;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  requestPointerLock(): void {
    if (this.enabled && !this.locked) this.canvas.requestPointerLock?.();
  }

  /** Walking intent: forward/strafe in [-1, 1] and whether the run key is held. */
  moveAxes(): { forward: number; strafe: number; run: boolean } {
    const axis = (positive: string[], negative: string[]) =>
      (positive.some((code) => this.keys.has(code)) ? 1 : 0) - (negative.some((code) => this.keys.has(code)) ? 1 : 0);
    return {
      forward: axis(["KeyW", "ArrowUp"], ["KeyS", "ArrowDown"]),
      strafe: axis(["KeyD", "ArrowRight"], ["KeyA", "ArrowLeft"]),
      run: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
    };
  }

  /** Mouse movement accumulated since the last call. */
  consumeLook(): { dx: number; dy: number } {
    const look = { dx: this.lookX, dy: this.lookY };
    this.lookX = this.lookY = 0;
    return look;
  }

  consumeWheel(): number {
    const delta = this.wheel;
    this.wheel = 0;
    return delta;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    if ((event.target as HTMLElement | null)?.matches?.("input, textarea, select")) return;
    if (event.code.startsWith("Arrow") || event.code === "Space") event.preventDefault();
    if (!event.repeat) {
      if (event.code === "KeyV") this.toggleViewPressed.emit();
      if (event.code === "KeyE") this.interactPressed.emit();
    }
    this.keys.add(event.code);
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled || !(this.locked || this.dragging)) return;
    this.lookX += event.movementX;
    this.lookY += event.movementY;
  }

  private onWheel(event: WheelEvent): void {
    if (!this.enabled) return;
    this.wheel += event.deltaY;
    event.preventDefault();
  }
}
