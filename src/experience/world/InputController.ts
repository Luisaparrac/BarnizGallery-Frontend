import { Signal } from "../../core/Signal";

/** Keyboard, mouse and pointer-lock input, exposed as simple polled values and signals. */
export class InputController {
  readonly toggleViewPressed = new Signal();
  readonly interactPressed = new Signal();
  readonly pointerLockChanged = new Signal<boolean>();
  /** A click on the canvas that was not a drag, with its position in canvas pixels. */
  readonly clicked = new Signal<{ x: number; y: number }>();

  private readonly keys = new Set<string>();
  private enabled = false;
  private locked = false;
  private dragging = false;
  private lookX = 0;
  private lookY = 0;
  private wheel = 0;
  private pressX = 0;
  private pressY = 0;
  private readonly listeners = new AbortController();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const signal = this.listeners.signal;
    window.addEventListener("keydown", (event) => this.onKeyDown(event), { signal });
    window.addEventListener("keyup", (event) => this.keys.delete(event.code), { signal });
    window.addEventListener("blur", () => this.keys.clear(), { signal });
    canvas.addEventListener("pointerdown", (event) => this.onPointerDown(event), { signal });
    window.addEventListener("pointerup", (event) => this.onPointerUp(event), { signal });
    window.addEventListener("mousemove", (event) => this.onMouseMove(event), { signal });
    canvas.addEventListener("wheel", (event) => this.onWheel(event), { passive: false, signal });
    document.addEventListener(
      "pointerlockchange",
      () => {
        this.locked = document.pointerLockElement === canvas;
        this.pointerLockChanged.emit(this.locked);
      },
      { signal },
    );
  }

  /** Removes every listener (the 3D page was closed). */
  dispose(): void {
    this.setEnabled(false);
    this.listeners.abort();
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

  private onPointerDown(event: PointerEvent): void {
    this.dragging = true;
    this.pressX = event.clientX;
    this.pressY = event.clientY;
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (!this.enabled || event.target !== this.canvas) return;
    const moved = Math.hypot(event.clientX - this.pressX, event.clientY - this.pressY);
    if (moved > 6 && !this.locked) return;
    const rect = this.canvas.getBoundingClientRect();
    this.clicked.emit(this.locked ? { x: rect.width / 2, y: rect.height / 2 } : { x: event.clientX - rect.left, y: event.clientY - rect.top });
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
