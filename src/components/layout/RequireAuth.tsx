import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AccessPolicy } from "../../core/AccessPolicy";
import type { UserRole } from "../../domain/user";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { Loading } from "../Feedback";
import { RedirectWithNotice } from "./RedirectWithNotice";

/**
 * Sends visitors to the login page; a role that cannot open the page goes back to its own start in
 * the panel with a notice (customers to the notice that their account is used in the 3D museum).
 */
export function RequireAuth({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { user, ready } = useSession();
  const { i18n } = useLocale();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) {
    const message = user.role === "CUSTOMER" ? i18n.t("panel.customerTitle") : i18n.t("access.notForRole", { role: i18n.tx(`role.${user.role}`).toLowerCase() });
    return <RedirectWithNotice to={AccessPolicy.panelHome(user, true)} message={message} />;
  }
  return <>{children}</>;
}
