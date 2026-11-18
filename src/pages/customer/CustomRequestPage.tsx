import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { ColorDots } from "../../components/ColorDots";
import { ContactMasterModal, type ContactTarget } from "../../components/ContactMasterModal";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import type { CustomRequest } from "../../domain/customOrder";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

/** One custom request: AI designs while it is a draft, then the artisans' offers to accept or reject. */
export function CustomRequestPage() {
  const { id = "" } = useParams();
  const { i18n, format } = useLocale();
  const { shape, style, motif, setting } = useCatalogs();
  const navigate = useNavigate();
  const toast = useToast();
  const errorText = useErrorText();
  const request = useAsync(() => services.customOrder.get(Number(id)), [id]);
  const [busy, setBusy] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const maxDesigns = Number(setting("custom_orders.max_ai_designs", 4));
  const deposit = Number(setting("custom_orders.deposit_percent", 50));

  const run = async (key: string, action: () => Promise<CustomRequest>, done?: string) => {
    setBusy(key);
    try {
      request.setData(await action());
      if (done) toast.show(done, "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(null);
    }
  };

  if (request.loading && !request.data) return <Loading />;
  if (request.error !== null || !request.data) return <div className="container"><ErrorNote error={request.error} /></div>;
  const data = request.data;
  const draft = data.status === "DRAFT" || data.status === "GENERATING";
  const open = data.status === "PUBLISHED" || data.status === "WITH_OFFERS";

  const accept = async (offerId: number) => {
    if (!window.confirm(i18n.t("custom.acceptConfirm", { percent: deposit }))) return;
    setBusy(`accept-${offerId}`);
    try {
      const result = await services.customOrder.acceptOffer(data.id, offerId);
      request.setData(result.request);
      navigate(`/account/orders/${result.orderId}`);
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="container">
      <PageHeader
        title={data.title}
        lead={
          <>
            <StatusBadge kind="customRequest" value={data.status} /> {data.expiresAt && open && i18n.t("custom.openUntil", { date: format.date(data.expiresAt) })}
          </>
        }
        actions={
          draft ? (
            <Link to={`/account/custom/${data.id}/edit`} className="btn btn-quiet">
              {i18n.t("common.edit")}
            </Link>
          ) : undefined
        }
      />
      <div className="request-layout">
        <section className="block">
          <h2 className="h3">{i18n.t("custom.designs")}</h2>
          {draft && <p className="muted">{i18n.t("custom.designsLead", { max: maxDesigns })}</p>}
          <div className="design-grid">
            {data.designs.map((design) => (
              <figure key={design.id} className={design.isSelected ? "is-selected" : ""}>
                <ArtImage src={design.imageUrl} alt={i18n.t("custom.designAlt")} />
                <figcaption>
                  {design.isSelected ? (
                    <span className="badge badge-good">{i18n.t("custom.chosen")}</span>
                  ) : (
                    draft && (
                      <button type="button" className="btn btn-link" onClick={() => void run(`select-${design.id}`, () => services.customOrder.selectDesign(data.id, design.id))}>
                        {i18n.t("custom.choose")}
                      </button>
                    )
                  )}
                </figcaption>
              </figure>
            ))}
            {data.status === "GENERATING" && <div className="design-pending">{i18n.t("custom.generating")}</div>}
          </div>
          {draft && (
            <div className="actions">
              <button
                type="button"
                className="btn btn-quiet"
                disabled={busy !== null || data.designs.length >= maxDesigns}
                onClick={() => void run("generate", () => services.customOrder.generateDesign(data.id))}
              >
                <Icon name="spark" /> {busy === "generate" ? i18n.t("custom.generating") : i18n.t("custom.generate", { count: data.designs.length, max: maxDesigns })}
              </button>
              <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void run("publish", () => services.customOrder.publish(data.id), i18n.t("custom.published"))}>
                {i18n.t("custom.publish")}
              </button>
            </div>
          )}
          {draft && <Note>{i18n.t("custom.publishNote")}</Note>}
        </section>
        <section className="block">
          <h2 className="h3">{i18n.t("custom.details")}</h2>
          <p className="prose">{data.description}</p>
          <dl className="specs">
            <dt>{i18n.t("custom.fieldShape")}</dt>
            <dd>{i18n.name(shape(data.shapeId)) || "—"}</dd>
            <dt>{i18n.t("custom.fieldStyle")}</dt>
            <dd>{i18n.name(style(data.styleId)) || "—"}</dd>
            <dt>{i18n.t("taste.colors")}</dt>
            <dd>
              <ColorDots colorIds={data.colorIds} />
            </dd>
            <dt>{i18n.t("taste.motifs")}</dt>
            <dd>{data.motifIds.map((motifId) => i18n.name(motif(motifId))).join(", ") || "—"}</dd>
            <dt>{i18n.t("custom.fieldSize")}</dt>
            <dd>{data.sizeNotes || "—"}</dd>
            <dt>{i18n.t("custom.fieldPrice")}</dt>
            <dd>{data.offeredPrice ? format.money(data.offeredPrice, data.currency) : "—"}</dd>
            <dt>{i18n.t("custom.fieldDate")}</dt>
            <dd>{data.desiredDate ? format.date(data.desiredDate) : "—"}</dd>
          </dl>
        </section>
      </div>

      {!draft && (
        <section className="block">
          <h2 className="h3">{i18n.t("custom.offers")}</h2>
          {!data.offers.length && <p className="muted">{i18n.t("custom.noOffers")}</p>}
          <ul className="offer-list">
            {data.offers.map((offer) => (
              <li key={offer.id} className={`offer offer-${offer.status.toLowerCase()}`}>
                <div>
                  <Link to={`/stores/${offer.storeSlug}`}>
                    <strong>{offer.masterName}</strong>
                  </Link>
                  <span className="muted">{i18n.tx(`status.offerType.${offer.type}`)}</span>
                </div>
                <div className="offer-numbers">
                  <strong>{format.money(offer.price, offer.currency)}</strong>
                  <span>{i18n.t("custom.days", { days: offer.estimatedDays })}</span>
                </div>
                {offer.message && <p>{offer.message}</p>}
                <div className="offer-actions">
                  <StatusBadge kind="offer" value={offer.status} />
                  {open && offer.status === "SENT" && (
                    <>
                      <button type="button" className="btn btn-quiet" disabled={busy !== null} onClick={() => void run(`reject-${offer.id}`, () => services.customOrder.rejectOffer(data.id, offer.id))}>
                        {i18n.t("custom.reject")}
                      </button>
                      <button type="button" className="btn btn-primary" disabled={busy !== null} onClick={() => void accept(offer.id)}>
                        {i18n.t("custom.accept")}
                      </button>
                    </>
                  )}
                  <button type="button" className="btn btn-link" onClick={() => setContact({ masterId: offer.masterId, masterName: offer.masterName, subject: data.title, customRequestId: data.id })}>
                    {i18n.t("custom.askArtisan")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {data.status === "ACCEPTED" && <Note tone="success">{i18n.t("custom.acceptedNote", { percent: deposit })} <Link to="/account/orders">{i18n.t("nav.orders")}</Link></Note>}
        </section>
      )}

      <div className="actions">
        {(draft || open) && (
          <button
            type="button"
            className="btn btn-link"
            onClick={() => window.confirm(i18n.t("custom.cancelConfirm")) && void run("cancel", () => services.customOrder.cancel(data.id))}
          >
            {i18n.t("custom.cancel")}
          </button>
        )}
      </div>
      <ContactMasterModal target={contact} onClose={() => setContact(null)} />
    </div>
  );
}
