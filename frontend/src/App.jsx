import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { ScreenLoader } from "./components/Loading";

// Route-level code splitting: each page becomes its own async chunk and is
// fetched (then cached) only when its route is first visited.
const Home = lazy(() => import("./pages/Home/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const ProfileFeature = lazy(() => import("./pages/Profile/ProfileFeature"));
const AuthPage = lazy(() => import("./pages/Auth/AuthPage"));
const LegalPages = lazy(() => import("./pages/Legal/LegalPages"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));
const PublicProfile = lazy(() => import("./pages/Public/PublicProfile"));
const VerifyPage = lazy(() => import("./pages/Public/VerifyPage"));
const AdminApprovals = lazy(() => import("./pages/Admin/AdminApprovals"));
const Clash = lazy(() => import("./pages/Clash/Clash"));

// Static app routes (login, register, terms, privacy, dashboard, profile/*)
// rank above /:username in React Router's matching, so a reserved word typed
// in the address bar can never shadow a real page. The backend enforces the
// same guarantee with its own reserved list before any DB lookup.

const PROFILE_VIEWS = ["vault", "analysis", "study", "careers", "portfolio", "skill-bridge", "engine", "passport", "export", "settings"];

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function ProfileView() {
  // Dynamic routing: /profile/:view becomes the page type. Unknown views
  // fall back to the dashboard rather than rendering a broken page.
  const { view } = useParams();
  if (!PROFILE_VIEWS.includes(view)) return <Navigate to="/dashboard" replace />;
  return <ProfileFeature type={view} />;
}

function Fallback() {
  return <ScreenLoader />;
}

export default function App() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/terms" element={<LegalPages active="terms" />} />
        <Route path="/privacy" element={<LegalPages active="privacy" />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/profile/:view" element={<Protected><ProfileView /></Protected>} />
        <Route path="/verify/:verificationId" element={<VerifyPage />} />
        <Route path="/admin" element={<Protected><AdminApprovals /></Protected>} />
        <Route path="/clash" element={<Clash />} />
        <Route path="/:username" element={<PublicProfile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}