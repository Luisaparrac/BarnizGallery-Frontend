import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { ResinBand } from "../../components/ResinBand";
import { AppEvents } from "../../core/AppEvents";
import type { PaymentMethod } from "../../domain/commerce";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

const METHODS: PaymentMethod[] = ["CARD", "PSE", "NEQUI", "PAYPAL"];

/**
 * Test gateway used while the real one (Wompi) is not connected. It asks for no card data: it only
 * plays the gateway's answer (approved or rejected), which reaches the order as a webhook would.
 */
export function PaymentGatewayPage() {
  const { paymentId = "" } = useParams();
  const { i18n, format } = useLocale();
  const toast = useToast();
  const errorText = useErrorText();
  const payment = useAsync(() => services.commerce.getPayment(Number(paymentId)), [paymentId]);
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [busy, setBusy] = useState(false);

  const answer = async (result: "APPROVED" | "REJECTED") => {
    setBusy(true);
    try {
      payment.setData(await services.commerce.simulateGatewayResult(Number(paymentId), method, result));
      AppEvents.notificationsChanged.emit();
      AppEvents.cartChanged.emit();
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  if (payment.loading && !payment.data) return <Loading />;
  if (payment.error !== null || !payment.data) return <div className="container"><ErrorNote error={payment.error} /></div>;
  const data = payment.data;
  const done = data.status !== "CREATED" && data.status !== "PENDING";
  return (
    <div className="container narrow">
      <div className="gateway">
        <ResinBand height={8} seed={41} />
        <div className="gateway-body">
          <p className="gateway-name">{i18n.t("gateway.name")}</p>
          <p className="muted">{i18n.t("gateway.reference", { reference: data.reference })}</p>
          <p className="big-number">{format.money(data.amount, data.currency)}</p>
          {!done ? (
            <>
              <fieldset className="field">
                <legend className="field-label">{i18n.t("gateway.method")}</legend>
                <div className="chips">
                  {METHODS.map((option) => (
                    <button key={option} type="button" className={`chip${method === option ? " is-on" : ""}`} aria-pressed={method === option} onClick={() => setMethod(option)}>
                      {i18n.tx(`gateway.methods.${option}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <Note>{i18n.t("gateway.testNotice")}</Note>
              <div className="actions">
                <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => void answer("REJECTED")}>
                  {i18n.t("gateway.reject")}
                </button>
                <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={() => void answer("APPROVED")}>
                  {busy ? i18n.t("gateway.processing") : i18n.t("gateway.approve")}
                </button>
              </div>
            </>
          ) : (
            <>
              <Note tone={data.status === "APPROVED" ? "success" : "error"}>{i18n.tx(`gateway.result.${data.status}`)}</Note>
              <div className="actions">
                <Link to={`/account/orders/${data.orderId}`} className="btn btn-primary">
                  {i18n.t("gateway.seeOrder")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
