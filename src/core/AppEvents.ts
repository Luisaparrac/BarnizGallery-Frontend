import { Signal } from "./Signal";

/** Events that several parts of the interface react to (header counters, lists). */
export class AppEvents {
  static readonly cartChanged = new Signal();
  static readonly notificationsChanged = new Signal();
  static readonly messagesChanged = new Signal();
}
