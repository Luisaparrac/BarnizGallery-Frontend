import { Signal } from "../../core/Signal";
import type { LoginRequest, User } from "../../domain/user";
import { services } from "../../services/ServiceRegistry";

/**
 * Who is walking the plaza: a guest or a signed-in user. The boards ask it before buying or
 * saving a piece, and it tells everyone when the visitor signs in from a board.
 */
export class VisitorSession {
  readonly changed = new Signal<User | null>();

  constructor(private current: User | null) {}

  get user(): User | null {
    return this.current;
  }

  get signedIn(): boolean {
    return this.current !== null;
  }

  /** Signs in from a board (the avatar chosen in the lobby stays). */
  async login(request: LoginRequest): Promise<User> {
    const session = await services.auth.login(request);
    this.current = session.user;
    this.changed.emit(session.user);
    return session.user;
  }
}
