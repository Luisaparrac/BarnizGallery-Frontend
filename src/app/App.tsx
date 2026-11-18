import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Loading } from "../components/Feedback";
import { AppShell } from "../components/layout/AppShell";
import { PanelLayout } from "../components/layout/PanelLayout";
import { RequireAuth } from "../components/layout/RequireAuth";
import { AdminAuditPage } from "../pages/admin/AdminAuditPage";
import { AdminBidsPage } from "../pages/admin/AdminBidsPage";
import { AdminCatalogsPage } from "../pages/admin/AdminCatalogsPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminPayoutsPage } from "../pages/admin/AdminPayoutsPage";
import { AdminReportsPage } from "../pages/admin/AdminReportsPage";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage";
import { AdminStoresPage } from "../pages/admin/AdminStoresPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminVerificationsPage } from "../pages/admin/AdminVerificationsPage";
import { ArtisanArtworksPage } from "../pages/artisan/ArtisanArtworksPage";
import { ArtisanAuctionsPage } from "../pages/artisan/ArtisanAuctionsPage";
import { ArtisanCustomOrdersPage } from "../pages/artisan/ArtisanCustomOrdersPage";
import { ArtisanDashboardPage } from "../pages/artisan/ArtisanDashboardPage";
import { ArtisanOrdersPage } from "../pages/artisan/ArtisanOrdersPage";
import { ArtworkEditorPage } from "../pages/artisan/ArtworkEditorPage";
import { StoreEditorPage } from "../pages/artisan/StoreEditorPage";
import { VerificationPage } from "../pages/artisan/VerificationPage";
import { CartPage } from "../pages/customer/CartPage";
import { CheckoutPage } from "../pages/customer/CheckoutPage";
import { CustomRequestFormPage } from "../pages/customer/CustomRequestFormPage";
import { CustomRequestPage } from "../pages/customer/CustomRequestPage";
import { CustomRequestsPage } from "../pages/customer/CustomRequestsPage";
import { FavoritesPage } from "../pages/customer/FavoritesPage";
import { OrderPage } from "../pages/customer/OrderPage";
import { OrdersPage } from "../pages/customer/OrdersPage";
import { PaymentGatewayPage } from "../pages/customer/PaymentGatewayPage";
import { ProfilePage } from "../pages/customer/ProfilePage";
import { ArtworkPage } from "../pages/public/ArtworkPage";
import { AuctionPage } from "../pages/public/AuctionPage";
import { AuctionsPage } from "../pages/public/AuctionsPage";
import { ForgotPasswordPage, LoginPage, RegisterPage } from "../pages/public/AuthPages";
import { HomePage } from "../pages/public/HomePage";
import { NotFoundPage } from "../pages/public/NotFoundPage";
import { StorePage } from "../pages/public/StorePage";
import { StoresPage } from "../pages/public/StoresPage";
import { WelcomePage } from "../pages/public/WelcomePage";
import { MessagesPage } from "../pages/shared/MessagesPage";
import { NotificationsPage } from "../pages/shared/NotificationsPage";
import { CatalogProvider } from "../state/CatalogContext";
import { LocaleProvider, useLocale } from "../state/LocaleContext";
import { SessionProvider } from "../state/SessionContext";
import { ToastProvider } from "../state/ToastContext";

/** The 3D gallery loads Babylon.js only when the visitor opens it. */
const WorldPage = lazy(() => import("../pages/public/world/WorldPage").then((module) => ({ default: module.WorldPage })));

