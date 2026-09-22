import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { ScreenLoader } from "./Loading";

export default function ProtectedRoute({ children }) {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  if (loading) return <ScreenLoader label={t("common.loadingApp", "Loading UPNEX...")} />;
  return user ? children : <Navigate to="/login" replace />;
}