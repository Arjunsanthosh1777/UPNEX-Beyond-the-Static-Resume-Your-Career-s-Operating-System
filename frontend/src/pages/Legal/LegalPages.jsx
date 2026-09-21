import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function LegalShell({ title, updated, children }) {
  const { t } = useTranslation();
  return (
    <main className="legal-page">
      <div className="legal-wrap">
        <Link className="back" to="/">← {t("common.backToUpnex", "Back to UPNEX")}</Link>
        <h1>{title}</h1>
        <p className="updated">{t("legal.lastUpdated", "Last updated: ")}{updated}</p>
        {children}
      </div>
    </main>
  );
}

export function TermsOfService() {
  const { t } = useTranslation();
  return (
    <LegalShell title={t("legal.termsTitle", "Terms of Service")} updated="September 16, 2026">
      <p>These Terms of Service ("Terms") govern your use of UPNEX ("the Service"). By creating an account or using the Service you agree to these Terms.</p>
      <h2>1. Accounts</h2>
      <p>You are responsible for keeping your credentials confidential and for all activity under your account. You must provide accurate information when creating an account.</p>
      <h2>2. Your content</h2>
      <p>You retain ownership of the marks, projects, documents and profile information you add to UPNEX. You grant UPNEX a limited license to store, process and display that content so we can operate the Service.</p>
      <h2>3. Verification</h2>
      <p>Uploaded documents are labelled "pending review" until they pass our verification process. We do not claim evidence is verified before it actually is. You may not attempt to impersonate an institution or issue false documents.</p>
      <h2>4. Acceptable use</h2>
      <p>You may not use the Service to violate any law, infringe on another person's rights, upload malicious content, or attempt to disrupt the Service or other users' accounts.</p>
      <h2>5. Termination</h2>
      <p>We may suspend or terminate accounts that violate these Terms. You may delete your account and its data at any time by contacting us.</p>
      <h2>6. Availability</h2>
      <p>The Service is provided as-is, without warranty. We work to keep it available but do not guarantee uninterrupted operation.</p>
      <h2>7. Changes</h2>
      <p>We may update these Terms from time to time. Continued use after changes take effect means you accept the updated Terms.</p>
      <h2>Contact</h2>
      <p>Questions about these Terms can be sent to <a href="mailto:support@upnex.ai">support@upnex.ai</a>.</p>
    </LegalShell>
  );
}

export function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <LegalShell title={t("legal.privacyTitle", "Privacy Policy")} updated="September 16, 2026">
      <p>This Privacy Policy explains what data UPNEX collects, why we collect it, and the control you have over it.</p>
      <h2>1. What we collect</h2>
      <p>We collect the information you provide: name, email address, and the academic marks, projects, documents and profile links you choose to add. If you sign in with Google, we receive your name, email and profile picture with your permission.</p>
      <h2>2. How we use it</h2>
      <p>We use your data to operate your profile, calculate analytics and career guidance, and keep the Service secure. We do not sell your personal data.</p>
      <h2>3. Sharing</h2>
      <p>Your profile is private by default. Only content you explicitly choose to share (for example, your public portfolio) is visible to others. We do not disclose your data to third parties except to provide core infrastructure or where required by law.</p>
      <h2>4. Cookies</h2>
      <p>We use a session cookie ("upnex_token") to keep you signed in. It is HTTP-only and scoped to the Service.</p>
      <h2>5. Retention and deletion</h2>
      <p>We keep your data while your account is active. You can ask us to export or permanently delete your data at any time by contacting support.</p>
      <h2>6. Security</h2>
      <p>Passwords are stored as salted hashes. Documents and connectivity are encrypted in transit, and access to your profile is protected by your session.</p>
      <h2>Contact</h2>
      <p>Privacy questions can be sent to <a href="mailto:support@upnex.ai">support@upnex.ai</a>.</p>
    </LegalShell>
  );
}

// Default export so App.jsx can lazy-load the whole legal bundle and pick the
// page from the route: <LegalPages active="terms|privacy" />
export default function LegalPages({ active = "terms" }) {
  return active === "privacy" ? <PrivacyPolicy /> : <TermsOfService />;
}