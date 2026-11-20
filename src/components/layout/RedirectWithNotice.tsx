import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useToast } from "../../state/ToastContext";

/** Sends the person to another route and tells them why (a page that is not for their account). */
export function RedirectWithNotice({ to, message }: { to: string; message: string }) {
  const toast = useToast();
  // React's strict mode runs effects twice in development: the notice must show once.
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    toast.show(message, "info");
  }, [toast, message]);
  return <Navigate to={to} replace />;
}
