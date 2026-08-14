import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Building2, Loader2 } from "lucide-react";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setInfo("Account created — check your email to confirm, then sign in.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    }
    setBusy(false);
  };

  if (session === undefined) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f1ff" }}>
        <Loader2 className="spin" size={26} color="#7c5cfc" />
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#8b6bff 0%,#7c5cfc 55%,#6845f0 100%)", padding: 20, fontFamily: "Inter, sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 24, padding: 32, width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(33,28,52,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#8b6bff,#7c5cfc 55%,#6845f0)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={16} color="#fff" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 20, color: "#211c34" }}>NoteArch</span>
          </div>
          <div style={{ fontSize: 13, color: "#8a8398", marginBottom: 22 }}>Site &amp; client discussion log — team login</div>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #ece8f7", fontSize: 14 }} />
            <input type="password" required minLength={6} placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "11px 14px", borderRadius: 12, border: "1px solid #ece8f7", fontSize: 14 }} />

            {error && <div style={{ fontSize: 12.5, color: "#b23b3b", background: "#ffe9e9", padding: "8px 10px", borderRadius: 10 }}>{error}</div>}
            {info && <div style={{ fontSize: 12.5, color: "#2fb673", background: "#e5f7ee", padding: "8px 10px", borderRadius: 10 }}>{info}</div>}

            <button type="submit" disabled={busy}
              style={{ background: "linear-gradient(135deg,#8b6bff,#7c5cfc 55%,#6845f0)", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 14 }}>
              {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12.5, color: "#8a8398" }}>
            {mode === "signin" ? (
              <>New team member?{" "}
                <button onClick={() => { setMode("signup"); setError(""); }} style={{ background: "none", border: "none", color: "#7c5cfc", fontWeight: 700, padding: 0 }}>
                  Create an account
                </button>
              </>
            ) : (
              <>Already have an account?{" "}
                <button onClick={() => { setMode("signin"); setError(""); }} style={{ background: "none", border: "none", color: "#7c5cfc", fontWeight: 700, padding: 0 }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return children;
}
