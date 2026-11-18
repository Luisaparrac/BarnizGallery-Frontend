import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppEvents } from "../core/AppEvents";
import type { ArtworkDetail } from "../domain/gallery";
import { useErrorText } from "../hooks/useErrorText";
import { services } from "../services/ServiceRegistry";
import { useLocale } from "../state/LocaleContext";
import { useSession } from "../state/SessionContext";
import { useToast } from "../state/ToastContext";
import { Icon } from "./Icon";

interface ArtworkActionsProps {
  detail: ArtworkDetail;
  onChange(detail: ArtworkDetail): void;
  /** Adds the share button (the full artwork page). */
  withShare?: boolean;
}

/** Buy, bid, save and share buttons of a piece. Used by the artwork page and the 3D gallery panel. */
export function ArtworkActions({ detail, onChange, withShare = false }: ArtworkActionsProps) {
  const { i18n } = useLocale();
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  const { artwork } = detail;
  const title = i18n.pick(artwork.titleEs, artwork.titleEn);

  const requireUser = () => {
    if (user) return true;
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
    return false;
  };

  const addToCart = async () => {
    if (!requireUser()) return;
    setBusy(true);
    try {
      await services.commerce.addToCart(artwork.id);
      AppEvents.cartChanged.emit();
      toast.show(i18n.t("artwork.addedToCart"), "success");
    } catch (error) {
      toast.show(errorText(error), "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleFavorite = async () => {
    if (!requireUser()) return;
    try {
      const favorite = await services.gallery.toggleFavorite(artwork.id);
      onChange({ ...detail, isFavorite: favorite, favoriteCount: detail.favoriteCount + (favorite ? 1 : -1) });
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.show(i18n.t("artwork.linkCopied"), "success");
      }
      if (user) void services.profile.recordInteraction({ action: "SHARE", artworkId: artwork.id });
    } catch {
      /* the visitor closed the share sheet */
    }
  };

  const canBuy = artwork.saleMode === "SALE" && artwork.status === "EXHIBITED" && artwork.price !== null && artwork.stock > 0;
  return (
    <div className="artwork-actions">
      {canBuy && (
        <button type="button" className="btn btn-primary btn-large" disabled={busy} onClick={() => void addToCart()}>
          <Icon name="cart" /> {i18n.t("artwork.addToCart")}
        </button>
      )}
      {detail.activeAuctionId && (
        <Link to={`/auctions/${detail.activeAuctionId}`} className="btn btn-primary btn-large">
          <Icon name="gavel" /> {i18n.t("artwork.goToAuction")}
        </Link>
      )}
      <button type="button" className={`btn btn-quiet${detail.isFavorite ? " is-on" : ""}`} aria-pressed={detail.isFavorite} onClick={() => void toggleFavorite()}>
        <Icon name="heart" filled={detail.isFavorite} /> {detail.isFavorite ? i18n.t("artwork.saved") : i18n.t("artwork.save")}
      </button>
      {withShare && (
        <button type="button" className="btn btn-quiet" onClick={() => void share()}>
          <Icon name="share" /> {i18n.t("artwork.share")}
        </button>
      )}
    </div>
  );
}
