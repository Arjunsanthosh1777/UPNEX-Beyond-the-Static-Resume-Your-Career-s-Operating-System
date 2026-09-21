import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="not-found">
      <div className="nf-code">404</div>
      <h1>{t("notFound.nothing", "Nothing flowing here.")}</h1>
      <p>{t("notFound.thePage", "The page you asked for doesn't exist on this route.")}</p>
      <Link className="nf-home" to="/">{t("common.backToUpnex", "Back to UPNEX")}</Link>
    </div>
  );
}