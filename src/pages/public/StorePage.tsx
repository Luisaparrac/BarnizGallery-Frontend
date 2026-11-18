import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ContactMasterModal, type ContactTarget } from "../../components/ContactMasterModal";
import { ErrorNote, Loading, Note } from "../../components/Feedback";
import { ReportButton } from "../../components/ReportButton";
import { StoreRenderer } from "../../components/StoreRenderer";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";

/** Public page of an artisan store, drawn from its template and sections. */
export function StorePage() {
  const { slug = "" } = useParams();
  const { i18n } = useLocale();
  const { user } = useSession();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const data = useAsync(async () => {
    const summary = await services.gallery.getStore(slug);
    const [artworks, auctions] = await Promise.all([services.gallery.listArtworks({ storeId: summary.store.id }), services.auction.list()]);
    return { summary, artworks, auctions: auctions.filter((auction) => auction.storeId === summary.store.id) };
  }, [slug]);
  const storeId = data.data?.summary.store.id;

  useEffect(() => {
    if (storeId && user) void services.profile.recordInteraction({ action: "VISIT_STORE", storeId });
  }, [storeId, user]);

  if (data.loading && !data.data) return <Loading />;
  if (data.error !== null || !data.data) return <div className="container"><ErrorNote error={data.error} /></div>;
  const { summary } = data.data;
  const openContact = () => {
    if (!user) return navigate(`/login?next=/stores/${slug}`);
    setContact({ masterId: summary.master.id, masterName: summary.master.name, subject: i18n.pick(summary.store.nameEs, summary.store.nameEn) });
  };
  return (
    <>
      {summary.store.status !== "PUBLISHED" && (
        <div className="container">
          <Note tone="warn">{i18n.t("store.previewOnly")}</Note>
        </div>
      )}
      <StoreRenderer summary={summary} artworks={data.data.artworks} auctions={data.data.auctions} onContact={user?.role === "ADMIN" ? undefined : openContact} />
      <div className="container store-foot">
        <ReportButton entityType="STORE" entityId={summary.store.id} />
      </div>
      <ContactMasterModal target={contact} onClose={() => setContact(null)} />
    </>
  );
}
