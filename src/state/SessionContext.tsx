import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { VisitorSetupStore } from "../core/VisitorSetupStore";
import type { LoginRequest, RegisterRequest, Session, User } from "../domain/user";
import { services } from "../services/ServiceRegistry";
import { useLocale } from "./LocaleContext";

interface SessionValue {
  session: Session | null;
  user: User | null;
  ready: boolean;
  login(request: LoginRequest): Promise<User>;
  register(request: RegisterRequest): Promise<User>;
  logout(): Promise<void>;
  /** Replaces the user after a profile change. */
  updateUser(user: User): void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { setLanguage } = useLocale();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    services.auth
      .restore()
      .then((restored) => {
        setSession(restored);
        if (restored && !VisitorSetupStore.loadLanguage()) setLanguage(restored.user.preferredLanguage);
      })
      .finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Applies what the visitor chose before signing in (avatar and questionnaire). */
  const applyVisitorSetup = useCallback(async (user: User): Promise<User> => {
    const setup = VisitorSetupStore.load();
    let updated = user;
    if (setup.avatarId && !user.avatarId) updated = await services.profile.updateProfile({ avatarId: setup.avatarId });
    if (setup.taste) {
      const current = await services.profile.getTasteProfile().catch(() => null);
      if (!current) await services.profile.saveTasteProfile(setup.taste).catch(() => undefined);
    }
    return updated;
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      user: session?.user ?? null,
      ready,
      async login(request) {
        const created = await services.auth.login(request);
        const user = await applyVisitorSetup(created.user);
        setSession({ ...created, user });
        setLanguage(user.preferredLanguage);
        return user;
      },
      async register(request) {
        const created = await services.auth.register(request);
        const user = await applyVisitorSetup(created.user);
        setSession({ ...created, user });
        return user;
      },
      async logout() {
        await services.auth.logout();
        setSession(null);
      },
      updateUser(user) {
        setSession((current) => (current ? { ...current, user } : current));
      },
    }),
    [session, ready, applyVisitorSetup, setLanguage],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession outside SessionProvider");
  return value;
}
