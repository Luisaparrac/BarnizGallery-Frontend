import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Countdown } from "../../components/Countdown";
import { EmptyState, ErrorNote, Loading } from "../../components/Feedback";
import { Field } from "../../components/Field";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export function ArtisanAuctionsPage() {
  const { i18n, format } = useLocale();
  const { setting } = useCatalogs();
  const toast = useToast();
  const errorText = useErrorText();
  const data = useAsync(async () => {
    const [auctions, artworks] = await Promise.all([services.auction.listMine(), services.artisan.listMyArtworks()]);
    return { auctions, artworks };
  }, []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    artworkId: "", basePrice: "", reservePrice: "", minIncrement: String(setting("auction.min_increment", 1)),
    startDate: local(new Date(Date.now() + 3600_000)), endDate: local(new Date(Date.now() + 3 * 86_400_000)),
  });
  const [busy, setBusy] = useState(false);

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <ErrorNote error={data.error} />;
  const busyArtworks = new Set(data.data.auctions.filter((auction) => auction.status === "ACTIVE" || auction.status === "SCHEDULED").map((auction) => auction.artworkId));
  const eligible = data.data.artworks.filter((artwork) => ["EXHIBITED"].includes(artwork.status) && !busyArtworks.has(artwork.id));

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await services.auction.create({
        artworkId: Number(form.artworkId),
        basePrice: Number(form.basePrice),
        reservePrice: form.reservePrice ? Number(form.reservePrice) : null,
        minIncrement: Number(form.minIncrement),
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      });
      setOpen(false);
      toast.show(i18n.t("artisanAuctions.created"), "success");
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: number) => {
    if (!window.confirm(i18n.t("artisanAuctions.cancelConfirm"))) return;
    try {
      await services.auction.cancel(id);
      await data.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <>
      <PageHeader
        title={i18n.t("artisanAuctions.title")}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setOpen(true)} disabled={!eligible.length}>
            <Icon name="plus" /> {i18n.t("artisanAuctions.new")}
          </button>
        }
      />
      {!data.data.auctions.length ? (
        <EmptyState title={i18n.t("artisanAuctions.empty")} text={i18n.t("artisanAuctions.emptyText")} />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("artworks.piece")}</th>
              <th>{i18n.t("auction.base")}</th>
              <th>{i18n.t("auction.highest")}</th>
              <th>{i18n.t("auction.bidCount")}</th>
              <th>{i18n.t("artisanAuctions.time")}</th>
              <th>{i18n.t("orders.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.data.auctions.map((auction) => (
              <tr key={auction.id}>
                <td>
                  <Link to={`/auctions/${auction.id}`}>{i18n.pick(auction.artworkTitleEs, auction.artworkTitleEn)}</Link>
                </td>
                <td>{format.money(auction.basePrice, auction.currency)}</td>
                <td>{auction.highestBid ? format.money(auction.highestBid, auction.currency) : "—"}</td>
                <td>{auction.bidCount}</td>
                <td>{auction.status === "ACTIVE" ? <Countdown until={auction.endDate} /> : auction.status === "SCHEDULED" ? format.dateTime(auction.startDate) : format.date(auction.endDate)}</td>
                <td>
                  <StatusBadge kind="auction" value={auction.status} />
                </td>
                <td>
                  {(auction.status === "ACTIVE" || auction.status === "SCHEDULED") && auction.bidCount === 0 && (
                    <button type="button" className="btn btn-link" onClick={() => void cancel(auction.id)}>
                      {i18n.t("common.cancel")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Modal title={i18n.t("artisanAuctions.new")} open={open} onClose={() => setOpen(false)}>
        <form className="form-grid two" onSubmit={(event) => void create(event)}>
          <Field label={i18n.t("artworks.piece")} wide>
            <select required value={form.artworkId} onChange={(event) => setForm({ ...form, artworkId: event.target.value })}>
              <option value="">—</option>
              {eligible.map((artwork) => (
                <option key={artwork.id} value={artwork.id}>
                  {i18n.pick(artwork.titleEs, artwork.titleEn)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={i18n.t("auction.base")}>
            <input type="number" required min={1} value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} />
          </Field>
          <Field label={i18n.t("auction.reserve")} hint={i18n.t("artisanAuctions.reserveHint")}>
            <input type="number" min={1} value={form.reservePrice} onChange={(event) => setForm({ ...form, reservePrice: event.target.value })} />
          </Field>
          <Field label={i18n.t("auction.increment")}>
            <input type="number" required min={1} value={form.minIncrement} onChange={(event) => setForm({ ...form, minIncrement: event.target.value })} />
          </Field>
          <span />
          <Field label={i18n.t("artisanAuctions.start")}>
            <input type="datetime-local" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </Field>
          <Field label={i18n.t("artisanAuctions.end")}>
            <input type="datetime-local" required value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          </Field>
          <div className="actions field-wide">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {i18n.t("artisanAuctions.create")}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
