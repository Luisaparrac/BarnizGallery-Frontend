import { useState } from "react";
import { AvatarImage } from "../../components/AvatarImage";
import { ErrorNote, Loading } from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import type { UserRole, UserStatus } from "../../domain/user";
import { useAsync } from "../../hooks/useAsync";
import { useErrorText } from "../../hooks/useErrorText";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { useToast } from "../../state/ToastContext";

const ROLES: UserRole[] = ["CUSTOMER", "ARTISAN", "ADMIN"];
const STATUSES: UserStatus[] = ["ACTIVE", "PENDING", "SUSPENDED", "DELETED"];

export function AdminUsersPage() {
  const { i18n, format } = useLocale();
  const { user: me } = useSession();
  const toast = useToast();
  const errorText = useErrorText();
  const [filter, setFilter] = useState({ search: "", role: "", status: "" });
  const users = useAsync(() => services.admin.listUsers(filter), [filter]);

  const change = async (id: number, patch: { role?: UserRole; status?: UserStatus }) => {
    try {
      await services.admin.updateUser(id, patch);
      await users.reload();
    } catch (error) {
      toast.show(errorText(error), "error");
    }
  };

  return (
    <>
      <PageHeader title={i18n.t("adminUsers.title")} />
      <div className="filter-bar">
        <input type="search" placeholder={i18n.t("adminUsers.search")} aria-label={i18n.t("adminUsers.search")} value={filter.search} onChange={(event) => setFilter({ ...filter, search: event.target.value })} />
        <select aria-label={i18n.t("adminUsers.role")} value={filter.role} onChange={(event) => setFilter({ ...filter, role: event.target.value })}>
          <option value="">{i18n.t("adminUsers.allRoles")}</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {i18n.tx(`role.${role}`)}
            </option>
          ))}
        </select>
        <select aria-label={i18n.t("orders.status")} value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}>
          <option value="">{i18n.t("adminUsers.allStatuses")}</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {i18n.tx(`status.user.${status}`)}
            </option>
          ))}
        </select>
      </div>
      {users.loading && !users.data && <Loading />}
      {users.error !== null && <ErrorNote error={users.error} />}
      {users.data && (
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.t("adminUsers.user")}</th>
              <th>{i18n.t("adminUsers.role")}</th>
              <th>{i18n.t("orders.status")}</th>
              <th>{i18n.t("adminUsers.since")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.data.map((user) => (
              <tr key={user.id}>
                <td>
                  <span className="cell-with-image">
                    <AvatarImage avatarId={user.avatarId} name={user.fullName} size={28} />
                    <span>
                      {user.fullName}
                      <br />
                      <small className="muted">{user.email}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <select aria-label={i18n.t("adminUsers.role")} value={user.role} disabled={user.id === me?.id} onChange={(event) => void change(user.id, { role: event.target.value as UserRole })}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {i18n.tx(`role.${role}`)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <StatusBadge kind="user" value={user.status} />
                </td>
                <td>{format.date(user.createdAt)}</td>
                <td>
                  {user.id !== me?.id &&
                    (user.status === "SUSPENDED" ? (
                      <button type="button" className="btn btn-link" onClick={() => void change(user.id, { status: "ACTIVE" })}>
                        {i18n.t("adminUsers.reactivate")}
                      </button>
                    ) : (
                      <button type="button" className="btn btn-link" onClick={() => window.confirm(i18n.t("adminUsers.suspendConfirm", { name: user.fullName })) && void change(user.id, { status: "SUSPENDED" })}>
                        {i18n.t("adminUsers.suspend")}
                      </button>
                    ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
