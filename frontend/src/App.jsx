import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Dashboard from "./pages/Dashboard/Dashboard";
import ProfileFeature from "./pages/Profile/ProfileFeature";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile/vault" element={<ProfileFeature type="vault" />} />
      <Route path="/profile/analysis" element={<ProfileFeature type="analysis" />} />
      <Route path="/profile/careers" element={<ProfileFeature type="careers" />} />
      <Route path="/profile/portfolio" element={<ProfileFeature type="portfolio" />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