function Routing() {
  const { i18n } = useLocale();
  const buyer = ["CUSTOMER", "ARTISAN"] as const;
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="welcome" element={<WelcomePage />} />
        <Route
          path="gallery"
          element={
            <Suspense fallback={<Loading />}>
              <WorldPage />
            </Suspense>
          }
        />
        <Route path="artworks/:slug" element={<ArtworkPage />} />
        <Route path="stores" element={<StoresPage />} />
        <Route path="stores/:slug" element={<StorePage />} />
        <Route path="auctions" element={<AuctionsPage />} />
        <Route path="auctions/:id" element={<AuctionPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />

        <Route path="cart" element={<RequireAuth roles={[...buyer]}><CartPage /></RequireAuth>} />
        <Route path="checkout" element={<RequireAuth roles={[...buyer]}><CheckoutPage /></RequireAuth>} />
        <Route path="pay/:paymentId" element={<RequireAuth><PaymentGatewayPage /></RequireAuth>} />
        <Route path="account/orders" element={<RequireAuth roles={[...buyer]}><OrdersPage /></RequireAuth>} />
        <Route path="account/orders/:id" element={<RequireAuth><OrderPage /></RequireAuth>} />
        <Route path="account/favorites" element={<RequireAuth roles={[...buyer]}><FavoritesPage /></RequireAuth>} />
        <Route path="account/custom" element={<RequireAuth roles={[...buyer]}><CustomRequestsPage /></RequireAuth>} />
        <Route path="account/custom/new" element={<RequireAuth roles={[...buyer]}><CustomRequestFormPage /></RequireAuth>} />
        <Route path="account/custom/:id" element={<RequireAuth roles={[...buyer]}><CustomRequestPage /></RequireAuth>} />
        <Route path="account/custom/:id/edit" element={<RequireAuth roles={[...buyer]}><CustomRequestFormPage /></RequireAuth>} />
        <Route path="account/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
        <Route path="messages/:id" element={<RequireAuth><MessagesPage /></RequireAuth>} />
        <Route path="notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />

        <Route
          path="artisan"
          element={
            <RequireAuth roles={["ARTISAN"]}>
              <PanelLayout
                title={i18n.t("nav.artisanPanel")}
                links={[
                  { to: "/artisan", label: i18n.t("panel.summary"), icon: "grid", end: true },
                  { to: "/artisan/verification", label: i18n.t("panel.verification"), icon: "shield" },
                  { to: "/artisan/store", label: i18n.t("panel.store"), icon: "store" },
                  { to: "/artisan/artworks", label: i18n.t("panel.artworks"), icon: "box" },
                  { to: "/artisan/auctions", label: i18n.t("panel.auctions"), icon: "gavel" },
                  { to: "/artisan/custom-orders", label: i18n.t("panel.customOrders"), icon: "brush" },
                  { to: "/artisan/orders", label: i18n.t("panel.orders"), icon: "truck" },
                  { to: "/messages", label: i18n.t("nav.messages"), icon: "chat" },
                ]}
              />
            </RequireAuth>
          }
        >
          <Route index element={<ArtisanDashboardPage />} />
          <Route path="verification" element={<VerificationPage />} />
          <Route path="store" element={<StoreEditorPage />} />
          <Route path="artworks" element={<ArtisanArtworksPage />} />
          <Route path="artworks/new" element={<ArtworkEditorPage />} />
          <Route path="artworks/:id" element={<ArtworkEditorPage />} />
          <Route path="auctions" element={<ArtisanAuctionsPage />} />
          <Route path="custom-orders" element={<ArtisanCustomOrdersPage />} />
          <Route path="orders" element={<ArtisanOrdersPage />} />
        </Route>

        <Route
          path="admin"
          element={
            <RequireAuth roles={["ADMIN"]}>
              <PanelLayout
                title={i18n.t("nav.adminPanel")}
                links={[
                  { to: "/admin", label: i18n.t("panel.summary"), icon: "grid", end: true },
                  { to: "/admin/verifications", label: i18n.t("panel.verifications"), icon: "shield" },
                  { to: "/admin/users", label: i18n.t("panel.users"), icon: "user" },
                  { to: "/admin/stores", label: i18n.t("panel.stores"), icon: "store" },
                  { to: "/admin/catalogs", label: i18n.t("panel.catalogs"), icon: "list" },
                  { to: "/admin/settings", label: i18n.t("panel.settings"), icon: "settings" },
                  { to: "/admin/bids", label: i18n.t("panel.bids"), icon: "gavel" },
                  { to: "/admin/reports", label: i18n.t("panel.reports"), icon: "flag" },
                  { to: "/admin/payouts", label: i18n.t("panel.payouts"), icon: "coins" },
                  { to: "/admin/audit", label: i18n.t("panel.audit"), icon: "history" },
                ]}
              />
            </RequireAuth>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="verifications" element={<AdminVerificationsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="stores" element={<AdminStoresPage />} />
          <Route path="catalogs" element={<AdminCatalogsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="bids" element={<AdminBidsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="payouts" element={<AdminPayoutsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

/** Composition root: providers (language, session, catalogs, toasts) and the routes of the three interfaces. */
export function App() {
  return (
    <BrowserRouter>
      <LocaleProvider>
        <SessionProvider>
          <CatalogProvider>
            <ToastProvider>
              <Routing />
            </ToastProvider>
          </CatalogProvider>
        </SessionProvider>
      </LocaleProvider>
    </BrowserRouter>
  );
}
