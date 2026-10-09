export type Listener<T> = (value: T) => void;

/** Minimal typed event channel (Observer pattern). */
export class Signal<T = void> {
  private readonly listeners = new Set<Listener<T>>();

  /** Registers a listener and returns a function that removes it. */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(value?: T): void {
    this.listeners.forEach((listener) => listener(value as T));
  }
}
