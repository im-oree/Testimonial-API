/**
 * Routes.
 *
 *   /                          -> redirects to /login (no landing page)
 *   /login                     -> sign-in (company + platform demo accounts)
 *   /forms/:slug               -> public form (no login needed)
 *   /wall/:appSlug             -> public testimonial wall (no login needed)
 *   /app                       -> tenant workspace (guarded)
 *        overview                  tenant analytics dashboard
 *        products                  product catalogue
 *        settings / team / audit   management hub + pages
 *        a/:appId/{overview,connect,testimonials,moderation,forms}
 *   /platform/...              -> platform console (guarded)
 *   anything else              -> role-aware 404 page
 */
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppLayout, PlatformLayout } from './components/layout';
import LoginPage from './pages/LoginPage';
import AppsHomePage from './pages/AppsHomePage';
import CompanyOverviewPage from './pages/CompanyOverviewPage';
import SettingsPage from './pages/SettingsPage';
import ThemePage from './pages/ThemePage';
import ThemeMarketplacePage from './pages/ThemeMarketplacePage';
import AccountPage from './pages/AccountPage';
import OverviewPage from './pages/OverviewPage';
import TestimonialsPage from './pages/TestimonialsPage';
import ModerationPage from './pages/ModerationPage';
import FormsPage from './pages/FormsPage';
import ConnectPage from './pages/ConnectPage';
import TeamPage from './pages/TeamPage';
import AuditPage from './pages/AuditPage';
import PublicFormPage from './pages/PublicFormPage';
import WallPage from './pages/WallPage';
import NotFoundPage from './pages/NotFoundPage';
import PlatformOverviewPage from './pages/platform/PlatformOverviewPage';
import TenantsPage from './pages/platform/TenantsPage';
import TenantDetailPage from './pages/platform/TenantDetailPage';
import PlatformAuditPage from './pages/platform/PlatformAuditPage';
import TemplatesPage from './pages/platform/TemplatesPage';

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Public surfaces — visitors do not need an account */}
        <Route path="/forms/:slug" element={<PublicFormPage />} />
        <Route path="/wall/:appSlug" element={<WallPage />} />

        {/* Company (tenant) workspace */}
        <Route
          path="/app"
          element={
            <RequireAuth kind="company">
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/app/overview" replace />} />
          <Route path="overview" element={<CompanyOverviewPage />} />
          <Route path="products" element={<AppsHomePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/theme" element={<ThemePage />} />
          <Route path="settings/theme/marketplace" element={<ThemeMarketplacePage />} />
          <Route path="settings/account" element={<AccountPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="audit" element={<AuditPage />} />
          {/* Legacy single-app links land on the tenant overview */}
          <Route path="testimonials" element={<Navigate to="/app/overview" replace />} />
          <Route path="testimonials/moderation" element={<Navigate to="/app/overview" replace />} />
          <Route path="forms" element={<Navigate to="/app/overview" replace />} />
          {/* One product = one website. Everything below is scoped to :appId. */}
          <Route path="a/:appId/overview" element={<OverviewPage />} />
          <Route path="a/:appId/connect" element={<ConnectPage />} />
          <Route path="a/:appId/testimonials" element={<TestimonialsPage />} />
          <Route path="a/:appId/testimonials/moderation" element={<ModerationPage />} />
          <Route path="a/:appId/forms" element={<FormsPage />} />
        </Route>

        {/* Platform console (Zojatech super-company) */}
        <Route
          path="/platform"
          element={
            <RequireAuth kind="platform">
              <PlatformLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/platform/overview" replace />} />
          <Route path="overview" element={<PlatformOverviewPage />} />
          <Route path="tenants" element={<TenantsPage />} />
          <Route path="tenants/:tenantId" element={<TenantDetailPage />} />
          <Route path="audit" element={<PlatformAuditPage />} />
          <Route path="templates" element={<TemplatesPage />} />
        </Route>

        {/* Role-aware 404 with CTAs back to the right home */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
