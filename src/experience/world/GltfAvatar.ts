import type { AnimationGroup, TransformNode } from "@babylonjs/core";
import type { AvatarModel } from "./AvatarModel";

type Clip = "Idle" | "Walk" | "Run";

/**
 * An avatar loaded from a .glb file. It plays the Idle, Walk and Run animations at the same time
 * and blends their weights by speed, so the change from one to another is smooth.
 */
export class GltfAvatar implements AvatarModel {
  private static readonly BLEND_PER_SECOND = 8;

  private readonly clips = new Map<Clip, AnimationGroup>();
  private readonly weights = new Map<Clip, number>();

  constructor(
    readonly root: TransformNode,
    private readonly groups: AnimationGroup[],
  ) {
    for (const clip of ["Idle", "Walk", "Run"] as const) {
      const group = GltfAvatar.find(groups, clip);
      if (!group) continue;
      this.clips.set(clip, group);
      this.weights.set(clip, clip === "Idle" ? 1 : 0);
      group.start(true);
      group.setWeightForAllAnimatables(clip === "Idle" ? 1 : 0);
    }
    // Animations the model brings with other names stay stopped.
    for (const group of groups) if (![...this.clips.values()].includes(group)) group.stop();
  }

  setVisible(visible: boolean): void {
    this.root.setEnabled(visible);
  }

  animate(deltaSeconds: number, speed: number): void {
    const target: Clip = speed <= 0.05 ? "Idle" : speed > 1.4 && this.clips.has("Run") ? "Run" : "Walk";
    const step = Math.min(1, deltaSeconds * GltfAvatar.BLEND_PER_SECOND);
    this.clips.forEach((group, clip) => {
      const current = this.weights.get(clip) ?? 0;
      const next = current + ((clip === target ? 1 : 0) - current) * step;
      this.weights.set(clip, next);
      group.setWeightForAllAnimatables(next);
    });
  }

  dispose(): void {
    this.groups.forEach((group) => group.dispose());
    this.root.dispose(false, true);
  }

  /** Exact name first ("Idle"); Mixamo exports sometimes add a prefix ("Armature|Idle"). */
  private static find(groups: AnimationGroup[], clip: Clip): AnimationGroup | undefined {
    return groups.find((group) => group.name === clip) ?? groups.find((group) => group.name.toLowerCase().endsWith(clip.toLowerCase()));
  }
}
