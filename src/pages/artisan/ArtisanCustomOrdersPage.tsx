import { useState, type FormEvent } from "react";
import { ArtImage } from "../../components/ArtImage";
import { ColorDots } from "../../components/ColorDots";
import { EmptyState, ErrorNote, Loading, Note } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ReportButton } from "../../components/ReportButton";
import { StatusBadge } from "../../components/StatusBadge";
import type { CustomRequest } from "../../domain/customOrder";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";
import { NameMask } from "../../utils/NameMask";

type Tab = "new" | "accepted" | "declined";

/**
 * The master's custom orders: the requests addressed to them and the ones open to every master.
 * New ones can be accepted (price, delivery time and a message become an offer for the customer)
 * or declined with an optional reason; the other tabs list the offers sent and the declined ones.
 */
export function ArtisanCustomOrdersPage() {
  const { i18n, format } = useLocale();
  const { shape, style, motif } = useCatalogs();
  const toast = useToast();
  const errorText = useErrorText();
  const [tab, setTab] = useState<Tab>("new");
  const data = useAsync(async () => {
    const [open, accepted, declined, master] = await Promise.all([
      services.customOrder.listOpen(),
      services.customOrder.listAccepted(),
      services.customOrder.listDeclined(),
      services.artisan.getMyMaster(),
    ]);
    const answered = new Set(accepted.filter((request) => request.offers.some((offer) => offer.masterId === master.id && offer.status !== "WITHDRAWN")).map((request) => request.id));
    return { fresh: open.filter((request) => !answered.has(request.id)), accepted, declined, master };
  }, []);
  const [accepting, setAccepting] = useState<CustomRequest | null>(null);
  const [declining, setDeclining] = useState<CustomRequest | null>(null);
  const [offer, setOffer] = useState({ price: "", days: "20", message: "" });
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <ErrorNote error={data.error} />;
  const { master } = data.data;
  const approved = master.verificationStatus === "APPROVED";
  const lists: Record<Tab, CustomRequest[]> = { new: data.data.fresh, accepted: data.data.accepted, declined: data.data.declined };
  const myOffer = (request: CustomRequest) => request.offers.find((entry) => entry.masterId === master.id && entry.status !== "WITHDRAWN");

  const openAccept = (request: CustomRequest) => {
    setOffer({ price: String(request.offeredPrice ?? ""), days: "20", message: "" });
    setAccepting(request);
  };

  const run = async (step: () => Promise<void>, done: string) => {
    setBusy(true);
    try {
      await step();
      toast.show(done, "success");
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const accept = (event: FormEvent) => {
    event.preventDefault();
    const target = accepting;
    if (!target) return;
    const price = Number(offer.price);
    void run(async () => {
      await services.customOrder.sendOffer(target.id, {
        type: target.offeredPrice !== null && price === target.offeredPrice ? "ACCEPT_PRICE" : "COUNTER_OFFER",
        price,
        estimatedDays: Number(offer.days),
        message: offer.message,
        designId: target.designs.find((design) => design.isSelected)?.id ?? null,
      });
      setAccepting(null);
    }, i18n.t("artisanCustom.sent"));
  };

  const decline = (event: FormEvent) => {
    event.preventDefault();
    const target = declining;
    if (!target) return;
    void run(async () => {
      await services.customOrder.decline(target.id, reason.trim() || null);
      setDeclining(null);
      setReason("");
    }, i18n.t("artisanCustom.declined"));
  };

  const withdraw = (request: CustomRequest, offerId: number) => void run(() => services.customOrder.withdrawOffer(request.id, offerId).then(() => undefined), i18n.t("artisanCustom.withdrawn"));

  const list = lists[tab];
  return (
    <>
      <PageHeader title={i18n.t("artisanCustom.title")} lead={i18n.t("artisanCustom.lead")} />
      {!approved && <Note tone="warn">{i18n.t("artisan.notApproved")}</Note>}
      <div className="tabs" role="tablist">
        {(["new", "accepted", "declined"] as Tab[]).map((name) => (
          <button key={name} role="tab" aria-selected={tab === name} className={tab === name ? "is-on" : ""} onClick={() => setTab(name)}>
            {i18n.tx(`artisanCustom.tab.${name}`)} ({lists[name].length})
          </button>
        ))}
      </div>
      {!list.length && <EmptyState title={i18n.tx(`artisanCustom.empty.${tab}`)} />}
      <div className="inbox">
        {list.map((request) => {
          const design = request.designs.find((entry) => entry.isSelected) ?? request.designs[0];
          const others = request.designs.filter((entry) => entry !== design && entry.imageUrl);
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
                  {i18n.t("artisanCustom.client")}: {NameMask.mask(request.buyerName)} — {format.date(request.createdAt)}
                  {request.targetMasterId === master.id && <> — {i18n.t("artisanCustom.forYou")}</>}
                </p>
                <p className="prose">{request.description}</p>
                {others.length > 0 && (
                  <div className="design-thumbs" aria-label={i18n.t("artisanCustom.designs")}>
                    {others.map((entry) => (
                      <ArtImage key={entry.id} src={entry.imageUrl} alt={i18n.t("custom.designAlt")} />
                    ))}
                  </div>
                )}
                <dl className="specs compact">
                  <dt>{i18n.t("artisanCustom.budget")}</dt>
                  <dd>{request.offeredPrice ? format.money(request.offeredPrice, request.currency) : i18n.t("custom.noPrice")}</dd>
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
                  <dt>{i18n.t("custom.fieldDate")}</dt>
                  <dd>{request.desiredDate ? format.date(request.desiredDate) : "—"}</dd>
                </dl>
                <div className="actions">
                  {tab === "new" && (
                    <>
                      <button type="button" className="btn btn-primary" disabled={!approved || busy} onClick={() => openAccept(request)}>
                        {i18n.t("artisanCustom.accept")}
                      </button>
                      <button type="button" className="btn btn-quiet" disabled={!approved || busy} onClick={() => setDeclining(request)}>
                        {i18n.t("artisanCustom.decline")}
                      </button>
                    </>
                  )}
                  {tab === "accepted" && mine && (
                    <>
                      <span>
                        {i18n.t("artisanCustom.yourOffer", { price: format.money(mine.price, mine.currency), days: mine.estimatedDays })} <StatusBadge kind="offer" value={mine.status} />
                      </span>
                      {mine.status === "SENT" && (
                        <button type="button" className="btn btn-link" disabled={busy} onClick={() => withdraw(request, mine.id)}>
                          {i18n.t("artisanCustom.withdraw")}
                        </button>
                      )}
                    </>
                  )}
                  {tab === "declined" && <span className="muted">{request.declineReason ? i18n.t("artisanCustom.declinedBecause", { reason: request.declineReason }) : i18n.t("artisanCustom.declinedNoReason")}</span>}
                  <ReportButton entityType="CUSTOM_REQUEST" entityId={request.id} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <Modal title={i18n.t("artisanCustom.acceptTitle", { title: accepting?.title ?? "" })} open={!!accepting} onClose={() => setAccepting(null)}>
        <form className="form-grid" onSubmit={accept}>
          {accepting?.offeredPrice ? <Note>{i18n.t("artisanCustom.budgetHint", { price: format.money(accepting.offeredPrice, accepting.currency) })}</Note> : null}
          <Field label={i18n.t("artisanCustom.price")}>
            <input type="number" required min={1} value={offer.price} onChange={(event) => setOffer({ ...offer, price: event.target.value })} />
          </Field>
          <Field label={i18n.t("artisanCustom.days")}>
            <input type="number" required min={1} value={offer.days} onChange={(event) => setOffer({ ...offer, days: event.target.value })} />
          </Field>
          <Field label={i18n.t("artisanCustom.message")}>
            <textarea rows={3} required value={offer.message} onChange={(event) => setOffer({ ...offer, message: event.target.value })} placeholder={i18n.t("artisanCustom.messagePlaceholder")} />
          </Field>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {i18n.t("artisanCustom.send")}
            </button>
          </div>
        </form>
      </Modal>
      <Modal title={i18n.t("artisanCustom.declineTitle", { title: declining?.title ?? "" })} open={!!declining} onClose={() => setDeclining(null)}>
        <form className="form-grid" onSubmit={decline}>
          <Field label={i18n.t("artisanCustom.declineReason")}>
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={i18n.t("artisanCustom.declinePlaceholder")} />
          </Field>
          <div className="actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {i18n.t("artisanCustom.declineSend")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
