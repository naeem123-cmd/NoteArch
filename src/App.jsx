import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Mic,
  Square,
  Plus,
  FolderPlus,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Loader2,
  CheckCircle2,
  Circle,
  ListChecks,
  Sparkles,
  Type,
  X,
  Building2,
  Menu,
  LayoutList,
  ClipboardList,
  Tag as TagIcon,
  FileText,
  Users,
  Copy,
  Download,
  Camera,
  Languages,
  Pencil,
  Share2,
  LogOut,
  Upload,
  Sun,
  Moon,
  SlidersHorizontal,
  FileDown,
  CalendarDays,
  CircleUserRound,
  ShieldCheck,
} from "lucide-react";
import { supabase, supabaseConfigured } from "./supabaseClient";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const isThisWeek = (iso) => {
  const diff = (new Date() - new Date(iso)) / (1000 * 60 * 60 * 24);
  return diff <= 7;
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const PALETTE = [
  { bg: "var(--purple-soft)", fg: "var(--purple)" },
  { bg: "var(--coral-soft)", fg: "var(--coral)" },
  { bg: "var(--teal-soft)", fg: "var(--teal)" },
  { bg: "var(--yellow-soft)", fg: "#b9791f" },
  { bg: "var(--green-soft)", fg: "var(--green)" },
];

const colorFor = (str) => {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++)
    h = (h * 31 + str.charCodeAt(i)) % PALETTE.length;
  return PALETTE[h];
};

function noteAsText(note, projectName) {
  const lines = [
    `${projectName} — ${new Date(note.created_at).toLocaleString("en-IN")}`,
    note.attendees ? `Attendees: ${note.attendees}` : "",
    "",
    "Summary:",
    note.summary || "",
    "",
  ];

  if ((note.decisions || []).length) {
    lines.push("Decisions:");
    note.decisions.forEach((d) => lines.push(`- ${d}`));
    lines.push("");
  }

  if ((note.requirements || []).length) {
    lines.push("Requirements:");
    note.requirements.forEach((r) => lines.push(`- ${r}`));
    lines.push("");
  }

  if ((note.action_items || []).length) {
    lines.push("Action items:");
    note.action_items.forEach((a) =>
      lines.push(`- ${a.task}${a.owner ? ` (${a.owner})` : ""}`)
    );
    lines.push("");
  }

  if ((note.tags || []).length) {
    lines.push("Tags:");
    (note.tags || []).forEach((t) =>
      lines.push(`#${String(t).replace(/^#/, "")}`)
    );
    lines.push("");
  }

  lines.push("Full transcript:", note.transcript || "");

  return lines.filter((l) => l !== "").join("\n");
}

function copyNoteAsText(note, projectName) {
  navigator.clipboard?.writeText(noteAsText(note, projectName));
}

function downloadNoteAsText(note, projectName) {
  const blob = new Blob([noteAsText(note, projectName)], {
    type: "text/plain",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `${projectName.replace(/\s+/g, "-")}-MOM-${new Date(
    note.created_at
  )
    .toISOString()
    .slice(0, 10)}.txt`;

  a.click();
  URL.revokeObjectURL(url);
}

function downloadNoteAsPdf(note, projectName) {
  const safe = (v) => String(v || "").replace(/[&<>\"]/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
  }[m]));
  const bullets = (arr) => (arr || []).map((x) => `<li>${safe(typeof x === "string" ? x : x.task || "")}${typeof x === "object" && x.owner ? ` <span class="meta">(${safe(x.owner)})</span>` : ""}${typeof x === "object" && x.deadline ? ` <span class="meta">· ${safe(x.deadline)}</span>` : ""}</li>`).join("");
  const html = `<!doctype html><html><head><title>${safe(projectName)} MOM</title><style>body{font-family:Arial,sans-serif;padding:42px;color:#222;line-height:1.55}h1{margin:0 0 6px;font-size:26px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;margin:26px 0 8px;color:#6b4ee8}ul{padding-left:20px}.meta{color:#777}.small{color:#777;font-size:12px}.box{background:#f7f5ff;padding:16px;border-radius:10px;white-space:pre-wrap}@media print{body{padding:20px}}</style></head><body><h1>${safe(projectName)} — Minutes of Meeting</h1><div class="small">${safe(new Date(note.created_at).toLocaleString("en-IN"))}${note.attendees ? ` · Attendees: ${safe(note.attendees)}` : ""}</div><h2>Summary</h2><div>${safe(note.summary)}</div>${(note.decisions||[]).length?`<h2>Decisions</h2><ul>${bullets(note.decisions)}</ul>`:""}${(note.requirements||[]).length?`<h2>Requirements</h2><ul>${bullets(note.requirements)}</ul>`:""}${(note.action_items||[]).length?`<h2>Action Items</h2><ul>${bullets(note.action_items)}</ul>`:""}${(note.tags||[]).length?`<h2>Tags</h2><div>${(note.tags||[]).map(t=>`#${safe(String(t).replace(/^#/,'') )}`).join(" &nbsp; ")}</div>`:""}<h2>Full Transcript</h2><div class="box">${safe(note.transcript)}</div><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),500)}</script></body></html>`;
  const w = window.open("", "_blank", "width=900,height=900");
  if (!w) { window.alert("Please allow pop-ups to generate the PDF."); return; }
  w.document.write(html); w.document.close();
}

async function shareNote(note, projectName) {
  const title = `${projectName} — MOM`;
  const text = noteAsText(note, projectName);

  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    window.alert(
      "MOM copied to clipboard. You can paste it into WhatsApp, email, or any chat."
    );
  } catch {
    window.prompt("Copy this MOM:", text);
  }
}

/* UPDATED: shows actual API error instead of only "Summarization failed" */
async function callSummarizeAPI(transcript) {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transcript }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.detail ||
        data.error ||
        `Summarization failed (${res.status})`
    );
  }

  return data;
}

