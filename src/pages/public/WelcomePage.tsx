import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AvatarPicker } from "../../components/AvatarPicker";
import { ErrorNote, Loading } from "../../components/Feedback";
import { RecommendationList } from "../../components/RecommendationList";
import { ResinBand } from "../../components/ResinBand";
import { EMPTY_TASTE, TasteForm } from "../../components/TasteForm";
import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import type { Id } from "../../domain/common";
import type { ArtworkSummary, StoreSummary } from "../../domain/gallery";
import type { Recommendation, TasteProfile } from "../../domain/taste";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";

type Step = "language" | "avatar" | "taste" | "result";
const STEPS: Step[] = ["language", "avatar", "taste", "result"];

interface Result {
  recommendations: Recommendation[];
  artworks: ArtworkSummary[];
  stores: StoreSummary[];
}

/** Start of the experience: language, avatar, taste questionnaire and the recommended stores and pieces. */
export function WelcomePage() {
  const { i18n, language, setLanguage } = useLocale();
  const { user, updateUser } = useSession();
  const navigate = useNavigate();
  const saved = VisitorSetupStore.load();
  const [step, setStep] = useState<Step>("language");
  const [avatarId, setAvatarId] = useState<Id | null>(user?.avatarId ?? saved.avatarId);
  const [taste, setTaste] = useState<TasteProfile>(saved.taste ?? EMPTY_TASTE);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      VisitorSetupStore.save({ completed: true, avatarId, taste });
      let recommendations: Recommendation[];
      if (user) {
        updateUser(await services.profile.updateProfile({ avatarId, preferredLanguage: language }));
        await services.profile.saveTasteProfile(taste);
        recommendations = await services.profile.computeRecommendations("hybrid");
      } else {
        recommendations = await services.profile.recommendForVisitor(taste);
      }
      const [artworks, stores] = await Promise.all([services.gallery.listArtworks({}), services.gallery.listStores()]);
      setResult({ recommendations, artworks, stores });
      setStep("result");
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  const index = STEPS.indexOf(step);
  return (
    <div className="welcome">
      <ResinBand height={14} seed={21} />
      <div className="container narrow">
        <ol className="steps" aria-label={i18n.t("welcome.progress")}>
          {STEPS.map((name, position) => (
            <li key={name} className={position === index ? "is-current" : position < index ? "is-done" : ""}>
              <span>{position + 1}</span> {i18n.tx(`welcome.step.${name}`)}
            </li>
          ))}
        </ol>

        {step === "language" && (
          <section className="welcome-card">
            <h1>{i18n.t("welcome.languageTitle")}</h1>
            <p className="lead">{i18n.t("welcome.languageLead")}</p>
            <div className="lang-choice">
              {(["es", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  className={language === code ? "is-on" : ""}
                  onClick={() => {
                    setLanguage(code);
                    setStep("avatar");
                  }}
                >
                  <strong>{code === "es" ? "Español" : "English"}</strong>
                  <span>{code === "es" ? "Recorrer la galería en español" : "Browse the gallery in English"}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === "avatar" && (
          <section className="welcome-card">
            <h1>{i18n.t("welcome.avatarTitle")}</h1>
            <p className="lead">{i18n.t("welcome.avatarLead")}</p>
            <AvatarPicker value={avatarId} onChange={setAvatarId} />
            <div className="actions">
              <button type="button" className="btn btn-quiet" onClick={() => setStep("language")}>
                {i18n.t("common.back")}
              </button>
              <button type="button" className="btn btn-primary" disabled={!avatarId} onClick={() => setStep("taste")}>
                {i18n.t("common.continue")}
              </button>
            </div>
          </section>
        )}

        {step === "taste" && (
          <section className="welcome-card">
            <h1>{i18n.t("welcome.tasteTitle")}</h1>
            <p className="lead">{i18n.t("welcome.tasteLead")}</p>
            <TasteForm value={taste} onChange={setTaste} />
            {error !== null && <ErrorNote error={error} />}
            <div className="actions">
              <button type="button" className="btn btn-quiet" onClick={() => setStep("avatar")}>
                {i18n.t("common.back")}
              </button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void finish()}>
                {busy ? i18n.t("welcome.searching") : i18n.t("welcome.seeRecommendations")}
              </button>
            </div>
          </section>
        )}

        {step === "result" && (
          <section className="welcome-card">
            <h1>{i18n.t("welcome.resultTitle")}</h1>
            {!result ? (
              <Loading />
            ) : result.recommendations.length ? (
              <RecommendationList {...result} />
            ) : (
              <p className="lead">{i18n.t("welcome.noMatches")}</p>
            )}
            <div className="actions">
              <button type="button" className="btn btn-quiet" onClick={() => setStep("taste")}>
                {i18n.t("welcome.changeAnswers")}
              </button>
              {!user && (
                <Link to="/register" className="btn btn-quiet">
                  {i18n.t("welcome.createAccount")}
                </Link>
              )}
              <button type="button" className="btn btn-primary" onClick={() => navigate("/gallery")}>
                {i18n.t("welcome.enterGallery")}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
