import { Outlet } from "react-router-dom";
import { AccessPolicy } from "../../core/AccessPolicy";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { ErrorNote, Loading } from "../Feedback";
import { RedirectWithNotice } from "./RedirectWithNotice";

/**
 * The artisan's pages (summary, store, works, auctions, custom orders and orders) open only once the
 * administration approved the account; before that the artisan goes to the verification page.
 */
export function RequireApprovedArtisan() {
  const { user } = useSession();
  const { i18n } = useLocale();
  const master = useAsync(() => services.artisan.getMyMaster(), [user?.id]);
  if (master.loading && !master.data) return <Loading />;
  if (master.error !== null || !master.data) return <ErrorNote error={master.error} />;
  if (!AccessPolicy.can(user, "artisanPanel", master.data.verificationStatus === "APPROVED")) {
    return <RedirectWithNotice to="/artisan/verification" message={i18n.t("access.verifyFirst")} />;
  }
  return <Outlet />;
}