export default function App() {
  const [projects, setProjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeProject, setActiveProject] = useState("All");
  const [openNoteId, setOpenNoteId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showRecorder, setShowRecorder] = useState(false);
  const [newProjectInput, setNewProjectInput] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tab, setTab] = useState("notes");
  const [userEmail, setUserEmail] = useState("");
  const [isRestricted, setIsRestricted] = useState(false);
  const [assignedProjectId, setAssignedProjectId] = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("noteArchTheme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("noteArchTheme", darkMode ? "dark" : "light");
    } catch {}
  }, [darkMode]);

  const [sortOrder, setSortOrder] = useState("newest");
  const [dateFilter, setDateFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showAccessManager, setShowAccessManager] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUserEmail(data?.user?.email || "");

      if (data?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("project_id")
          .eq("id", data.user.id)
          .single();

        setAssignedProjectId(profile?.project_id || null);
        setIsRestricted(Boolean(profile?.project_id));
      }

      setProfileReady(true);
    });
  }, []);

  const loadAll = async () => {
    if (!profileReady) return;

    setLoading(true);
    setLoadError("");

    let projectQuery = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true });

    let notesQuery = supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (isRestricted && assignedProjectId) {
      projectQuery = projectQuery.eq("id", assignedProjectId);
      notesQuery = notesQuery.eq("project_id", assignedProjectId);
    }

    const [
      { data: proj, error: e1 },
      { data: nts, error: e2 },
    ] = await Promise.all([projectQuery, notesQuery]);

    if (e1 || e2) {
      setLoadError((e1 || e2).message);
    } else {
      setProjects(proj || []);
      setNotes(nts || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [profileReady, isRestricted, assignedProjectId]);

  const loadProfiles = async () => {
    setProfilesLoading(true);
    const { data, error } = await supabase.from("profiles").select("*");
    setProfilesLoading(false);
    if (error) { window.alert(`Couldn't load clients: ${error.message}`); return; }
    setProfiles(data || []);
  };

  const openAccessManager = async () => {
    setShowAccessManager(true);
    await loadProfiles();
  };

  const assignClientProject = async (profileId, projectId) => {
    setAccessSaving(true);
    const { error } = await supabase.from("profiles").update({ project_id: projectId || null }).eq("id", profileId);
    setAccessSaving(false);
    if (error) { window.alert(`Couldn't update access: ${error.message}`); return; }
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, project_id: projectId || null } : p));
  };

  const addProject = async () => {
    const name = newProjectInput.trim();

    if (!name) return;

    const { data, error } = await supabase
      .from("projects")
      .insert({ name })
      .select();

    if (!error && data) {
      setProjects((p) => [...p, data[0]]);
      setNewProjectInput("");
      setShowAddProject(false);
    }
  };

  const deleteNote = async (id) => {
    if (!window.confirm("Delete this note? This can't be undone.")) return;

    await supabase.from("notes").delete().eq("id", id);

    setNotes((n) => n.filter((x) => x.id !== id));

    if (openNoteId === id) setOpenNoteId(null);
  };

  const deleteProject = async (id, name) => {
    if (
      !window.confirm(
        `Delete "${name}"?\n\nThis will permanently delete the project and all MOMs inside it.`
      )
    ) {
      return;
    }

    const { error: notesError } = await supabase
      .from("notes")
      .delete()
      .eq("project_id", id);

    if (notesError) {
      window.alert(`Couldn't delete the project's MOMs: ${notesError.message}`);
      return;
    }

    const { error: projectError } = await supabase
      .from("projects")
      .delete()
      .eq("id", id);

    if (projectError) {
      window.alert(`Couldn't delete the project: ${projectError.message}`);
      return;
    }

    setProjects((prev) => prev.filter((p) => p.id !== id));
    setNotes((prev) => prev.filter((n) => n.project_id !== id));

    if (activeProject === name) {
      setActiveProject("All");
    }
  };

  const toggleActionItem = async (note, idx) => {
    const items = [...(note.action_items || [])];

    items[idx] = {
      ...items[idx],
      done: !items[idx].done,
    };

    const { error } = await supabase
      .from("notes")
      .update({ action_items: items })
      .eq("id", note.id);

    if (!error) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id ? { ...n, action_items: items } : n
        )
      );
    }
  };

  const onNoteSaved = (note) => setNotes((prev) => [note, ...prev]);

  const saveEditedNote = async (id, patch) => {
    const { error } = await supabase
      .from("notes")
      .update(patch)
      .eq("id", id);

    if (!error) {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, ...patch } : n))
      );
    }
  };

  const stats = useMemo(() => {
    const decisionsThisWeek = notes
      .filter((n) => isThisWeek(n.created_at))
      .reduce(
        (s, n) => s + (n.decisions || []).length,
        0
      );

    const pendingTasks = notes.reduce(
      (s, n) =>
        s +
        (n.action_items || []).filter((a) => !a.done).length,
      0
    );

    return {
      totalNotes: notes.length,
      decisionsThisWeek,
      pendingTasks,
      activeProjects: projects.length,
    };
  }, [notes, projects]);

  const filteredNotes = useMemo(() => {
    const now = new Date();
    const q = search.trim().toLowerCase();
    const result = notes.filter((n) => {
      const projName = projects.find((p) => p.id === n.project_id)?.name || "";
      const matchesProject = activeProject === "All" || projName === activeProject;
      const haystack = [
        n.summary, n.transcript, ...(n.decisions || []), ...(n.requirements || []),
        ...(n.tags || []), ...(n.action_items || []).map(a => `${a.task} ${a.owner || ""} ${a.deadline || ""}`), projName
      ].join(" ").toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const ageDays = (now - new Date(n.created_at)) / 86400000;
      const matchesDate = dateFilter === "all" || (dateFilter === "7" && ageDays <= 7) || (dateFilter === "30" && ageDays <= 30);
      const openCount = (n.action_items || []).filter(a => !a.done).length;
      const doneCount = (n.action_items || []).filter(a => a.done).length;
      const matchesTask = taskFilter === "all" || (taskFilter === "open" && openCount > 0) || (taskFilter === "done" && doneCount > 0);
      return matchesProject && matchesSearch && matchesDate && matchesTask;
    });
    return result.sort((a,b) => sortOrder === "oldest" ? new Date(a.created_at)-new Date(b.created_at) : new Date(b.created_at)-new Date(a.created_at));
  }, [notes, projects, activeProject, search, dateFilter, taskFilter, sortOrder]);

  const allTasks = useMemo(() => {
    const out = [];

    notes.forEach((n) => {
      const projName =
        projects.find((p) => p.id === n.project_id)?.name ||
        "—";

      (n.action_items || []).forEach((a, idx) =>
        out.push({
          ...a,
          idx,
          note: n,
          projName,
        })
      );
    });

    return out.sort((a, b) =>
      a.done === b.done ? 0 : a.done ? 1 : -1
    );
  }, [notes, projects]);

  return (
    <div className={`app-shell ${darkMode ? "theme-dark" : ""}`}>
      <style>{`
        .app-shell.theme-dark {
          --ink: #f4f1ff;
          --muted: #aaa4bd;
          --muted-soft: #77718d;
          --line: #302c3e;
          --surface: #17151e;
          --surface-2: #201d29;
          --page: #100f15;
          --purple-soft: #29213f;
          --coral-soft: #3b2527;
          --teal-soft: #1c3534;
          --yellow-soft: #3a3020;
          --green-soft: #1e3428;
        }
        .app-shell.theme-dark,
        .app-shell.theme-dark .main-col {
          background: var(--page) !important;
          color: var(--ink) !important;
        }
        .app-shell.theme-dark .sidebar,
        .app-shell.theme-dark .topbar,
        .app-shell.theme-dark .card,
        .app-shell.theme-dark .note-card,
        .app-shell.theme-dark .modal-card,
        .app-shell.theme-dark .search-box {
          background: var(--surface) !important;
          color: var(--ink) !important;
          border-color: var(--line) !important;
        }
        .app-shell.theme-dark .sidebar {
          border-color: var(--line) !important;
        }
        .app-shell.theme-dark input,
        .app-shell.theme-dark textarea,
        .app-shell.theme-dark select {
          color: var(--ink) !important;
          background: var(--surface-2) !important;
          border-color: var(--line) !important;
        }
        .app-shell.theme-dark input::placeholder,
        .app-shell.theme-dark textarea::placeholder {
          color: var(--muted-soft) !important;
        }
        .app-shell.theme-dark button:not(.theme-toggle) {
          border-color: var(--line);
        }
        .app-shell.theme-dark .hero-card {
          border-color: transparent !important;
        }
        .app-shell.theme-dark hr {
          border-color: var(--line) !important;
        }
      `}</style>
      <div
        className={`sidebar-backdrop ${
          sidebarOpen ? "open" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        <div style={{ padding: "22px 20px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                background: "var(--purple-grad)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2
                size={15}
                color="#fff"
                strokeWidth={2.4}
              />
            </div>

            <span
              className="display"
              style={{
                fontWeight: 800,
                fontSize: 19,
                letterSpacing: "-0.02em",
              }}
            >
              NoteArch
            </span>

            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(false)}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                color: "var(--muted)",
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "var(--muted)",
              marginTop: 4,
            }}
          >
            Site & client discussion log
          </div>
        </div>

        <div style={{ padding: "2px 16px 10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 10px",
              borderRadius: 12,
              background: "var(--purple-soft)",
              color: "var(--purple)",
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            <ClipboardList size={14} />
            Meetings / MOMs
          </div>
        </div>

        <div
          style={{
            padding: "4px 14px",
            flex: 1,
            overflowY: "auto",
          }}
        >
          <SidebarItem
            label="Dashboard"
            count={stats.totalNotes}
            active={tab === "dashboard"}
            onClick={() => {
              setTab("dashboard");
              setActiveProject("All");
              setSidebarOpen(false);
            }}
            dotColor="var(--purple)"
          />

          <SidebarItem
            label="All MOMs"
            count={notes.length}
            active={activeProject === "All"}
            onClick={() => {
              setActiveProject("All");
              setTab("notes");
              setSidebarOpen(false);
            }}
          />

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--muted-soft)",
              padding: "16px 10px 6px",
              letterSpacing: "0.04em",
            }}
          >
            PROJECTS
          </div>

          {projects.map((p) => {
            const c = colorFor(p.name);

            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                }}
              >
                <button
                  onClick={() => {
                    setActiveProject(p.name);
                    setTab("notes");
                    setSidebarOpen(false);
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "9px 10px",
                    borderRadius: 10,
                    border: "none",
                    background:
                      activeProject === p.name
                        ? "var(--purple-soft)"
                        : "transparent",
                    color:
                      activeProject === p.name
                        ? "var(--purple)"
                        : "var(--ink)",
                    fontSize: 13.5,
                    fontWeight: activeProject === p.name ? 700 : 500,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: c.fg,
                        flexShrink: 0,
                      }}
                    />
                    {p.name}
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--muted-soft)",
                    }}
                  >
                    {notes.filter((n) => n.project_id === p.id).length}
                  </span>
                </button>

                {!isRestricted && (
                  <button
                    onClick={() => deleteProject(p.id, p.name)}
                    title={`Delete ${p.name}`}
                    style={{
                      width: 30,
                      height: 30,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "none",
                      background: "transparent",
                      color: "var(--muted-soft)",
                      borderRadius: 8,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--coral)";
                      e.currentTarget.style.background = "var(--coral-soft)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--muted-soft)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}

          {showAddProject ? (
            <div
              style={{
                padding: "6px 10px",
                display: "flex",
                gap: 6,
              }}
            >
              <input
                autoFocus
                value={newProjectInput}
                onChange={(e) =>
                  setNewProjectInput(e.target.value)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" && addProject()
                }
                placeholder="Project name"
                style={{
                  flex: 1,
                  fontSize: 13,
                  padding: "7px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  outline: "none",
                  background: "#fff",
                }}
              />

              <button
                onClick={addProject}
                style={{
                  background: "var(--ink)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "0 12px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Add
              </button>
            </div>
          ) : !isRestricted ? (
            <button
              onClick={() => setShowAddProject(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "transparent",
                border: "none",
                color: "var(--purple)",
                fontSize: 13,
                fontWeight: 600,
                padding: "9px 10px",
                width: "100%",
                borderRadius: 10,
              }}
            >
              <FolderPlus size={15} />
              New project
            </button>
          ) : null}
        </div>

        {!isRestricted && (
          <button
            onClick={openAccessManager}
            style={{ margin: "8px 16px 4px", width: "calc(100% - 32px)", display: "flex", alignItems: "center", gap: 7, padding: "9px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            <ShieldCheck size={15} /> Client access
          </button>
        )}

        <div
          style={{
            padding: "12px 16px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 11.5,
              color: "var(--muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {userEmail}
          </span>

          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11.5,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-col">
        <div
          className="topbar"
          style={{
            padding: "18px 24px 0",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(true)}
            style={{
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 12,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink)",
            }}
          >
            <Menu size={18} />
          </button>

          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: "10px 14px",
            }}
          >
            <Search
              size={16}
              color="var(--muted-soft)"
            />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search notes, projects, tags..."
              style={{
                border: "none",
                outline: "none",
                flex: 1,
                fontSize: 14,
                background: "transparent",
              }}
            />
          </div>

          <button
            onClick={() => setDarkMode((v) => !v)}
            className="theme-toggle"
            title={darkMode ? "Switch to day mode" : "Switch to night mode"}
            aria-label={darkMode ? "Switch to day mode" : "Switch to night mode"}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: darkMode ? "#252130" : "#fff",
              color: darkMode ? "#f4c95d" : "var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <button
            onClick={() => setShowFilters(v => !v)}
            title="Filters"
            style={{ width: 40, height: 40, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
          >
            <SlidersHorizontal size={17} />
          </button>

          <button
            className="desktop-new-btn display"
            onClick={() => setShowRecorder(true)}
            style={{
              background: "var(--purple-grad)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "11px 18px",
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 7,
              whiteSpace: "nowrap",
              boxShadow:
                "0 8px 18px rgba(124,92,252,0.35)",
            }}
          >
            <Mic size={16} />
            New Meeting
          </button>
        </div>

        {showFilters && (
          <div style={{ margin: "12px 24px 0", padding: 12, border: "1px solid var(--line)", borderRadius: 14, background: "var(--surface)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}><option value="all">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select>
            <select value={taskFilter} onChange={e => setTaskFilter(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface-2)", color: "var(--ink)" }}><option value="all">All task status</option><option value="open">Has open actions</option><option value="done">Has completed actions</option></select>
            <button onClick={() => { setSearch(""); setSortOrder("newest"); setDateFilter("all"); setTaskFilter("all"); }} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--muted)", fontWeight: 700 }}>Reset</button>
          </div>
        )}

        <div className="hero-card">
          <svg
            className="hero-doodle"
            width="120"
            height="90"
            viewBox="0 0 120 90"
            fill="none"
          >
            <circle
              cx="95"
              cy="20"
              r="18"
              stroke="white"
              strokeOpacity="0.5"
              strokeWidth="2"
            />

            <path
              d="M20 60 Q35 40 50 60 T80 60"
              stroke="white"
              strokeOpacity="0.5"
              strokeWidth="2"
              fill="none"
            />

            <circle
              cx="30"
              cy="15"
              r="4"
              fill="white"
              fillOpacity="0.5"
            />
          </svg>

          <div
            className="display"
            style={{
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {greeting()} 👋
          </div>

          <div
            style={{
              fontSize: 13,
              opacity: 0.9,
              marginTop: 3,
            }}
          >
            {stats.totalNotes} meetings captured ·{" "}
            {stats.decisionsThisWeek} decisions this week
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              marginTop: 16,
            }}
          >
            <HeroStat
              value={stats.pendingTasks}
              label="Open actions"
            />

            <HeroStat
              value={stats.activeProjects}
              label="Projects"
            />

            <HeroStat
              value={stats.decisionsThisWeek}
              label="Decisions"
            />
          </div>
        </div>

        <div className="pill-tabs">
          <button className={`pill ${tab === "dashboard" ? "active" : ""}`} onClick={() => setTab("dashboard")}>
            Dashboard
          </button>
          <button
            className={`pill ${
              activeProject === "All" && tab !== "dashboard" ? "active" : ""
            }`}
            onClick={() => { setActiveProject("All"); setTab("notes"); }}
          >
            All MOMs{" "}
            <span style={{ opacity: 0.6 }}>
              {notes.length}
            </span>
          </button>

          {projects.map((p) => (
            <button
              key={p.id}
              className={`pill ${
                activeProject === p.name
                  ? "active"
                  : ""
              }`}
              onClick={() => {
                setActiveProject(p.name);
                setTab("notes");
              }}
            >
              {p.name}{" "}
              <span style={{ opacity: 0.6 }}>
                {
                  notes.filter(
                    (n) => n.project_id === p.id
                  ).length
                }
              </span>
            </button>
          ))}
        </div>

        {!supabaseConfigured && (
          <div
            style={{
              background: "var(--yellow-soft)",
              color: "#8a5a2b",
              fontSize: 12.5,
              padding: "10px 24px",
              margin: "12px 24px 0",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            Setup incomplete: VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY aren't set. Add them
            in Vercel → Settings → Environment Variables,
            then redeploy.
          </div>
        )}

        {loadError && (
          <div
            style={{
              background: "var(--coral-soft)",
              color: "#b23b3b",
              fontSize: 12.5,
              padding: "8px 24px",
              margin: "12px 24px 0",
              borderRadius: 12,
            }}
          >
            Couldn't reach the database: {loadError}
          </div>
        )}

        <div
          className="main-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 24px 28px",
          }}
        >
          {tab === "dashboard" ? (
            <ProjectDashboard projects={projects} notes={notes} activeProject={activeProject} />
          ) : loading ? (
            <EmptyState
              icon={
                <Loader2
                  className="spin"
                  size={22}
                />
              }
              text="Loading your notes..."
            />
          ) : filteredNotes.length === 0 ? (
            <EmptyState
              icon={
                <Sparkles
                  size={22}
                  color="var(--muted-soft)"
                />
              }
              text={
                notes.length === 0
                  ? "No MOMs yet. Start your first client or site meeting."
                  : "No notes match this search."
              }
            />
          ) : (
            <div className="notes-grid">
              {filteredNotes.map((n) => (
                <NoteCard
                  key={n.id}
                  note={n}
                  projectName={
                    projects.find(
                      (p) => p.id === n.project_id
                    )?.name || "—"
                  }
                  isOpen={openNoteId === n.id}
                  onToggle={() =>
                    setOpenNoteId(
                      openNoteId === n.id
                        ? null
                        : n.id
                    )
                  }
                  onDelete={() =>
                    deleteNote(n.id)
                  }
                  onToggleAction={(idx) =>
                    toggleActionItem(n, idx)
                  }
                  onSaveEdit={saveEditedNote}
                />
              ))}
            </div>
          )}
        </div>

        <button
          className="fab"
          onClick={() => setShowRecorder(true)}
          title="New Meeting"
        >
          <Plus
            size={26}
            strokeWidth={2.5}
          />
        </button>

        <div className="bottom-nav">
          <button
            onClick={() => setShowRecorder(true)}
            style={{
              background: "var(--purple-grad)",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding: "11px 20px",
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontWeight: 700,
              boxShadow:
                "0 8px 18px rgba(124,92,252,0.25)",
            }}
          >
            <Mic size={17} />
            New Meeting
          </button>
        </div>
      </div>

      {showAccessManager && (
        <ClientAccessModal
          projects={projects}
          profiles={profiles}
          currentUserEmail={userEmail}
          loading={profilesLoading}
          saving={accessSaving}
          onClose={() => setShowAccessManager(false)}
          onAssign={assignClientProject}
        />
      )}

      {showRecorder && (
        <RecorderModal
          projects={projects}
          onClose={() => setShowRecorder(false)}
          onSaved={onNoteSaved}
        />
      )}
    </div>
  );
}

function HeroStat({ value, label }) {
  return (
    <div>
      <div
        className="display"
        style={{
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 10.5,
          opacity: 0.85,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  badge,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 8px",
        borderRadius: 12,
        border: "none",
        background: active
          ? "var(--purple-soft)"
          : "#f7f5ff",
        color: active
          ? "var(--purple)"
          : "var(--muted)",
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      {icon} {label}

      {badge ? (
        <span
          style={{
            fontSize: 10,
            background: "var(--coral)",
            color: "#fff",
            borderRadius: 8,
            padding: "1px 5px",
          }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function StatCard({
  label,
  value,
  accent,
}) {
  return (
    <div className="note-card">
      <div
        className="display"
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: accent,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--muted)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function SidebarItem({
  label,
  count,
  active,
  onClick,
  dotColor,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 10px",
        borderRadius: 10,
        border: "none",
        background: active
          ? "var(--purple-soft)"
          : "transparent",
        color: active
          ? "var(--purple)"
          : "var(--ink)",
        fontSize: 13.5,
        fontWeight: active ? 700 : 500,
        marginBottom: 2,
        textAlign: "left",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {dotColor && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: dotColor,
              flexShrink: 0,
            }}
          />
        )}

        {label}
      </span>

      <span
        style={{
          fontSize: 11,
          color: "var(--muted-soft)",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "70px 20px",
        color: "var(--muted-soft)",
        fontSize: 13.5,
      }}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}

function NoteCard({
  note,
  projectName,
  isOpen,
  onToggle,
  onDelete,
  onToggleAction,
  onSaveEdit,
}) {
  const decisions = note.decisions || [];
  const requirements = note.requirements || [];
  const actionItems = note.action_items || [];
  const tags = note.tags || [];
  const c = colorFor(projectName);

  const [editing, setEditing] =
    useState(false);

  const [draft, setDraft] =
    useState(null);

  const startEdit = (e) => {
    e.stopPropagation();

    setDraft({
      summary: note.summary || "",
      decisions: (note.decisions || []).join(
        "\n"
      ),
      requirements: (
        note.requirements || []
      ).join("\n"),
      actionItems: (
        note.action_items || []
      )
        .map(
          (a) =>
            `${a.task}${
              a.owner ? ` | ${a.owner}` : ""
            }${
              a.deadline
                ? ` | ${a.deadline}`
                : ""
            }`
        )
        .join("\n"),
    });

    setEditing(true);
  };

  const saveEdit = async () => {
    const newDecisions = draft.decisions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const newActionItems = draft.actionItems
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const [
          task,
          owner,
          deadline,
        ] = line
          .split("|")
          .map((x) => x.trim());

        const existing = (
          note.action_items || []
        ).find((a) => a.task === task);

        return {
          task,
          owner: owner || "",
          deadline: deadline || "",
          done: existing?.done || false,
        };
      });

    const newRequirements =
      draft.requirements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

    await onSaveEdit(note.id, {
      summary: draft.summary,
      decisions: newDecisions,
      requirements: newRequirements,
      action_items: newActionItems,
    });

    setEditing(false);
  };

  return (
    <div className="note-card fade-up">
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          cursor: "pointer",
        }}
      >
        {note.image_url ? (
          <img
            src={note.image_url}
            alt=""
            className="icon-chip"
            style={{
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            className="icon-chip"
            style={{
              background: c.bg,
              color: c.fg,
            }}
          >
            <FileText size={18} />
          </div>
        )}

        <div
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              {projectName}
            </span>

            <span
              style={{
                fontSize: 11.5,
                color: "var(--muted-soft)",
              }}
            >
              {fmtDate(note.created_at)}
            </span>
          </div>

          <div
            style={{
              fontSize: 13.5,
              marginTop: 5,
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            {note.summary}
          </div>

          {note.attendees && (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--purple)",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Users size={11} />
              {note.attendees}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 9,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {decisions.length > 0 && (
              <span
                className="tag-pill"
                style={{
                  background:
                    "var(--green-soft)",
                  color: "var(--green)",
                }}
              >
                {decisions.length} decision
                {decisions.length > 1
                  ? "s"
                  : ""}
              </span>
            )}

            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="tag-pill"
                style={{
                  background:
                    "var(--purple-soft)",
                  color: "var(--purple)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {isOpen ? (
          <ChevronDown
            size={17}
            style={{
              marginTop: 8,
              flexShrink: 0,
            }}
          />
        ) : (
          <ChevronRight
            size={17}
            style={{
              marginTop: 8,
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {isOpen && (
        <div
          style={{
            paddingTop: 14,
            marginTop: 14,
            borderTop:
              "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {note.image_url && (
            <img
              src={note.image_url}
              alt="Attached"
              style={{
                width: "100%",
                maxHeight: 220,
                objectFit: "cover",
                borderRadius: 14,
              }}
            />
          )}

          {editing ? (
            <>
              <Section title="Edit summary">
                <textarea
                  value={draft.summary}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      summary:
                        e.target.value,
                    })
                  }
                  rows={2}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    fontSize: 13,
                    fontFamily:
                      "inherit",
                  }}
                />
              </Section>

              <Section title="Edit decisions (one per line)">
                <textarea
                  value={draft.decisions}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      decisions:
                        e.target.value,
                    })
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    fontSize: 13,
                    fontFamily:
                      "inherit",
                  }}
                />
              </Section>

              <Section title="Edit requirements (one per line)">
                <textarea
                  value={
                    draft.requirements
                  }
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      requirements:
                        e.target.value,
                    })
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    fontSize: 13,
                    fontFamily:
                      "inherit",
                  }}
                />
              </Section>

              <Section title="Edit action items (task | owner | deadline)">
                <textarea
                  value={
                    draft.actionItems
                  }
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      actionItems:
                        e.target.value,
                    })
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    fontSize: 13,
                    fontFamily:
                      "inherit",
                  }}
                />
              </Section>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                }}
              >
                <button
                  onClick={saveEdit}
                  style={{
                    background:
                      "var(--purple-grad)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding:
                      "8px 16px",
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  Save changes
                </button>

                <button
                  onClick={() =>
                    setEditing(false)
                  }
                  style={{
                    background: "none",
                    border:
                      "1px solid var(--line)",
                    borderRadius: 10,
                    padding:
                      "8px 16px",
                    fontSize: 12.5,
                    color:
                      "var(--muted)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {decisions.length > 0 && (
                <Section title="Decisions">
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    {decisions.map(
                      (d, i) => (
                        <li key={i}>
                          {d}
                        </li>
                      )
                    )}
                  </ul>
                </Section>
              )}

              {requirements.length >
                0 && (
                <Section title="Requirements">
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: 18,
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    {requirements.map(
                      (r, i) => (
                        <li key={i}>
                          {r}
                        </li>
                      )
                    )}
                  </ul>
                </Section>
              )}

              {tags.length > 0 && (
                <Section
                  title="Tags"
                  icon={
                    <TagIcon size={12} />
                  }
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap:
                        "wrap",
                    }}
                  >
                    {tags.map(
                      (t, i) => (
                        <span
                          key={i}
                          className="tag-pill"
                          style={{
                            background:
                              "var(--purple-soft)",
                            color:
                              "var(--purple)",
                          }}
                        >
                          #
                          {t.replace(
                            /^#/,
                            ""
                          )}
                        </span>
                      )
                    )}
                  </div>
                </Section>
              )}

              {actionItems.length >
                0 && (
                <Section
                  title="Action items"
                  icon={
                    <ListChecks
                      size={12}
                    />
                  }
                >
                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap: 7,
                    }}
                  >
                    {actionItems.map(
                      (a, i) => (
                        <div
                          key={i}
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 8,
                            fontSize: 13,
                          }}
                        >
                          <button
                            onClick={() =>
                              onToggleAction(
                                i
                              )
                            }
                            style={{
                              background:
                                "none",
                              border:
                                "none",
                              padding: 0,
                              color: a.done
                                ? "var(--green)"
                                : "var(--muted-soft)",
                              display:
                                "flex",
                            }}
                          >
                            {a.done ? (
                              <CheckCircle2
                                size={16}
                              />
                            ) : (
                              <Circle
                                size={16}
                              />
                            )}
                          </button>

                          <span
                            style={{
                              textDecoration:
                                a.done
                                  ? "line-through"
                                  : "none",
                              color: a.done
                                ? "var(--muted-soft)"
                                : "var(--ink)",
                            }}
                          >
                            {a.task}

                            {(a.owner || a.deadline) ? (
                              <span style={{ color: "var(--muted-soft)" }}>
                                {" "}— {a.owner || "Unassigned"}{a.deadline ? ` · ${a.deadline}` : ""}
                              </span>
                            ) : null}
                            {a.deadline && !a.done ? (() => {
                              const d = new Date(a.deadline);
                              if (Number.isNaN(d.getTime())) return null;
                              const overdue = d < new Date();
                              return <span style={{ marginLeft: 7, fontSize: 10.5, fontWeight: 800, color: overdue ? "var(--coral)" : "var(--purple)" }}>{overdue ? "Overdue" : `Due ${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`}</span>;
                            })() : null}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </Section>
              )}

              <Section title="Full transcript">
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--muted)",
                    lineHeight: 1.7,
                    whiteSpace:
                      "pre-wrap",
                    background:
                      "#faf9ff",
                    border:
                      "1px solid var(--line)",
                    borderRadius: 12,
                    padding: 12,
                    maxHeight: 180,
                    overflowY:
                      "auto",
                  }}
                >
                  {note.transcript}
                </div>
              </Section>

              <div
                style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={startEdit}
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      "var(--purple)",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <Pencil size={13} />
                  Edit
                </button>

                <button
                  onClick={() =>
                    shareNote(
                      note,
                      projectName
                    )
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      "var(--purple)",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <Share2 size={13} />
                  Share MOM
                </button>

                <button
                  onClick={() =>
                    copyNoteAsText(
                      note,
                      projectName
                    )
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      "var(--purple)",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <Copy size={13} />
                  Copy
                </button>

                <button
                  onClick={() =>
                    downloadNoteAsText(
                      note,
                      projectName
                    )
                  }
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      "var(--purple)",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <Download
                    size={13}
                  />
                  Download MOM
                </button>

                <button
                  onClick={() => downloadNoteAsPdf(note, projectName)}
                  style={{ background: "none", border: "none", color: "var(--purple)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 5, padding: 0, fontWeight: 600 }}
                >
                  <FileDown size={13} />
                  PDF
                </button>

                <button
                  onClick={onDelete}
                  style={{
                    background: "none",
                    border: "none",
                    color:
                      "var(--coral)",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems:
                      "center",
                    gap: 5,
                    padding: 0,
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--muted-soft)",
          letterSpacing: "0.04em",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        {icon}
        {title.toUpperCase()}
      </div>

      {children}
    </div>
  );
}

const LANGUAGES = [
  {
    code: "en-IN",
    label: "English",
  },
  {
    code: "hi-IN",
    label: "हिन्दी",
  },
];

function ProjectDashboard({ projects, notes, activeProject }) {
  const visibleProjects = activeProject === "All" ? projects : projects.filter(p => p.name === activeProject);
  const visibleNotes = activeProject === "All" ? notes : notes.filter(n => visibleProjects.some(p => p.id === n.project_id));
  const totalActions = visibleNotes.reduce((s,n)=>s+(n.action_items||[]).length,0);
  const openActions = visibleNotes.reduce((s,n)=>s+(n.action_items||[]).filter(a=>!a.done).length,0);
  const doneActions = totalActions-openActions;
  const projectRows = visibleProjects.map(p => {
    const ns = visibleNotes.filter(n=>n.project_id===p.id);
    const open = ns.reduce((s,n)=>s+(n.action_items||[]).filter(a=>!a.done).length,0);
    return { ...p, meetings: ns.length, open };
  });
  return <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
    <div><div style={{fontSize:22,fontWeight:800}}>Project dashboard</div><div style={{fontSize:12.5,color:"var(--muted)",marginTop:3}}>A quick view of meetings, decisions and follow-ups.</div></div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
      <StatCard label="Meetings" value={visibleNotes.length} accent="var(--purple)" />
      <StatCard label="Open actions" value={openActions} accent="var(--coral)" />
      <StatCard label="Completed actions" value={doneActions} accent="var(--green)" />
      <StatCard label="Decisions" value={visibleNotes.reduce((s,n)=>s+(n.decisions||[]).length,0)} accent="var(--teal)" />
    </div>
    <div className="note-card"><div style={{fontWeight:800,marginBottom:10}}>Projects</div>{projectRows.length ? projectRows.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderTop:"1px solid var(--line)"}}><div><div style={{fontWeight:700}}>{p.name}</div><div style={{fontSize:11.5,color:"var(--muted)"}}>{p.meetings} meetings</div></div><span style={{fontSize:11,fontWeight:800,color:p.open?"var(--coral)":"var(--green)"}}>{p.open} open</span></div>) : <div style={{color:"var(--muted)"}}>No projects yet.</div>}</div>
  </div>;
}

function ClientAccessModal({ projects, profiles, currentUserEmail, loading, saving, onClose, onAssign }) {
  const visible = (profiles || []).filter(p => p.id && (!currentUserEmail || p.email !== currentUserEmail));
  const label = p => p.email || p.name || p.full_name || p.display_name || p.id;
  return <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(33,28,52,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:80,padding:20}}>
    <div className="modal-card" style={{width:"min(680px,100%)",maxHeight:"80vh",overflowY:"auto",background:"var(--surface)",border:"1px solid var(--line)",borderRadius:20,padding:20}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}><div><div style={{fontSize:18,fontWeight:800}}>Client access</div><div style={{fontSize:12,color:"var(--muted)",marginTop:3}}>Assign each client to one project. Empty means admin access.</div></div><button onClick={onClose} style={{border:"none",background:"transparent",color:"var(--muted)"}}><X size={18}/></button></div>
      {loading ? <div style={{padding:30,textAlign:"center",color:"var(--muted)"}}>Loading clients...</div> : visible.length ? visible.map(p=><div key={p.id} style={{display:"grid",gridTemplateColumns:"1fr 230px",gap:12,alignItems:"center",padding:"12px 0",borderTop:"1px solid var(--line)"}}><div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis"}}>{label(p)}</div><select disabled={saving} value={p.project_id || ""} onChange={e=>onAssign(p.id,e.target.value)} style={{padding:"9px 10px",borderRadius:10,border:"1px solid var(--line)",background:"var(--surface-2)",color:"var(--ink)"}}><option value="">Admin / All projects</option>{projects.map(pr=><option key={pr.id} value={pr.id}>{pr.name}</option>)}</select></div>) : <div style={{padding:20,color:"var(--muted)"}}>No client profiles found.</div>}
    </div>
  </div>;
}

function RecorderModal({
  projects,
  onClose,
  onSaved,
}) {
  const [projectId, setProjectId] =
    useState(projects[0]?.id || "");

  const [mode, setMode] =
    useState("voice");

  const [recording, setRecording] =
    useState(false);

  const [transcript, setTranscript] =
    useState("");

  const [interim, setInterim] =
    useState("");

  const [micError, setMicError] =
    useState("");

  const [status, setStatus] =
    useState("idle");

  const [errorMsg, setErrorMsg] =
    useState("");

  const [attendees, setAttendees] =
    useState("");

  const [lang, setLang] =
    useState("en-IN");

  const [photoFile, setPhotoFile] =
    useState(null);

  const [photoPreview, setPhotoPreview] =
    useState("");

  const [audioFile, setAudioFile] =
    useState(null);

  const [uploadingAudio, setUploadingAudio] =
    useState(false);

  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [seconds, setSeconds] =
    useState(0);

  const timerRef = useRef(null);
  const recognitionRef =
    useRef(null);

  const recordingRef =
    useRef(false);

  const transcriptRef =
    useRef("");

  useEffect(() => {
    if (recording) {
      timerRef.current =
        setInterval(
          () =>
            setSeconds(
              (s) => s + 1
            ),
          1000
        );
    } else {
      clearInterval(
        timerRef.current
      );
    }

    return () =>
      clearInterval(
        timerRef.current
      );
  }, [recording]);

  const fmtTimer = (s) =>
    `${String(
      Math.floor(s / 60)
    ).padStart(2, "0")}:${String(
      s % 60
    ).padStart(2, "0")}`;

  useEffect(() => {
    const SR =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SR) {
      setMicError(
        "Voice-to-text isn't supported in this browser. Type the discussion instead."
      );
      setMode("type");
      return;
    }

    const rec = new SR();

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (e) => {
      let finalChunk = "";
      let interimChunk = "";

      for (
        let i = e.resultIndex;
        i < e.results.length;
        i++
      ) {
        const t =
          e.results[i][0]
            .transcript;

        if (
          e.results[i].isFinal
        ) {
          finalChunk += t + " ";
        } else {
          interimChunk += t;
        }
      }

      if (finalChunk) {
        setTranscript(
          (prev) => {
            const next =
              (
                prev +
                " " +
                finalChunk
              ).trim();

            transcriptRef.current =
              next;

            return next;
          }
        );
      }

      setInterim(
        interimChunk
      );
    };

    rec.onerror = (e) => {
      if (
        e.error ===
          "not-allowed" ||
        e.error ===
          "service-not-allowed"
      ) {
        setMicError(
          "Microphone access was blocked. Type the discussion instead."
        );

        setMode("type");
      }

      recordingRef.current =
        false;

      setRecording(false);
    };

    rec.onend = () => {
      if (
        recordingRef.current
      ) {
        try {
          rec.start();
        } catch {}
      } else {
        setRecording(false);
      }
    };

    recognitionRef.current =
      rec;

    return () => {
      recordingRef.current =
        false;

      try {
        rec.stop();
      } catch {}
    };
  }, [lang]);

  const onPhotoSelected = (e) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    setPhotoFile(file);

    setPhotoPreview(
      URL.createObjectURL(file)
    );
  };

  const onAudioSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setErrorMsg(
        "Recording is larger than 20 MB. Please upload a smaller/compressed recording."
      );
      return;
    }

    setAudioFile(file);
    setErrorMsg("");
  };

  const startRecording = () => {
    if (
      !recognitionRef.current
    )
      return;

    setSeconds(0);

    try {
      recordingRef.current =
        true;

      recognitionRef.current.start();

      setRecording(true);
    } catch {
      setMicError(
        "Couldn't start the microphone. Type the discussion instead."
      );

      setMode("type");
    }
  };

  const stopRecording = () => {
    if (interim.trim()) {
      setTranscript(
        (prev) => {
          const next =
            (
              prev +
              " " +
              interim
            ).trim();

          transcriptRef.current =
            next;

          return next;
        }
      );
    }

    recordingRef.current =
      false;

    setRecording(false);

    setInterim("");

    try {
      recognitionRef.current?.stop();
    } catch {}
  };

  const hasText =
    (transcriptRef.current || transcript).trim().length > 10;

  const canSave =
    projectId &&
    (hasText || audioFile);

  const saveNote = async () => {
    if (!canSave) return;

    setStatus("processing");
    setErrorMsg("");

    try {
      let imageUrl = "";

      if (photoFile) {
        setUploadingPhoto(true);

        const path = `${Date.now()}-${photoFile.name}`;

        const {
          error: upErr,
        } = await supabase.storage
          .from("note-photos")
          .upload(
            path,
            photoFile
          );

        if (!upErr) {
          const {
            data: pub,
          } = supabase.storage
            .from("note-photos")
            .getPublicUrl(
              path
            );

          imageUrl =
            pub?.publicUrl || "";
        }

        setUploadingPhoto(false);
      }

      let finalTranscript =
        (
          transcriptRef.current ||
          transcript
        ).trim();

      if (audioFile) {
        setUploadingAudio(true);

        const safeName = audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const audioPath = `${Date.now()}-${safeName}`;

        const { error: audioUploadError } = await supabase.storage
          .from("note-audio")
          .upload(audioPath, audioFile, {
            contentType: audioFile.type || "audio/mpeg",
            upsert: false,
          });

        if (audioUploadError) {
          setUploadingAudio(false);
          throw audioUploadError;
        }

        try {
          const { data: signedData, error: signedError } =
            await supabase.storage
              .from("note-audio")
              .createSignedUrl(audioPath, 600);

          if (signedError || !signedData?.signedUrl) {
            throw signedError || new Error("Couldn't create a secure audio URL.");
          }

          const transcribeRes = await fetch("/api/transcribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: signedData.signedUrl,
              mimeType: audioFile.type || "audio/mpeg",
            }),
          });

          const transcribeData = await transcribeRes.json().catch(() => ({}));

          if (!transcribeRes.ok) {
            throw new Error(
              transcribeData.detail ||
                transcribeData.error ||
                `Audio transcription failed (${transcribeRes.status})`
            );
          }

          const audioTranscript = (transcribeData.transcript || "").trim();

          if (!audioTranscript) {
            throw new Error("Gemini could not find usable speech in this recording.");
          }

          finalTranscript = [finalTranscript, audioTranscript]
            .filter(Boolean)
            .join("\n\n");

          setTranscript(finalTranscript);
          transcriptRef.current = finalTranscript;
        } finally {
          await supabase.storage
            .from("note-audio")
            .remove([audioPath]);
          setUploadingAudio(false);
        }
      }

      const ai =
        await callSummarizeAPI(
          finalTranscript
        );

      const actionItems =
        (ai.actionItems || []).map(
          (a) => ({
            ...a,
            owner:
              a.owner || "",
            deadline:
              a.deadline || "",
            done: false,
          })
        );

      const {
        data,
        error,
      } = await supabase
        .from("notes")
        .insert({
          project_id:
            projectId,
          transcript:
            finalTranscript,
          summary:
            ai.summary || "",
          decisions:
            ai.decisions || [],
          requirements:
            ai.requirements || [],
          action_items:
            actionItems,
          tags:
            ai.tags || [],
          attendees:
            attendees.trim(),
          image_url:
            imageUrl,
        })
        .select();

      if (error) {
        if (
          /requirements.*schema cache|column .*requirements.*does not exist/i.test(
            error.message || ""
          )
        ) {
          throw new Error(
            "Supabase needs the MOM requirements column. Run SUPABASE-MOM-MIGRATION.sql once in Supabase → SQL Editor, then try again."
          );
        }

        throw error;
      }

      onSaved(data[0]);

      setStatus("done");

      setTimeout(
        onClose,
        500
      );
    } catch (err) {
      setStatus("error");

      setErrorMsg(
        err.message ||
          "Couldn't save that note. Try again."
      );
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background:
          "rgba(33,28,52,0.4)",
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        zIndex: 50,
        padding: 20,
      }}
    >
      <div
        className="modal-card"
        style={{
          background: "#fff",
          borderRadius: 26,
          width: "100%",
          maxWidth: 560,
          boxShadow:
            "0 24px 70px rgba(33,28,52,0.3)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding:
              "18px 22px",
            borderBottom:
              "1px solid var(--line)",
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
          }}
        >
          <span
            className="display"
            style={{
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            New Meeting
          </span>

          <button
            onClick={onClose}
            style={{
              background:
                "var(--purple-soft)",
              border: "none",
              color:
                "var(--purple)",
              borderRadius: 10,
              width: 32,
              height: 32,
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: 22,
            display: "flex",
            flexDirection:
              "column",
            gap: 16,
            maxHeight: "75vh",
            overflowY: "auto",
          }}
        >
          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color:
                  "var(--muted)",
              }}
            >
              PROJECT
            </label>

            <select
              value={projectId}
              onChange={(e) =>
                setProjectId(
                  e.target.value
                )
              }
              style={{
                width: "100%",
                marginTop: 6,
                padding:
                  "11px 12px",
                borderRadius: 12,
                border:
                  "1px solid var(--line)",
                fontSize: 14,
                background: "#fff",
              }}
            >
              <option
                value=""
                disabled
              >
                {projects.length
                  ? "Select a project"
                  : "No projects yet — add one first"}
              </option>

              {projects.map(
                (p) => (
                  <option
                    key={p.id}
                    value={p.id}
                  >
                    {p.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color:
                  "var(--muted)",
              }}
            >
              ATTENDEES (optional)
            </label>

            <input
              value={attendees}
              onChange={(e) =>
                setAttendees(
                  e.target.value
                )
              }
              placeholder="e.g. Client, Sachin, Design team"
              style={{
                width: "100%",
                marginTop: 6,
                padding:
                  "10px 12px",
                borderRadius: 12,
                border:
                  "1px solid var(--line)",
                fontSize: 13.5,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
            }}
          >
            <ModeTab
              active={
                mode === "voice"
              }
              onClick={() =>
                setMode("voice")
              }
              icon={
                <Mic size={13} />
              }
              label="Voice"
            />

            <ModeTab
              active={
                mode === "type"
              }
              onClick={() =>
                setMode("type")
              }
              icon={
                <Type size={13} />
              }
              label="Type"
            />

            <ModeTab
              active={
                mode === "upload"
              }
              onClick={() =>
                setMode("upload")
              }
              icon={
                <Upload size={13} />
              }
              label="Upload"
            />
          </div>

          {mode === "voice" && (
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent:
                  "center",
              }}
            >
              {LANGUAGES.map(
                (l) => (
                  <button
                    key={l.code}
                    onClick={() =>
                      setLang(
                        l.code
                      )
                    }
                    disabled={
                      recording
                    }
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 5,
                      padding:
                        "5px 12px",
                      borderRadius:
                        999,
                      border:
                        "1px solid " +
                        (lang ===
                        l.code
                          ? "var(--purple)"
                          : "var(--line)"),
                      background:
                        lang ===
                        l.code
                          ? "var(--purple-soft)"
                          : "#fff",
                      color:
                        lang ===
                        l.code
                          ? "var(--purple)"
                          : "var(--muted)",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <Languages
                      size={11}
                    />
                    {l.label}
                  </button>
                )
              )}
            </div>
          )}

          {micError && (
            <div
              style={{
                fontSize: 12,
                color: "#b9791f",
                background:
                  "var(--yellow-soft)",
                padding:
                  "9px 12px",
                borderRadius: 10,
              }}
            >
              {micError}
            </div>
          )}

          {mode === "voice" && (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                alignItems:
                  "center",
                gap: 10,
                padding:
                  "12px 0",
              }}
            >
              <button
                onClick={
                  recording
                    ? stopRecording
                    : startRecording
                }
                style={{
                  width: 68,
                  height: 68,
                  borderRadius:
                    "50%",
                  border: "none",
                  background:
                    recording
                      ? "linear-gradient(135deg,#ff8b8b,#ff6b6b)"
                      : "var(--purple-grad)",
                  color: "#fff",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  animation:
                    recording
                      ? "pulseRing 1.6s infinite"
                      : "none",
                  boxShadow:
                    "0 10px 24px rgba(124,92,252,0.35)",
                }}
              >
                {recording ? (
                  <Square
                    size={24}
                  />
                ) : (
                  <Mic
                    size={26}
                  />
                )}
              </button>

              <span
                style={{
                  fontSize: 12,
                  color:
                    "var(--muted)",
                  fontWeight: 600,
                }}
              >
                {recording
                  ? `Listening ${fmtTimer(
                      seconds
                    )} — tap to stop`
                  : "Tap to start meeting"}
              </span>
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color:
                  "var(--muted)",
              }}
            >
              {mode === "upload" ? "ADDITIONAL NOTES (optional)" : "LIVE TRANSCRIPT / NOTES"}
            </label>

            <textarea
              value={
                transcript +
                (interim
                  ? " " +
                    interim
                  : "")
              }
              onChange={(e) => {
                setTranscript(
                  e.target.value
                );

                transcriptRef.current =
                  e.target.value;
              }}
              placeholder={
                mode === "upload"
                  ? "Optional: paste any existing text or extra notes here..."
                  : "What was discussed and decided..."
              }
              rows={6}
              style={{
                width: "100%",
                marginTop: 6,
                padding: 12,
                borderRadius: 14,
                border:
                  "1px solid var(--line)",
                fontSize: 14,
                lineHeight: 1.6,
                resize:
                  "vertical",
                fontFamily:
                  "inherit",
              }}
            />
          </div>

          {mode === "upload" && (
            <div>
              <label
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: "var(--muted)",
                }}
              >
                MEETING RECORDING
              </label>

              <div
                style={{
                  marginTop: 6,
                  padding: 14,
                  border: "1px dashed var(--line)",
                  borderRadius: 14,
                  background: "#faf9ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {audioFile ? audioFile.name : "Upload an existing meeting recording"}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--muted)",
                      marginTop: 3,
                    }}
                  >
                    MP3, M4A, WAV, OGG, AAC, FLAC or WebM · max 20 MB
                  </div>
                </div>

                <label
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 13px",
                    borderRadius: 11,
                    background: "var(--purple-soft)",
                    color: "var(--purple)",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Upload size={14} />
                  Choose file
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={onAudioSelected}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {audioFile && (
                <button
                  onClick={() => setAudioFile(null)}
                  style={{
                    marginTop: 7,
                    fontSize: 12,
                    color: "var(--coral)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Remove recording
                </button>
              )}
            </div>
          )}

          <div>
            <label
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color:
                  "var(--muted)",
              }}
            >
              SITE / MATERIAL PHOTO (optional)
            </label>

            <div
              style={{
                marginTop: 6,
                display: "flex",
                alignItems:
                  "center",
                gap: 10,
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    objectFit:
                      "cover",
                  }}
                />
              ) : (
                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 6,
                    padding:
                      "9px 14px",
                    borderRadius:
                      12,
                    border:
                      "1px dashed var(--line)",
                    color:
                      "var(--muted)",
                    fontSize: 12.5,
                    cursor:
                      "pointer",
                  }}
                >
                  <Camera
                    size={14}
                  />
                  Add photo

                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      onPhotoSelected
                    }
                    style={{
                      display:
                        "none",
                    }}
                  />
                </label>
              )}

              {photoPreview && (
                <button
                  onClick={() => {
                    setPhotoFile(
                      null
                    );
                    setPhotoPreview(
                      ""
                    );
                  }}
                  style={{
                    fontSize: 12,
                    color:
                      "var(--coral)",
                    background:
                      "none",
                    border: "none",
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                fontSize: 12,
                color:
                  "var(--coral)",
                whiteSpace:
                  "pre-wrap",
                wordBreak:
                  "break-word",
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            onClick={saveNote}
            disabled={
              !canSave ||
              status ===
                "processing"
            }
            className="display"
            style={{
              background: canSave
                ? "var(--purple-grad)"
                : "#e4e0f5",
              color: "#fff",
              border: "none",
              borderRadius: 14,
              padding:
                "13px 14px",
              fontSize: 14.5,
              fontWeight: 700,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: 8,
              boxShadow: canSave
                ? "0 10px 22px rgba(124,92,252,0.35)"
                : "none",
            }}
          >
            {status ===
            "processing" ? (
              <>
                <Loader2
                  size={16}
                  className="spin"
                />
                {uploadingAudio ? "Transcribing recording..." : "Generating MOM with AI..."}
              </>
            ) : status ===
              "done" ? (
              <>
                <CheckCircle2
                  size={16}
                />
                Saved
              </>
            ) : (
              <>
                <Sparkles
                  size={16}
                />
                Generate MOM
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        gap: 6,
        padding:
          "9px 10px",
        borderRadius: 12,
        border:
          "1px solid " +
          (active
            ? "var(--purple)"
            : "var(--line)"),
        background: active
          ? "var(--purple-soft)"
          : "#fff",
        color: active
          ? "var(--purple)"
          : "var(--muted)",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {icon} {label}
    </button>
  );
}
