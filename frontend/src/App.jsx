import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
import ProfileFeature from "./pages/Profile/ProfileFeature";
import AuthPage from "./pages/Auth/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";

function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/profile/vault" element={<Protected><ProfileFeature type="vault" /></Protected>} />
      <Route path="/profile/analysis" element={<Protected><ProfileFeature type="analysis" /></Protected>} />
      <Route path="/profile/careers" element={<Protected><ProfileFeature type="careers" /></Protected>} />
      <Route path="/profile/portfolio" element={<Protected><ProfileFeature type="portfolio" /></Protected>} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
