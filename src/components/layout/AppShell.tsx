import { Outlet } from "react-router-dom";
import { AppConfig } from "../../config/AppConfig";
import { MockDatabase } from "../../services/mock/MockDatabase";
import { useLocale } from "../../state/LocaleContext";
import { Header } from "./Header";

/** Frame of every panel page: header, content and footer (with the demo notice when data is simulated). */
export function AppShell() {
  const { i18n } = useLocale();
  const reset = () => {
    if (!window.confirm(i18n.t("demo.resetConfirm"))) return;
    MockDatabase.reset();
    window.location.href = "/panel.html";
  };
  return (
    <div className="app">
      <a className="skip" href="#main">
        {i18n.t("nav.skip")}
      </a>
      <Header />
      <main id="main" className="app-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container footer-row">
          <p>{i18n.t("footer.about")}</p>
          {AppConfig.anyMock && (
            <p className="demo-note">
              {i18n.t("demo.notice")}{" "}
              <button type="button" className="btn btn-link" onClick={reset}>
                {i18n.t("demo.reset")}
              </button>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
