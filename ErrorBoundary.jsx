import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("NoteArch error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, fontFamily: "sans-serif", padding: 20, textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Something went wrong</div>
          <div style={{ fontSize: 14, color: "#8a8398" }}>Your saved notes are safe in the database. Reloading usually fixes this.</div>
          <button onClick={() => window.location.reload()} style={{ background: "#7c5cfc", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 600 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
