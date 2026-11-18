import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AvatarPicker } from "../../components/AvatarPicker";
import { ErrorNote, Note } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { AppConfig } from "../../config/AppConfig";
import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import type { Id } from "../../domain/common";
import type { User } from "../../domain/user";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { COUNTRIES } from "../../utils/countries";

const DEMO_ACCOUNTS = [
  { email: "ana@example.com", role: "CUSTOMER" },
  { email: "valderrama@museo.co", role: "ARTISAN" },
  { email: "nueva@museo.co", role: "ARTISAN_PENDING" },
  { email: "admin@museo.co", role: "ADMIN" },
];

function homeFor(user: User): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "ARTISAN") return "/artisan";
  return "/gallery";
}

export function LoginPage() {
  const { i18n } = useLocale();
  const { login } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login({ email, password });
      navigate(params.get("next") ?? homeFor(user), { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow auth">
      <h1>{i18n.t("auth.loginTitle")}</h1>
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <Field label={i18n.t("auth.email")}>
          <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label={i18n.t("auth.password")}>
          <input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error !== null && <ErrorNote error={error} />}
        <button type="submit" className="btn btn-primary btn-large" disabled={busy}>
          {i18n.t("auth.login")}
        </button>
      </form>
      <p className="auth-links">
        <Link to="/forgot-password">{i18n.t("auth.forgot")}</Link> · <Link to="/register">{i18n.t("auth.noAccount")}</Link>
      </p>
      {AppConfig.anyMock && (
        <Note>
          <strong>{i18n.t("demo.accountsTitle")}</strong> {i18n.t("demo.accountsText")}
          <ul className="demo-accounts">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword("museo123");
                  }}
                >
                  {account.email}
                </button>{" "}
                — {i18n.tx(`demo.role.${account.role}`)}
              </li>
            ))}
          </ul>
        </Note>
      )}
    </div>
  );
}

export function RegisterPage() {
  const { i18n, language } = useLocale();
  const { register } = useSession();
  const navigate = useNavigate();
  const setup = VisitorSetupStore.load();
  const [role, setRole] = useState<"CUSTOMER" | "ARTISAN">("CUSTOMER");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", countryCode: language === "es" ? "CO" : "US", workshop: "", city: "Pasto" });
  const [avatarId, setAvatarId] = useState<Id | null>(setup.avatarId);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await register({ ...form, role, preferredLanguage: language, avatarId });
      navigate(user.role === "ARTISAN" ? "/artisan/verification" : setup.completed ? "/gallery" : "/welcome", { replace: true });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container narrow auth">
      <h1>{i18n.t("auth.registerTitle")}</h1>
      <div className="role-choice" role="radiogroup" aria-label={i18n.t("auth.roleQuestion")}>
        {(["CUSTOMER", "ARTISAN"] as const).map((option) => (
          <button key={option} type="button" role="radio" aria-checked={role === option} className={role === option ? "is-on" : ""} onClick={() => setRole(option)}>
            <strong>{i18n.tx(`auth.roleOption.${option}`)}</strong>
            <span>{i18n.tx(`auth.roleOptionText.${option}`)}</span>
          </button>
        ))}
      </div>
      <form className="form-grid two" onSubmit={(event) => void submit(event)}>
        <Field label={i18n.t("auth.fullName")}>
          <input required autoComplete="name" value={form.fullName} onChange={(event) => set({ fullName: event.target.value })} />
        </Field>
        <Field label={i18n.t("address.country")}>
          <select value={form.countryCode} onChange={(event) => set({ countryCode: event.target.value })}>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country[language]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={i18n.t("auth.email")}>
          <input type="email" required autoComplete="email" value={form.email} onChange={(event) => set({ email: event.target.value })} />
        </Field>
        <Field label={i18n.t("auth.password")} hint={i18n.t("auth.passwordHint")}>
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => set({ password: event.target.value })} />
        </Field>
        {role === "ARTISAN" && (
          <>
            <Field label={i18n.t("auth.workshop")}>
              <input required value={form.workshop} onChange={(event) => set({ workshop: event.target.value })} />
            </Field>
            <Field label={i18n.t("address.city")}>
              <input required value={form.city} onChange={(event) => set({ city: event.target.value })} />
            </Field>
            <Note tone="info">{i18n.t("auth.artisanSteps")}</Note>
          </>
        )}
        <div className="field field-wide">
          <span className="field-label">{i18n.t("welcome.avatarTitle")}</span>
          <AvatarPicker value={avatarId} onChange={setAvatarId} />
        </div>
        {error !== null && (
          <div className="field-wide">
            <ErrorNote error={error} />
          </div>
        )}
        <div className="actions field-wide">
          <button type="submit" className="btn btn-primary btn-large" disabled={busy}>
            {i18n.t("auth.createAccount")}
          </button>
        </div>
      </form>
      <p className="auth-links">
        <Link to="/login">{i18n.t("auth.haveAccount")}</Link>
      </p>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { i18n } = useLocale();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await services.auth.requestPasswordReset(email);
      setSent(true);
    } catch (caught) {
      setError(caught);
    }
  };
  return (
    <div className="container narrow auth">
      <h1>{i18n.t("auth.forgotTitle")}</h1>
      {sent ? (
        <Note tone="success">{i18n.t("auth.forgotSent", { email })}</Note>
      ) : (
        <form className="form-grid" onSubmit={(event) => void submit(event)}>
          <p className="lead">{i18n.t("auth.forgotLead")}</p>
          <Field label={i18n.t("auth.email")}>
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          {error !== null && <ErrorNote error={error} />}
          <button type="submit" className="btn btn-primary">
            {i18n.t("auth.sendLink")}
          </button>
        </form>
      )}
      <p className="auth-links">
        <Link to="/login">{i18n.t("auth.backToLogin")}</Link>
      </p>
    </div>
  );
}
