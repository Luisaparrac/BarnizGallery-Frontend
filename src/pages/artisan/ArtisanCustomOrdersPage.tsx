import { useState, type FormEvent } from "react";
import { ArtImage } from "../../components/ArtImage";
import { ColorDots } from "../../components/ColorDots";
import { EmptyState, ErrorNote, Loading, Note } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ReportButton } from "../../components/ReportButton";
import { StatusBadge } from "../../components/StatusBadge";
import type { CustomRequest, OfferType } from "../../domain/customOrder";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

type Tab = "open" | "mine";

/** Open custom requests the artisan can answer, and the offers the artisan already sent. */
export function ArtisanCustomOrdersPage() {
  const { i18n, format } = useLocale();
  const { shape, style, motif } = useCatalogs();
  const toast = useToast();
  const errorText = useErrorText();
  const [tab, setTab] = useState<Tab>("open");
  const data = useAsync(async () => {
    const [open, mine, master] = await Promise.all([services.customOrder.listOpen(), services.customOrder.listAccepted(), services.artisan.getMyMaster()]);
    return { open, mine, master };
  }, []);
  const [target, setTarget] = useState<CustomRequest | null>(null);
  const [offer, setOffer] = useState({ type: "ACCEPT_PRICE" as OfferType, price: "", days: "20", message: "" });
  const [busy, setBusy] = useState(false);

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <ErrorNote error={data.error} />;
  const { master } = data.data;
  const myOffer = (request: CustomRequest) => request.offers.find((entry) => entry.masterId === master.id && entry.status !== "WITHDRAWN");

  const openOffer = (request: CustomRequest) => {
    setOffer({ type: request.offeredPrice ? "ACCEPT_PRICE" : "COUNTER_OFFER", price: String(request.offeredPrice ?? ""), days: "20", message: "" });
    setTarget(request);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    try {
      await services.customOrder.sendOffer(target.id, {
        type: offer.type,
        price: offer.type === "ACCEPT_PRICE" && target.offeredPrice ? target.offeredPrice : Number(offer.price),
        estimatedDays: Number(offer.days),
        message: offer.message,
        designId: target.designs.find((design) => design.isSelected)?.id ?? null,
      });
      setTarget(null);
      toast.show(i18n.t("artisanCustom.sent"), "success");
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (request: CustomRequest, offerId: number) => {
    try {
      await services.customOrder.withdrawOffer(request.id, offerId);
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  const list = tab === "open" ? data.data.open : data.data.mine;
  return (
    <>
      <PageHeader title={i18n.t("artisanCustom.title")} lead={i18n.t("artisanCustom.lead")} />
      {master.verificationStatus !== "APPROVED" && <Note tone="warn">{i18n.t("artisan.notApproved")}</Note>}
      <div className="tabs" role="tablist">
        {(["open", "mine"] as Tab[]).map((name) => (
          <button key={name} role="tab" aria-selected={tab === name} className={tab === name ? "is-on" : ""} onClick={() => setTab(name)}>
            {i18n.tx(`artisanCustom.tab.${name}`)} ({name === "open" ? data.data!.open.length : data.data!.mine.length})
          </button>
        ))}
      </div>
      {!list.length && <EmptyState title={i18n.tx(`artisanCustom.empty.${tab}`)} />}
      <div className="inbox">
        {list.map((request) => {
          const design = request.designs.find((entry) => entry.isSelected) ?? request.designs[0];
          const mine = myOffer(request);
          return (
            <article key={request.id} className="inbox-card">
              {design?.imageUrl ? <ArtImage src={design.imageUrl} alt={i18n.t("custom.designAlt")} /> : <div className="img-missing" />}
              <div className="inbox-body">
                <div className="inbox-head">
                  <h2 className="h3">{request.title}</h2>
                  <StatusBadge kind="customRequest" value={request.status} />
                </div>
                <p className="muted">
                  {request.buyerName} — {format.date(request.createdAt)}
                  {request.targetMasterId === master.id && <> — {i18n.t("artisanCustom.forYou")}</>}
                </p>
                <p className="prose">{request.description}</p>
                <dl className="specs compact">
                  <dt>{i18n.t("custom.fieldShape")}</dt>
                  <dd>{i18n.name(shape(request.shapeId)) || "—"}</dd>
                  <dt>{i18n.t("custom.fieldStyle")}</dt>
                  <dd>{i18n.name(style(request.styleId)) || "—"}</dd>
                  <dt>{i18n.t("taste.colors")}</dt>
                  <dd>
                    <ColorDots colorIds={request.colorIds} />
                  </dd>
                  <dt>{i18n.t("taste.motifs")}</dt>
                  <dd>{request.motifIds.map((id) => i18n.name(motif(id))).join(", ") || "—"}</dd>
                  <dt>{i18n.t("custom.fieldSize")}</dt>
                  <dd>{request.sizeNotes || "—"}</dd>
                  <dt>{i18n.t("artisanCustom.offered")}</dt>
                  <dd>{request.offeredPrice ? format.money(request.offeredPrice, request.currency) : i18n.t("custom.noPrice")}</dd>
                  <dt>{i18n.t("custom.fieldDate")}</dt>
                  <dd>{request.desiredDate ? format.date(request.desiredDate) : "—"}</dd>
                </dl>
                <div className="actions">
                  {mine ? (
                    <>
                      <span>
                        {i18n.t("artisanCustom.yourOffer", { price: format.money(mine.price, mine.currency), days: mine.estimatedDays })} <StatusBadge kind="offer" value={mine.status} />
                      </span>
                      {mine.status === "SENT" && (
                        <button type="button" className="btn btn-link" onClick={() => void withdraw(request, mine.id)}>
                          {i18n.t("artisanCustom.withdraw")}
                        </button>
                      )}
                    </>
                  ) : (
                    tab === "open" && (
                      <button type="button" className="btn btn-primary" disabled={master.verificationStatus !== "APPROVED"} onClick={() => openOffer(request)}>
                        {i18n.t("artisanCustom.makeOffer")}
                      </button>
                    )
                  )}
                  <ReportButton entityType="CUSTOM_REQUEST" entityId={request.id} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <Modal title={i18n.t("artisanCustom.offerTitle", { title: target?.title ?? "" })} open={!!target} onClose={() => setTarget(null)}>
        <form className="form-grid" onSubmit={(event) => void send(event)}>
          {target?.offeredPrice && (
            <div className="role-choice">
              {(["ACCEPT_PRICE", "COUNTER_OFFER"] as OfferType[]).map((type) => (
                <button key={type} type="button" className={offer.type === type ? "is-on" : ""} onClick={() => setOffer({ ...offer, type, price: type === "ACCEPT_PRICE" ? String(target.offeredPrice) : offer.price })}>
                  <strong>{i18n.tx(`status.offerType.${type}`)}</strong>
                  <span>{type === "ACCEPT_PRICE" ? format.money(target.offeredPrice, target.currency) : i18n.t("artisanCustom.counterHint")}</span>
                </button>
              ))}
            </div>
          )}
          {offer.type === "COUNTER_OFFER" && (
            <Field label={i18n.t("artisanCustom.price")}>
              <input type="number" required min={1} value={offer.price} onChange={(event) => setOffer({ ...offer, price: event.target.value })} />
            </Field>
          )}
          <Field label={i18n.t("artisanCustom.days")}>
            <input type="number" required min={1} value={offer.days} onChange={(event) => setOffer({ ...offer, days: event.target.value })} />
          </Field>
          <Field label={i18n.t("artisanCustom.message")}>
            <textarea rows={3} value={offer.message} onChange={(event) => setOffer({ ...offer, message: event.target.value })} placeholder={i18n.t("artisanCustom.messagePlaceholder")} />
          </Field>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {i18n.t("artisanCustom.send")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
