import { Link, useNavigate } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { EmptyState, ErrorNote, Loading, Note } from "../../components/Feedback";
import { Icon } from "../../components/Icon";
import { PageHeader } from "../../components/PageHeader";
import { AppEvents } from "../../core/AppEvents";
import type { Cart } from "../../domain/commerce";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

export function CartPage() {
  const { i18n, format } = useLocale();
  const navigate = useNavigate();
  const toast = useToast();
  const errorText = useErrorText();
  const cart = useAsync(() => services.commerce.getCart(), []);

  const change = async (action: () => Promise<Cart>) => {
    try {
      cart.setData(await action());
      AppEvents.cartChanged.emit();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  if (cart.loading && !cart.data) return <Loading />;
  if (cart.error !== null) return <div className="container"><ErrorNote error={cart.error} /></div>;
  const data = cart.data!;
  const unavailable = data.items.filter((item) => item.stock < item.quantity);
  return (
    <div className="container narrow">
      <PageHeader title={i18n.t("cart.title")} />
      {!data.items.length ? (
        <EmptyState title={i18n.t("cart.empty")} text={i18n.t("cart.emptyText")} action={<Link className="btn btn-primary" to="/gallery">{i18n.t("nav.gallery")}</Link>} />
      ) : (
        <>
          <ul className="line-list">
            {data.items.map((item) => (
              <li key={item.artworkId} className={item.stock < item.quantity ? "is-unavailable" : ""}>
                <ArtImage src={item.coverUrl} alt="" />
                <div>
                  <strong>{i18n.pick(item.title, item.titleEn)}</strong>
                  {item.stock < item.quantity && <span className="field-error">{i18n.t("cart.unavailable")}</span>}
                  {item.stock > 1 && (
                    <label className="qty">
                      {i18n.t("cart.quantity")}
                      <input type="number" min={1} max={item.stock} value={item.quantity} onChange={(event) => void change(() => services.commerce.updateQuantity(item.artworkId, Number(event.target.value)))} />
                    </label>
                  )}
                </div>
                <span>{format.money(item.unitPrice * item.quantity, item.currency)}</span>
                <button type="button" className="icon-btn" aria-label={i18n.t("cart.remove")} onClick={() => void change(() => services.commerce.removeFromCart(item.artworkId))}>
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
          <div className="totals">
            <p>
              <span>{i18n.t("order.subtotal")}</span> <strong>{format.money(data.subtotal, data.currency)}</strong>
            </p>
            <p className="muted">{i18n.t("cart.shippingNote")}</p>
          </div>
          {unavailable.length > 0 && <Note tone="warn">{i18n.t("cart.removeUnavailable")}</Note>}
          <div className="actions">
            <Link to="/gallery" className="btn btn-quiet">
              {i18n.t("cart.keepBrowsing")}
            </Link>
            <button type="button" className="btn btn-primary btn-large" disabled={unavailable.length > 0} onClick={() => navigate("/checkout")}>
              {i18n.t("cart.checkout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
