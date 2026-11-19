import { SceneInstrumentation, type Scene } from "@babylonjs/core";

/**
 * Small counter in a corner, only with `?debug`: frames per second, draw calls of the last
 * frame (every pass: shadows, post-processing and the UI camera included) and meshes.
 * It is plain HTML on top of the canvas, so it costs no draw calls itself.
 */
export class DebugStats {
  private static readonly REFRESH_MS = 500;

  private readonly element = document.createElement("div");
  private readonly instrumentation: SceneInstrumentation;
  private readonly timer: number;

  constructor(private readonly scene: Scene) {
    this.element.className = "debug-stats";
    this.element.setAttribute("aria-hidden", "true");
    document.body.append(this.element);
    // Reading the counter needs an instrumentation: it resets the draw-call count every frame.
    this.instrumentation = new SceneInstrumentation(scene);
    this.timer = window.setInterval(() => this.refresh(), DebugStats.REFRESH_MS);
    this.refresh();
  }

  dispose(): void {
    window.clearInterval(this.timer);
    this.instrumentation.dispose();
    this.element.remove();
  }

  private refresh(): void {
    const fps = this.scene.getEngine().getFps();
    const drawCalls = this.instrumentation.drawCallsCounter.current;
    // The active-mesh list belongs to the last camera (the UI one), so count the scene's meshes.
    const meshes = this.scene.meshes.length;
    this.element.textContent = `${Math.round(fps)} FPS · ${drawCalls} draw calls · ${meshes} mallas`;
  }
}
