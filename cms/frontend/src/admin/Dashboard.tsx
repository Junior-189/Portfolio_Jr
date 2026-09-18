import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  whoAmI, logout,
  listSkills, createSkill, updateSkill, deleteSkill,
  listProjects, createProject, updateProject, deleteProject,
  listExperience, createExperience, updateExperience, deleteExperience,
  getBio, updateBio,
  getProfile, updateProfile,
  type AdminSkill, type AdminProject, type AdminExperience, type AdminBio, type AdminProfile,
} from "./api";
import "./admin.css";

type Tab = "skills" | "projects" | "experience" | "bio" | "profile";

const blankSkill      = { name: "New skill", years: 1, level: 50, desc: "", order: 0 };
const blankProject    = { num: "0", title: "New project", desc: "", stack: [] as string[], githubUrl: "", liveUrl: "", order: 0 };
const blankExperience = { year: "", role: "New role", company: "", desc: "", order: 0 };

export default function Dashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("skills");
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("");

  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [experience, setExperience] = useState<AdminExperience[]>([]);
  const [bio, setBio] = useState<AdminBio | null>(null);
  const [profile, setProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    whoAmI()
      .then(u => { setUsername(u.username); setReady(true); })
      .catch(() => navigate("/admin", { replace: true }));
  }, [navigate]);

  const reloadAll = () => {
    listSkills().then(setSkills).catch(() => {});
    listProjects().then(setProjects).catch(() => {});
    listExperience().then(setExperience).catch(() => {});
    getBio().then(setBio).catch(() => {});
    getProfile().then(setProfile).catch(() => {});
  };

  useEffect(() => { if (ready) reloadAll(); }, [ready]);

  const flash = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(""), 2000); };

  const onLogout = async () => { await logout().catch(() => {}); navigate("/admin", { replace: true }); };

  if (!ready) return <div className="adm" style={{ padding: 40 }}>Checking session…</div>;

  return (
    <div className="adm">
      <div className="adm-header">
        <h1>PORTFOLIO CMS — signed in as {username}</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {status && <span className="adm-status">{status}</span>}
          <a href="/" target="_blank" rel="noreferrer" className="adm-btn">View site ↗</a>
          <button className="adm-btn" onClick={onLogout}>Log out</button>
        </div>
      </div>

      <div className="adm-shell">
        <div className="adm-tabs">
          {(["skills", "projects", "experience", "bio", "profile"] as Tab[]).map(t => (
            <button key={t} className={`adm-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>

        {tab === "skills" && (
          <SkillsTab items={skills} setItems={setSkills}
            onSave={async (item) => { if (item.id) { await updateSkill(item.id, item); } else { const created = await createSkill(item); setSkills(s => s.map(x => x === item ? created : x)); } flash("Saved"); }}
            onDelete={async (id) => { await deleteSkill(id); setSkills(s => s.filter(x => x.id !== id)); flash("Deleted"); }}
          />
        )}
        {tab === "projects" && (
          <ProjectsTab items={projects} setItems={setProjects}
            onSave={async (item) => { if (item.id) { await updateProject(item.id, item); } else { const created = await createProject(item); setProjects(s => s.map(x => x === item ? created : x)); } flash("Saved"); }}
            onDelete={async (id) => { await deleteProject(id); setProjects(s => s.filter(x => x.id !== id)); flash("Deleted"); }}
          />
        )}
        {tab === "experience" && (
          <ExperienceTab items={experience} setItems={setExperience}
            onSave={async (item) => { if (item.id) { await updateExperience(item.id, item); } else { const created = await createExperience(item); setExperience(s => s.map(x => x === item ? created : x)); } flash("Saved"); }}
            onDelete={async (id) => { await deleteExperience(id); setExperience(s => s.filter(x => x.id !== id)); flash("Deleted"); }}
          />
        )}
        {tab === "bio" && bio && (
          <BioTab bio={bio} setBio={setBio} onSave={async (b) => { await updateBio(b); flash("Saved"); }} />
        )}
        {tab === "profile" && profile && (
          <ProfileTab profile={profile} setProfile={setProfile} onSave={async (p) => { await updateProfile(p); flash("Saved"); }} />
        )}
      </div>
    </div>
  );
}

/* ── Skills ── */
function SkillsTab({ items, setItems, onSave, onDelete }: { items: AdminSkill[]; setItems: (v: AdminSkill[]) => void; onSave: (item: AdminSkill) => Promise<void>; onDelete: (id: number) => Promise<void>; }) {
  const update = (i: number, patch: Partial<AdminSkill>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div>
      {items.map((s, i) => (
        <div className="adm-card" key={s.id ?? `new-${i}`}>
          <div className="adm-row">
            <Field label="Name" value={s.name} onChange={v => update(i, { name: v })} />
            <Field label="Years" type="number" value={s.years} onChange={v => update(i, { years: Number(v) })} />
          </div>
          <div className="adm-row">
            <Field label="Level (0-100)" type="number" value={s.level} onChange={v => update(i, { level: Number(v) })} />
            <Field label="Order" type="number" value={s.order ?? 0} onChange={v => update(i, { order: Number(v) })} />
          </div>
          <Field label="Description" textarea value={s.desc} onChange={v => update(i, { desc: v })} />
          <div className="adm-card-actions">
            <button className="adm-btn danger" onClick={() => s.id ? onDelete(s.id) : setItems(items.filter((_, idx) => idx !== i))}>Delete</button>
            <button className="adm-btn primary" onClick={() => onSave(s)}>Save</button>
          </div>
        </div>
      ))}
      <button className="adm-add" onClick={() => setItems([...items, { ...blankSkill }])}>+ Add skill</button>
    </div>
  );
}

/* ── Projects ── */
function ProjectsTab({ items, setItems, onSave, onDelete }: { items: AdminProject[]; setItems: (v: AdminProject[]) => void; onSave: (item: AdminProject) => Promise<void>; onDelete: (id: number) => Promise<void>; }) {
  const update = (i: number, patch: Partial<AdminProject>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div>
      {items.map((p, i) => (
        <div className="adm-card" key={p.id ?? `new-${i}`}>
          <div className="adm-row">
            <Field label="Number (e.g. 01)" value={p.num} onChange={v => update(i, { num: v })} />
            <Field label="Title" value={p.title} onChange={v => update(i, { title: v })} />
          </div>
          <Field label="Description" textarea value={p.desc} onChange={v => update(i, { desc: v })} />
          <Field label="Stack (comma-separated)" value={(p.stack || []).join(", ")} onChange={v => update(i, { stack: v.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          <div className="adm-row">
            <Field label="GitHub URL" value={p.githubUrl || ""} onChange={v => update(i, { githubUrl: v })} />
            <Field label="Live URL" value={p.liveUrl || ""} onChange={v => update(i, { liveUrl: v })} />
          </div>
          <div className="adm-row">
            <Field label="Order" type="number" value={p.order ?? 0} onChange={v => update(i, { order: Number(v) })} />
            <div />
          </div>
          <div className="adm-card-actions">
            <button className="adm-btn danger" onClick={() => p.id ? onDelete(p.id) : setItems(items.filter((_, idx) => idx !== i))}>Delete</button>
            <button className="adm-btn primary" onClick={() => onSave(p)}>Save</button>
          </div>
        </div>
      ))}
      <button className="adm-add" onClick={() => setItems([...items, { ...blankProject }])}>+ Add project</button>
    </div>
  );
}

/* ── Experience ── */
function ExperienceTab({ items, setItems, onSave, onDelete }: { items: AdminExperience[]; setItems: (v: AdminExperience[]) => void; onSave: (item: AdminExperience) => Promise<void>; onDelete: (id: number) => Promise<void>; }) {
  const update = (i: number, patch: Partial<AdminExperience>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  return (
    <div>
      {items.map((e, i) => (
        <div className="adm-card" key={e.id ?? `new-${i}`}>
          <div className="adm-row">
            <Field label="Year range" value={e.year} onChange={v => update(i, { year: v })} />
            <Field label="Order" type="number" value={e.order ?? 0} onChange={v => update(i, { order: Number(v) })} />
          </div>
          <div className="adm-row">
            <Field label="Role" value={e.role} onChange={v => update(i, { role: v })} />
            <Field label="Company / Institution" value={e.company} onChange={v => update(i, { company: v })} />
          </div>
          <Field label="Description" textarea value={e.desc} onChange={v => update(i, { desc: v })} />
          <div className="adm-card-actions">
            <button className="adm-btn danger" onClick={() => e.id ? onDelete(e.id) : setItems(items.filter((_, idx) => idx !== i))}>Delete</button>
            <button className="adm-btn primary" onClick={() => onSave(e)}>Save</button>
          </div>
        </div>
      ))}
      <button className="adm-add" onClick={() => setItems([...items, { ...blankExperience }])}>+ Add experience entry</button>
    </div>
  );
}

/* ── Bio (single row) ── */
function BioTab({ bio, setBio, onSave }: { bio: AdminBio; setBio: (v: AdminBio) => void; onSave: (b: AdminBio) => Promise<void>; }) {
  const stats: [string, string][] = (bio.stats || []).map((s): [string, string] => [s.value, s.label]);
  const updateStat = (i: number, idx: 0 | 1, v: string) => {
    const next: [string, string][] = stats.map((s, j) => j === i ? (idx === 0 ? [v, s[1]] as [string, string] : [s[0], v] as [string, string]) : s);
    setBio({ ...bio, stats: next.map(([value, label]) => ({ value, label })) });
  };
  return (
    <div className="adm-card">
      <Field label="Heading" value={bio.heading} onChange={v => setBio({ ...bio, heading: v })} />
      <Field label="Paragraph 1" textarea value={bio.paragraph1} onChange={v => setBio({ ...bio, paragraph1: v })} />
      <Field label="Paragraph 2" textarea value={bio.paragraph2} onChange={v => setBio({ ...bio, paragraph2: v })} />
      <label style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 1, display: "block", margin: "14px 0 6px" }}>Stats (4 shown on site)</label>
      {stats.map((s, i) => (
        <div className="adm-row" key={i}>
          <Field label={`Stat ${i + 1} value`} value={s[0]} onChange={v => updateStat(i, 0, v)} />
          <Field label={`Stat ${i + 1} label`} value={s[1]} onChange={v => updateStat(i, 1, v)} />
        </div>
      ))}
      <div className="adm-card-actions">
        <button className="adm-btn primary" onClick={() => onSave(bio)}>Save</button>
      </div>
    </div>
  );
}

/* ── Profile (single row: identity, contact, footer) ── */
function ProfileTab({ profile, setProfile, onSave }: { profile: AdminProfile; setProfile: (v: AdminProfile) => void; onSave: (p: AdminProfile) => Promise<void>; }) {
  return (
    <div className="adm-card">
      <Field label="Full name" value={profile.name} onChange={v => setProfile({ ...profile, name: v })} />
      <div className="adm-row">
        <Field label="Contact email" value={profile.email} onChange={v => setProfile({ ...profile, email: v })} />
        <Field label="Footer note" value={profile.footerNote} onChange={v => setProfile({ ...profile, footerNote: v })} />
      </div>
      <Field label="GitHub URL" value={profile.githubUrl} onChange={v => setProfile({ ...profile, githubUrl: v })} />
      <Field label="LinkedIn URL" value={profile.linkedinUrl} onChange={v => setProfile({ ...profile, linkedinUrl: v })} />
      <div className="adm-card-actions">
        <button className="adm-btn primary" onClick={() => onSave(profile)}>Save</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", textarea = false }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; textarea?: boolean; }) {
  return (
    <div className="adm-field" style={{ marginBottom: 10 }}>
      <label>{label}</label>
      {textarea
        ? <textarea value={value} onChange={e => onChange(e.target.value)} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} />}
    </div>
  );
}
