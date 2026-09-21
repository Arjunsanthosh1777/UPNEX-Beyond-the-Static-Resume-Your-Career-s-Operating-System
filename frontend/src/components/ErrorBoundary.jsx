import { Component } from "react";
import i18n from "../i18n";

// Last-resort boundary: a render error in a lazy chunk must never blank the
// whole app. This catches it, shows the real message, and offers a reload.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UPNEX render error:", error, info.componentStack || "");
  }

  render() {
    if (this.state.error) {
      return (
        <main className="screen-loader error-screen" role="alert">
          <strong>{i18n.t("common.appError", "UPNEX hit an error")}</strong>
          <p>{String(this.state.error?.message || this.state.error).slice(0, 180)}</p>
          <button className="app-primary" onClick={() => window.location.reload()}>
            {i18n.t("common.reload", "Reload")}
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}