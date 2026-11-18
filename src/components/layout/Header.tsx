import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { AppEvents } from "../../core/AppEvents";
import { services } from "../../services/ServiceRegistry";
import { useLocale } from "../../state/LocaleContext";
import { useSession } from "../../state/SessionContext";
import { AvatarImage } from "../AvatarImage";
import { Icon } from "../Icon";
import { ResinBand } from "../ResinBand";

/** Top bar of the panel: the area of the role, language, messages, notifications and the account menu. */
export function Header() {
  const { i18n, language, setLanguage } = useLocale();
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const accountRef = useRef<HTMLDivElement>(null);
  const staff = user?.role === "ARTISAN" || user?.role === "ADMIN";

  useEffect(() => setAccountOpen(false), [location.pathname]);

  useEffect(() => {
    if (!staff) return setUnread(0);
    const refresh = () => void services.notification.unreadCount().then(setUnread).catch(() => undefined);
    refresh();
    const timer = window.setInterval(refresh, 15000);
    const off = AppEvents.notificationsChanged.subscribe(refresh);
    return () => {
      window.clearInterval(timer);
      off();
    };
  }, [staff]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const signOut = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="site-header">
      <ResinBand height={6} seed={3} />
      <div className="header-row container">
        <Link to="/" className="logo" aria-label="MUSEO">
          <span className="logo-word">MUSEO</span>
          <span className="logo-sub">{i18n.t("brand.sub")}</span>
        </Link>
        <nav className="main-nav" aria-label={i18n.t("nav.main")}>
          {user?.role === "ARTISAN" && <NavLink to="/artisan">{i18n.t("nav.artisanPanel")}</NavLink>}
          {user?.role === "ADMIN" && <NavLink to="/admin">{i18n.t("nav.adminPanel")}</NavLink>}
          <a href="/">{i18n.t("nav.museum")}</a>
        </nav>
        <div className="header-tools">
          <div className="lang-switch" role="group" aria-label={i18n.t("nav.language")}>
            {(["es", "en"] as const).map((code) => (
              <button key={code} type="button" className={language === code ? "is-on" : ""} aria-pressed={language === code} onClick={() => setLanguage(code)}>
                {code.toUpperCase()}
              </button>
            ))}
          </div>
          {staff && (
            <>
              <Link to="/messages" className="icon-btn" aria-label={i18n.t("nav.messages")}>
                <Icon name="chat" />
              </Link>
              <Link to="/notifications" className="icon-btn" aria-label={i18n.t("nav.notificationsCount", { count: unread })}>
                <Icon name="bell" />
                {unread > 0 && <span className="counter">{unread > 9 ? "9+" : unread}</span>}
              </Link>
            </>
          )}
          {user ? (
            <div className="account" ref={accountRef}>
              <button type="button" className="account-btn" aria-expanded={accountOpen} onClick={() => setAccountOpen((open) => !open)}>
                <AvatarImage avatarId={user.avatarId} name={user.fullName} size={32} />
                <span className="account-name">{user.fullName.split(" ")[0]}</span>
              </button>
              {accountOpen && (
                <div className="account-menu" role="menu">
                  <p className="account-role">{i18n.tx(`role.${user.role}`)}</p>
                  <Link to="/profile" role="menuitem">
                    {i18n.t("nav.profile")}
                  </Link>
                  <a href="/" role="menuitem">
                    {i18n.t("nav.museum")}
                  </a>
                  <button type="button" role="menuitem" onClick={() => void signOut()}>
                    <Icon name="logout" size={16} /> {i18n.t("nav.logout")}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-small btn-primary">
              {i18n.t("nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
