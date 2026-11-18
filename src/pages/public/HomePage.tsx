import { Link } from "react-router-dom";
import { ArtImage } from "../../components/ArtImage";
import { ArtworkGrid } from "../../components/ArtworkCard";
import { Countdown } from "../../components/Countdown";
import { Loading } from "../../components/Feedback";
import { ResinBand } from "../../components/ResinBand";
import { VisitorSetupStore } from "../../core/VisitorSetupStore";
import { useAsync } from "../../hooks/useAsync";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";

export function HomePage() {
  const { i18n, format } = useLocale();
  const setup = VisitorSetupStore.load();
  const data = useAsync(async () => {
    const [artworks, stores, auctions] = await Promise.all([
      services.gallery.listArtworks({ sort: "recent" }),
      services.gallery.listStores(),
      services.auction.list("ACTIVE"),
    ]);
    return { artworks: artworks.slice(0, 8), stores, auctions: auctions.slice(0, 3) };
  }, []);

  return (
    <>
      <section className="hero">
        <ResinBand height={140} seed={11} className="hero-band" />
        <div className="container hero-text">
          <h1>{i18n.t("home.title")}</h1>
          <p className="lead">{i18n.t("home.lead")}</p>
          <div className="actions">
            <Link to={setup.completed ? "/gallery" : "/welcome"} className="btn btn-primary btn-large">
              {setup.completed ? i18n.t("home.ctaGallery") : i18n.t("home.ctaStart")}
            </Link>
            {setup.completed ? (
              <Link to="/welcome" className="btn btn-quiet btn-large">
                {i18n.t("home.ctaRedo")}
              </Link>
            ) : (
              <Link to="/gallery" className="btn btn-quiet btn-large">
                {i18n.t("home.ctaGallery")}
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="container">
        {data.loading && <Loading />}
        {data.data && (
          <>
            <section className="home-block">
              <div className="block-head">
                <h2>{i18n.t("home.newWorks")}</h2>
                <Link to="/gallery">{i18n.t("home.seeAll")}</Link>
              </div>
              <ArtworkGrid items={data.data.artworks} />
            </section>

            {data.data.auctions.length > 0 && (
              <section className="home-block">
                <div className="block-head">
                  <h2>{i18n.t("home.liveAuctions")}</h2>
                  <Link to="/auctions">{i18n.t("home.seeAll")}</Link>
                </div>
                <div className="auction-strip">
                  {data.data.auctions.map((auction) => (
                    <Link key={auction.id} to={`/auctions/${auction.id}`} className="auction-tile">
                      <ArtImage src={auction.coverUrl} alt={i18n.pick(auction.artworkTitleEs, auction.artworkTitleEn)} />
                      <div>
                        <strong>{i18n.pick(auction.artworkTitleEs, auction.artworkTitleEn)}</strong>
                        <span>{format.money(auction.highestBid ?? auction.basePrice, auction.currency)}</span>
                        <span className="muted">
                          {i18n.t("auction.endsIn")} <Countdown until={auction.endDate} />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="home-block">
              <div className="block-head">
                <h2>{i18n.t("home.masters")}</h2>
                <Link to="/stores">{i18n.t("home.seeAll")}</Link>
              </div>
              <ul className="master-list">
                {data.data.stores.map(({ store, master, artworkCount }) => (
                  <li key={store.id}>
                    <Link to={`/stores/${store.slug}`}>
                      <strong>{master.name}</strong>
                      <span>{i18n.pick(store.nameEs, store.nameEn)}</span>
                      <span className="muted">{i18n.t("stores.works", { count: artworkCount })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section className="home-block home-about">
              <h2>{i18n.t("home.aboutTitle")}</h2>
              <p>{i18n.t("home.aboutText")}</p>
            </section>
          </>
        )}
      </div>
    </>
  );
}
