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
import { Suspense, lazy, useRef, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './auth';
import { AppIntro } from './components/brand/AppIntro';
import { LogoLoader } from './components/brand/LogoLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/Toast';
import { AppLayout, PlatformLayout } from './components/layout';
// LoginPage stays static: it is the first thing most sessions render.
// NotFoundPage stays static: the 404 must never depend on a network fetch.
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';

// Every other route is code-split: a public wall visitor on a phone downloads
// the wall chunk + shared runtime — not the whole admin console (charts,
// studio, editors). Authed pages stream in behind the boot intro, so the
// split is invisible except as a faster first load.
const PublicFormPage = lazy(() => import('./pages/PublicFormPage'));
const WallPage = lazy(() => import('./pages/WallPage'));
const AppsHomePage = lazy(() => import('./pages/AppsHomePage'));
const CompanyOverviewPage = lazy(() => import('./pages/CompanyOverviewPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ThemePage = lazy(() => import('./pages/ThemePage'));
const WidgetTemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const BuilderPage = lazy(() => import('./pages/BuilderPage'));
const DesignsPage = lazy(() => import('./pages/DesignsPage'));
const AiPage = lazy(() => import('./pages/AiPage'));
const MediaPage = lazy(() => import('./pages/MediaPage'));
const DesignStudioPage = lazy(() => import('./pages/DesignStudioPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const TestimonialsPage = lazy(() => import('./pages/TestimonialsPage'));
const ModerationPage = lazy(() => import('./pages/ModerationPage'));
const FormsPage = lazy(() => import('./pages/FormsPage'));
const ConnectPage = lazy(() => import('./pages/ConnectPage'));
const EmbedPage = lazy(() => import('./pages/EmbedPage'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const PlatformOverviewPage = lazy(() => import('./pages/platform/PlatformOverviewPage'));
const TenantsPage = lazy(() => import('./pages/platform/TenantsPage'));
const TenantDetailPage = lazy(() => import('./pages/platform/TenantDetailPage'));
const PlatformAuditPage = lazy(() => import('./pages/platform/PlatformAuditPage'));
const TemplatesPage = lazy(() => import('./pages/platform/TemplatesPage'));
const PlatformStaffPage = lazy(() => import('./pages/platform/PlatformStaffPage'));

export default function App() {
  // Boot intro: plays on every page load (tab open + hard refresh) and never
  // on client-side navigation — the app only remounts on a real load.
  // Public surfaces (embeds, walls, forms) skip it: speed beats ceremony there.
  const { pathname } = useLocation();
  const isPublicSurface = useRef(pathname.startsWith('/wall') || pathname.startsWith('/forms')).current;
  const [revealed, setRevealed] = useState(false);
  const [introDone, setIntroDone] = useState(isPublicSurface);

  return (
    <AuthProvider>
      {!introDone && <AppIntro onReveal={() => setRevealed(true)} onDone={() => setIntroDone(true)} />}
      <div
        className={
          introDone || isPublicSurface ? 'app-root' : `app-root app-boot ${revealed ? 'is-in' : ''}`
        }
        style={introDone ? undefined : { pointerEvents: 'none' }}
      >
        <AppRoutes />
      </div>
      {/* Global success/error feedback for actions whose result is otherwise
          invisible — mounted above every route, page and modal. */}
      <Toaster />
    </AuthProvider>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<RouteLoading />} >
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
          <Route path="templates" element={<WidgetTemplatesPage />} />
          <Route path="designs" element={<DesignsPage />} />
          <Route path="builder" element={<BuilderPage />} />
          <Route path="ai" element={<AiPage />} />
          <Route path="media" element={<MediaPage />} />
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
          <Route path="a/:appId/embed" element={<EmbedPage />} />
          <Route path="a/:appId/studio" element={<DesignStudioPage />} />
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
          <Route path="accounts" element={<PlatformStaffPage />} />
        </Route>

        {/* Role-aware 404 with CTAs back to the right home */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

/** What shows while a route's chunk streams in (first uncached visit; the
 *  boot intro usually covers it on authed loads). The Zojatech mark as a
 *  looping trim-path outline — same drawing language as the boot intro. */
function RouteLoading() {
  return (
    <div className="route-loading">
      <LogoLoader size={104} label="Loading page" />
    </div>
  );
}
