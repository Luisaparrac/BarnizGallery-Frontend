import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { UserRole } from "../../domain/user";
import { useSession } from "../../state/SessionContext";
import { useLocale } from "../../state/LocaleContext";
import { CustomerNotice } from "../../panel/CustomerNotice";
import { EmptyState, Loading } from "../Feedback";

/** Sends visitors to the login page and blocks roles that cannot open the page. */
export function RequireAuth({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { user, ready } = useSession();
  const { i18n } = useLocale();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "CUSTOMER") return <CustomerNotice />;
    return (
      <div className="container">
        <EmptyState title={i18n.t("auth.forbiddenTitle")} text={i18n.t("auth.forbiddenText")} />
      </div>
    );
  }
  return <>{children}</>;
}
