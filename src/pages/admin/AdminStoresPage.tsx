import { Link } from "react-router-dom";
import { ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import type { StoreStatus } from "../../domain/gallery";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useCatalogs } from "../../state/CatalogContext";
import { useLocale } from "../../state/LocaleContext";
import { useToast } from "../../state/ToastContext";

export function AdminStoresPage() {
  const { i18n } = useLocale();
  const { template } = useCatalogs();
  const toast = useToast();
  const errorText = useErrorText();
  const stores = useAsync(() => services.admin.listStores(), []);

  const set = async (storeId: number, status: StoreStatus) => {
    try {
      await services.admin.setStoreStatus(storeId, status);
      await stores.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <>
      <PageHeader title={i18n.t("adminStores.title")} />
      {stores.loading && !stores.data && <Loading />}
      {stores.error !== null && <ErrorNote error={stores.error} />}
      {stores.data && (
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("adminStores.store")}</th>
              <th>{i18n.t("adminStores.master")}</th>
              <th>{i18n.t("adminStores.template")}</th>
              <th>{i18n.t("adminStores.works")}</th>
              <th>{i18n.t("orders.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {stores.data.map(({ store, master, artworkCount }) => (
              <tr key={store.id}>
                <td>
                  <Link to={`/stores/${store.slug}`}>{store.nameEs}</Link>
                </td>
                <td>
                  {master.name} <StatusBadge kind="verification" value={master.verificationStatus} />
                </td>
                <td>{i18n.name(template(store.templateId))}</td>
                <td>{artworkCount}</td>
                <td>
                  <StatusBadge kind="store" value={store.status} />
                </td>
                <td className="row-actions">
                  {store.status !== "SUSPENDED" ? (
                    <button type="button" className="btn btn-link" onClick={() => window.confirm(i18n.t("adminStores.suspendConfirm")) && void set(store.id, "SUSPENDED")}>
                      {i18n.t("adminStores.suspend")}
                    </button>
                  ) : (
                    <button type="button" className="btn btn-link" onClick={() => void set(store.id, "PUBLISHED")}>
                      {i18n.t("adminStores.restore")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
