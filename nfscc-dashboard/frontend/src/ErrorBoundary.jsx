import React from "react";

// ErrorBoundary supaya kalau ada runtime error, tidak blank putih.
// Akan menampilkan pesan error + hint untuk user.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error || "Unknown error");

    return (
      <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Terjadi error di aplikasi
        </h1>
        <p style={{ marginBottom: 12 }}>
          Buka <b>DevTools → Console</b> untuk melihat detailnya.
        </p>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#111827",
            color: "#e5e7eb",
            padding: 12,
            borderRadius: 12,
            fontSize: 12,
            overflow: "auto",
          }}
        >
          {msg}
        </pre>
        <p style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>
          Tips cepat: coba <b>hard refresh</b> (Ctrl+Shift+R) atau hapus Local Storage untuk
          domain ini (Application → Local Storage).
        </p>
      </div>
    );
  }
}
