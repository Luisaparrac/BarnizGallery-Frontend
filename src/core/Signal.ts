/** Minimal Observer: listeners subscribe and receive every emitted value. */
export class Signal<T = void> {
  private readonly listeners = new Set<(value: T) => void>();

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(value: T): void {
    this.listeners.forEach((listener) => listener(value));
  }
}
