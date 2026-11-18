import { useEffect, useState, type FormEvent } from "react";
import { AddressForm, AddressText } from "../../components/AddressForm";
import { AvatarPicker } from "../../components/AvatarPicker";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { PageHeader } from "../../components/PageHeader";
import { RecommendationList } from "../../components/RecommendationList";
import { EMPTY_TASTE, TasteForm } from "../../components/TasteForm";
import { AppConfig } from "../../config/AppConfig";
import type { Id } from "../../domain/common";
import type { ArtworkSummary, StoreSummary } from "../../domain/gallery";
import type { Recommendation, TasteProfile } from "../../domain/taste";
import type { Address, AddressInput } from "../../domain/user";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { useToast } from "../../state/ToastContext";
import { COUNTRIES } from "../../utils/countries";

type Tab = "account" | "taste" | "addresses";

/** Account data, avatar, language, taste questionnaire with recommendations, and shipping addresses. */
export function ProfilePage() {
  const { i18n, language, setLanguage } = useLocale();
  const { user, updateUser } = useSession();
  const toast = useToast();
  const errorText = useErrorText();
  const [tab, setTab] = useState<Tab>("account");
  const [form, setForm] = useState({ fullName: user!.fullName, countryCode: user!.countryCode ?? "", phone: user!.phone ?? "" });
  const [avatarId, setAvatarId] = useState<Id | null>(user!.avatarId);
  const taste = useAsync(() => services.profile.getTasteProfile(), []);
  const [answers, setAnswers] = useState<TasteProfile>(EMPTY_TASTE);
  const [recs, setRecs] = useState<{ recommendations: Recommendation[]; artworks: ArtworkSummary[]; stores: StoreSummary[] } | null>(null);
  const addresses = useAsync(() => services.profile.listAddresses(), []);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (taste.data) setAnswers(taste.data);
  }, [taste.data]);

  const saveAccount = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      updateUser(await services.profile.updateProfile({ ...form, countryCode: form.countryCode || null, phone: form.phone || null, avatarId, preferredLanguage: language }));
      toast.show(i18n.t("profile.saved"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveTaste = async () => {
    setBusy(true);
    try {
      await services.profile.saveTasteProfile(answers);
      const [recommendations, artworks, stores] = await Promise.all([services.profile.computeRecommendations("hybrid"), services.gallery.listArtworks({}), services.gallery.listStores()]);
      setRecs({ recommendations, artworks, stores });
      toast.show(i18n.t("profile.tasteSaved"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveAddress = async (input: AddressInput) => {
    try {
      await services.profile.saveAddress(input, editing && editing !== "new" ? editing.id : undefined);
      setEditing(null);
      await addresses.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
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
      <div className="tabs" role="tablist">
        {(user!.role === "ADMIN" ? (["account"] as Tab[]) : (["account", "taste", "addresses"] as Tab[])).map((name) => (
          <button key={name} role="tab" aria-selected={tab === name} className={tab === name ? "is-on" : ""} onClick={() => setTab(name)}>
            {i18n.tx(`profile.tab.${name}`)}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <form className="form-grid two" onSubmit={(event) => void saveAccount(event)}>
          <Field label={i18n.t("auth.fullName")}>
            <input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </Field>
          <Field label={i18n.t("address.phone")}>
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
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
          <div className="field field-wide">
            <span className="field-label">{i18n.t("welcome.avatarTitle")}</span>
            <AvatarPicker value={avatarId} onChange={setAvatarId} />
          </div>
          <div className="actions field-wide">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {i18n.t("common.save")}
            </button>
          </div>
        </form>
      )}

      {tab === "taste" && (
        <section>
          {taste.loading ? <Loading /> : taste.error !== null ? <ErrorNote error={taste.error} /> : <TasteForm value={answers} onChange={setAnswers} />}
          <div className="actions">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveTaste()}>
              {i18n.t("profile.saveTaste")}
            </button>
          </div>
          {recs && (recs.recommendations.length ? <RecommendationList {...recs} /> : <p className="muted">{i18n.t("welcome.noMatches")}</p>)}
        </section>
      )}

      {tab === "addresses" && (
        <section>
          {addresses.loading && <Loading />}
          {editing ? (
            <AddressForm initial={editing === "new" ? null : editing} onSave={(input) => void saveAddress(input)} onCancel={() => setEditing(null)} />
          ) : (
            <>
              <ul className="address-cards">
                {addresses.data?.map((address) => (
                  <li key={address.id}>
                    <AddressText address={address} />
                    {address.isDefault && <span className="badge badge-good">{i18n.t("address.isDefault")}</span>}
                    <div className="actions">
                      <button type="button" className="btn btn-link" onClick={() => setEditing(address)}>
                        {i18n.t("common.edit")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-link"
                        onClick={() => void services.profile.deleteAddress(address.id).then(() => addresses.reload())}
                      >
                        {i18n.t("common.delete")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-quiet" onClick={() => setEditing("new")}>
                {i18n.t("checkout.newAddress")}
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
