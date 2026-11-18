import { Navigate } from "react-router-dom";
import { Loading } from "../components/Feedback";
import { useSession } from "../state/SessionContext";
import { CustomerNotice } from "./CustomerNotice";

/** Start of the panel: each role goes to its own area. */
export function PanelHome() {
  const { user, ready } = useSession();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "ADMIN") return <Navigate to="/admin" replace />;
  if (user.role === "ARTISAN") return <Navigate to="/artisan" replace />;
  return <CustomerNotice />;
}
