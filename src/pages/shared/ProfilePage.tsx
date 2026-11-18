import { useState, type FormEvent } from "react";
import { Note } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { AppConfig } from "../../config/AppConfig";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { useToast } from "../../state/ToastContext";
import { COUNTRIES } from "../../utils/countries";

const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Account of an artisan or administrator in the panel: name, phone, country, language and password. */
export function ProfilePage() {
  const { i18n, language, setLanguage } = useLocale();
  const { user, updateUser } = useSession();
  const toast = useToast();
  const errorText = useErrorText();
  const [form, setForm] = useState({ fullName: user!.fullName, countryCode: user!.countryCode ?? "", phone: user!.phone ?? "" });
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [busy, setBusy] = useState(false);

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      updateUser(await services.profile.updateProfile({ ...form, countryCode: form.countryCode || null, phone: form.phone || null, preferredLanguage: language }));
      toast.show(i18n.t("profile.saved"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.show(i18n.t("profile.passwordMismatch"), "error");
      return;
    }
    setBusy(true);
    try {
      await services.auth.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setPasswords(EMPTY_PASSWORDS);
      toast.show(i18n.t("profile.passwordChanged"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const verifyEmail = async () => {
    try {
      await services.auth.verifyEmail("demo");
      updateUser({ ...user!, emailVerified: true });
      toast.show(i18n.t("profile.emailVerified"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <div className="container narrow">
      <PageHeader title={i18n.t("profile.title")} lead={`${user!.email} — ${i18n.tx(`role.${user!.role}`)}`} />
      {!user!.emailVerified && (
        <Note tone="warn">
          {i18n.t("profile.emailNotVerified")}{" "}
          {AppConfig.usesApi("auth") ? (
            i18n.t("profile.checkInbox")
          ) : (
            <button type="button" className="btn btn-link" onClick={() => void verifyEmail()}>
              {i18n.t("profile.verifyDemo")}
            </button>
          )}
        </Note>
      )}

      <form className="form-grid two" onSubmit={(event) => void saveAccount(event)}>
        <Field label={i18n.t("auth.fullName")}>
          <input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        </Field>
        <Field label={i18n.t("address.phone")}>
          <input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </Field>
        <Field label={i18n.t("address.country")}>
          <select value={form.countryCode} onChange={(event) => setForm({ ...form, countryCode: event.target.value })}>
            <option value="">—</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country[language]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={i18n.t("nav.language")}>
          <select value={language} onChange={(event) => setLanguage(event.target.value as "es" | "en")}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </Field>
        <div className="actions field-wide">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {i18n.t("common.save")}
          </button>
        </div>
      </form>

      <h2 className="h3">{i18n.t("profile.passwordTitle")}</h2>
      <form className="form-grid two" onSubmit={(event) => void changePassword(event)}>
        <Field label={i18n.t("profile.currentPassword")}>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
          />
        </Field>
        <span />
        <Field label={i18n.t("profile.newPassword")} hint={i18n.t("auth.passwordHint")}>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
          />
        </Field>
        <Field label={i18n.t("profile.confirmPassword")}>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={passwords.confirmPassword}
            onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}
          />
        </Field>
        <div className="actions field-wide">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {i18n.t("profile.passwordTitle")}
          </button>
        </div>
      </form>
    </div>
  );
}
