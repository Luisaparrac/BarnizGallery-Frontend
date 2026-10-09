import { Signal } from "../core/Signal";
import type { ApiStatus } from "../model/models";
import type { ApiClient } from "./ApiClient";
import type { GalleryRepository } from "./GalleryRepository";

/** Probes the backend without blocking the 3D world and publishes its status. */
export class BackendConnection {
  readonly statusChanged = new Signal<ApiStatus>();
  private current: ApiStatus = "connecting";

  constructor(
    private readonly api: ApiClient,
    private readonly gallery: GalleryRepository,
    private readonly allowFallback: boolean,
  ) {}

  get status(): ApiStatus {
    return this.current;
  }

  async connect(): Promise<void> {
    this.setStatus("connecting");
    try {
      await this.api.getHealth();
    } catch {
      return this.fallBack();
    }
    try {
      this.gallery.load(await this.api.getGallery());
      this.setStatus("online");
    } catch {
      this.fallBack();
    }
  }

  private fallBack(): void {
    this.gallery.useDemo();
    this.setStatus(this.allowFallback ? "demo" : "offline");
  }

  private setStatus(status: ApiStatus): void {
    this.current = status;
    this.statusChanged.emit(status);
  }
}
