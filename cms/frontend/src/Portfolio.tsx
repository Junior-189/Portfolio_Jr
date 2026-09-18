import { useState, useEffect, useRef, Fragment, type CSSProperties } from "react";
import { fetchSkills, fetchProjects, fetchExperience, fetchBio, fetchProfile } from "./api/content";

/* ──────────────────────── TYPES ──────────────────────── */

interface Point        { x: number; y: number; }
interface Particle     { x: number; y: number; vx: number; vy: number; r: number; }
interface Skill        { name: string; years: number; level: number; desc: string; }
interface Project      { id: number | string; num: string; title: string; desc: string; stack: string[]; lines: number[]; githubUrl?: string; liveUrl?: string; }
interface Experience   { year: string; role: string; company: string; desc: string; }
type    TermEntryType   = "sys" | "in" | "out" | "err";
interface TermEntry    { type: TermEntryType; text: string; }
type    TermCmdResult   = string | null;
type    TermCmd         = () => TermCmdResult;
interface MockPreviewProps { lines: number[]; fg: string; border: string; }
interface CornerBracket { top?: number; bottom?: number; left?: number; right?: number; borderTop: boolean; borderBottom: boolean; borderLeft: boolean; borderRight: boolean; }
interface BioData       { heading: string; paragraph1: string; paragraph2: string; stats: [string, string][]; }

/* Path to the CV file. Drop your exported PDF at /public/cv.pdf (same
 * name) and this button starts working immediately — nothing else to
 * change. See README.md for details. */
const CV_URL = "/cv.pdf";

const seededLines = (title: string): number[] => {
  let h = 0; for (let i = 0; i < title.length; i++) h = ((h << 5) - h + title.charCodeAt(i)) | 0;
  return Array.from({ length: 6 }, (_, i) => 30 + ((Math.abs(h) >> (i * 4)) & 0x3f) % 56);
};

/* Section labels — shared by the navbar and the Cmd/Ctrl+K quick-nav palette. */
const SECTIONS = ["About", "Skills", "Projects", "Experience", "Contact"];

/* Boot-sequence lines shown once per browser session before the hero reveals. */
const BOOT_LINES = ["booting portfolio...", "loading profile...", "mounting sections...", "ready."];

/* Keeps Tab cycling inside a modal instead of escaping to the page behind it.
 * Shared by the quick-nav palette and the project case-study modal. */
function trapTabWithin(e: KeyboardEvent, container: HTMLElement) {
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>('button, a[href], input, textarea, [tabindex]:not([tabindex="-1"])')
  ).filter(el => !el.hasAttribute("disabled"));
  if (focusables.length === 0) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ──────────────────────── STATIC FALLBACK DATA ────────────────────────
 * Shown instantly on load, and used if the local CMS backend (/backend)
 * isn't running or a fetch fails. Edit live content in the admin
 * dashboard instead of here once the backend is set up. */

const ROLES = ["Software Developer", "AI / ML Engineer", "IoT Systems Builder", "Full-Stack Developer", "Data Science Student"];

const SKILLS: Skill[] = [
  { name: "React.js / TypeScript",   years: 2, level: 85, desc: "Component architecture, hooks, Vite, Tailwind CSS, PWA development" },
  { name: "Node.js / Express.js",    years: 2, level: 80, desc: "REST API design, JWT authentication, middleware, role-based access" },
  { name: "PostgreSQL / MongoDB",    years: 2, level: 78, desc: "Schema design, complex queries, Firebase Firestore & OAuth integration" },
  { name: "AI / ML Enthusiast",     years: 3, level: 74, desc: "TensorFlow, PyTorch, Scikit-learn, Keras, TFLite, spaCy" },
  { name: "IoT & Embedded Systems",  years: 3, level: 76, desc: "ESP32, Arduino, Raspberry Pi, MQTT, PlatformIO, Edge AI" },
  { name: "Docker / DevOps",         years: 1, level: 62, desc: "Docker, Nginx, Render, Railway, Linux (Ubuntu), Git & GitHub" },
  { name: "Data Science",            years: 3, level: 72, desc: "Pandas, NumPy, Matplotlib, Jupyter Notebook, Data Analysis Pipelines" },
  { name: "WebSocket / Real-Time",   years: 1, level: 70, desc: "Socket.IO, Leaflet, Live GPS tracking, Real-Time Analytics Dashboards" },
];

const PROJECTS: Project[] = [
  { id:1, num:"01", title:"CITT System",  desc:"Centralised Innovation Management System for MUST — streamlining research, IP, funding, and collaboration workflows with RBAC, audit logs, and real-time analytics.", stack:["React","Node.js","PostgreSQL","Firebase"], lines:[80,50,70,40,60,30], githubUrl:"https://github.com/Junior-189/CITT_Project" },
  { id:2, num:"02", title:"Boat Tracker", desc:"Real-time IoT boat tracking app with live GPS mapping via Leaflet, WebSocket-based updates via Socket.IO, and end-to-end hardware-sensor-to-dashboard architecture.", stack:["React","Socket.IO","PostgreSQL","Leaflet"], lines:[60,80,45,70,55,40], githubUrl:"https://github.com/Junior-189/Boat-Tracking-System" },
  { id:3, num:"03", title:"Coming Soon",  desc:"Next project in progress — exploring AI/ML integration with IoT sensor data for predictive maintenance and anomaly detection.", stack:["TBD"], lines:[45,35,55,30,50,40] },
  { id:4, num:"04", title:"Coming Soon",  desc:"More to be revealed. Building at the intersection of embedded systems, TinyML, and real-time web interfaces.", stack:["TBD"], lines:[55,40,30,60,35,45] },
];

const EXPERIENCE: Experience[] = [
  { year:"Oct 2025 -> Present", role:"Software Developer",                    company:"BLECA Smartlabs",                            desc:"Designed and deployed the CITT Management System, reducing administrative processing time by 90% and supporting 30 concurrent users across multiple departments. Collaborated with university stakeholders to translate business needs into scalable AI/IoT solutions — from initial spec through production deployment." },
  { year:"2025 -> Present",     role:"Volunteer Mentor",                      company:"MUST IoT Bootcamp",                          desc:"Led hands-on workshops on AI, IoT, and TinyML, reaching 50+ participants and helping students build their first embedded ML prototypes. Also participated in Tanzania Indaba-X — the national AI symposium themed 'AI in Tanzania: Celebrating Our Builders & Embracing Our Tools.'" },
  { year:"2022 -> 2026",        role:"B.Sc. Engineering in Data Science",     company:"Mbeya University of Science and Technology",  desc:"Advanced coursework in AI, Machine Learning, Deep Learning, IoT/TinyML, Distributed Systems, Data Analysis, Software Engineering, and Web Development. Final-year student with ongoing research and project experience across academia and industry." },
];

const DEFAULT_BIO: BioData = {
  heading:    "Bridging data science and software engineering.",
  paragraph1: "I'm a final-year Data Science & Engineering student at Mbeya University of Science and Technology, with 1+ year of professional experience building production-grade systems at BLECA Smartlabs. I care deeply about clean architecture, real-world impact, and the people using what I build.",
  paragraph2: "My work spans the full stack — from embedded sensor firmware on ESP32s and Raspberry Pis, through Node.js APIs and PostgreSQL schemas, to React frontends with real-time WebSocket dashboards. Available for remote or part-time opportunities in the East Africa Time zone (UTC+3).",
  stats: [["1+","years professional exp."], ["2","production systems shipped"], ["50+","students mentored"], ["8+","technologies mastered"]],
};

/* Site-wide identity/contact — editable via the admin dashboard's Profile
 * tab. Used by the contact section and footer; falls back to these values
 * when the backend is unreachable. */
const DEFAULT_PROFILE = {
  name: "Junior Jackson Lyimo",
  email: "jjuniorlyimo@gmail.com",
  githubUrl: "https://github.com/Junior-189",
  linkedinUrl: "https://linkedin.com/in/junior-jackson-271016393",
  footerNote: "built with React + TypeScript",
};

const CORNERS: CornerBracket[] = [
  { top: 14, left: 14, borderTop: true, borderLeft: true, borderBottom: false, borderRight: false },
  { top: 14, right: 14, borderTop: true, borderRight: true, borderBottom: false, borderLeft: false },
  { bottom: 14, left: 14, borderBottom: true, borderLeft: true, borderTop: false, borderRight: false },
  { bottom: 14, right: 14, borderBottom: true, borderRight: true, borderTop: false, borderLeft: false },
];

/* ──────────────────────── MOCK PREVIEW ──────────────────────── */

function MockPreview({ lines, fg, border }: MockPreviewProps) {
  return (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", display: "block" }}>
      <rect x="0" y="0" width="120" height="10" fill={fg} opacity="0.35" rx="1" />
      <rect x="2" y="3" width="16" height="4" fill={fg} opacity="0.8" rx="1" />
      <rect x="22" y="3" width="28" height="4" fill={fg} opacity="0.5" rx="1" />
      <rect x="54" y="3" width="18" height="4" fill={fg} opacity="0.5" rx="1" />
      {lines.map((w, i) => (
        <rect key={i} x="4" y={18 + i * 9} width={w} height={6} fill={fg} opacity={0.2 + i * 0.05} rx="1" />
      ))}
      <rect x="6" y="72" width="32" height="5" fill={fg} opacity="0.5" rx="1" />
      <rect x="48" y="72" width="16" height="5" fill={fg} opacity="0.3" rx="1" />
      <rect x="0" y="0" width="120" height="80" fill="none" stroke={border} strokeWidth="0.5" rx="2" />
    </svg>
  );
}

/* ──────────────────────── MAIN COMPONENT ──────────────────────── */

export default function Portfolio() {
  /* ── state ── */
  const [inverted, setInverted] = useState(false);
  const [roleIdx, setRoleIdx] = useState(0);
  const [roleText, setRoleText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [dotPos, setDotPos] = useState<Point>({ x: -100, y: -100 });
  const [ringPos, setRingPos] = useState<Point>({ x: -100, y: -100 });
  const [cursorHover, setCursorHover] = useState(false);
  const [cursorClicking, setCursorClicking] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [termInput, setTermInput] = useState("");
  const [termHistory, setTermHistory] = useState<TermEntry[]>([{ type: "sys", text: "Type 'help' for available commands." }]);
  const [hovSkill, setHovSkill] = useState<number | null>(null);
  const [hovProject, setHovProject] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set(["hero"]));
  const [glitching, setGlitching] = useState(false);
  const [skills, setSkills] = useState<Skill[]>(SKILLS);
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [experience, setExperience] = useState<Experience[]>(EXPERIENCE);
  const [bioData, setBioData] = useState<BioData>(DEFAULT_BIO);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [navOpen, setNavOpen] = useState(false);
  const [scrollPct, setScrollPct] = useState(0);
  const [photoFlipped, setPhotoFlipped] = useState(false);

  /* quick-nav palette (Cmd/Ctrl+K) */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);

  /* project case-study modal */
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  /* tilt-hover on the currently-hovered project card */
  const [tilt, setTilt] = useState<{ i: number; rx: number; ry: number } | null>(null);

  /* boot-sequence intro — shown once per browser session */
  const [bootDone, setBootDone] = useState(() => {
    try { return typeof window !== "undefined" && sessionStorage.getItem("pf_boot_shown") === "1"; }
    catch { return false; }
  });
  const [bootLineIdx, setBootLineIdx] = useState(0);

  /* whether the initial CMS fetch (skills/projects/experience/bio) is still in flight */
  const [cmsSyncing, setCmsSyncing] = useState(true);

  /* ── refs ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<Point>({ x: -1000, y: -1000 });
  const ringRef = useRef<Point>({ x: -100, y: -100 });
  const ringAnimRef = useRef<number | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const termEndRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);
  const termCloseRef = useRef<HTMLSpanElement>(null);
  const termTriggerRef = useRef<HTMLElement | null>(null);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const paletteModalRef = useRef<HTMLDivElement>(null);
  const paletteTriggerRef = useRef<HTMLElement | null>(null);
  const projectModalRef = useRef<HTMLDivElement>(null);
  const projectCloseRef = useRef<HTMLSpanElement>(null);
  const projectTriggerRef = useRef<HTMLElement | null>(null);
  const animRef = useRef<number | null>(null);

  /* ── theme tokens ── */
  const BG     = inverted ? "#000" : "#fff";
  const FG     = inverted ? "#fff" : "#000";
  const MUTED  = inverted ? "#777" : "#666";
  const CARD   = inverted ? "#0d0d0d" : "#f5f5f5";
  const BORDER = inverted ? "#222" : "#e0e0e0";
  const F_DISPLAY = "'Bebas Neue', Impact, 'Arial Black', sans-serif";
  const F_MONO    = "'JetBrains Mono', 'Courier New', monospace";
  const F_BODY    = "'Outfit', system-ui, sans-serif";

  const reveal = (id: string): CSSProperties => ({
    opacity:    revealed.has(id) ? 1 : 0,
    transform:  revealed.has(id) ? "translateY(0px)" : "translateY(32px)",
    transition: "opacity 0.75s ease, transform 0.75s ease",
  });

  const sectionBorder: CSSProperties = { borderTop: `1px solid ${BORDER}`, paddingTop: 100 };

  /* ── TERM_CMDS ── */
  const buildAsciiBar = (pct: number): string => { const n = Math.round(pct / 5); return "█".repeat(n) + "░".repeat(20 - n); };
  const makeTermCmds = (): Record<string, TermCmd> => ({
    help: () => ["about", "skills", "projects", "contact", "clear", "exit", "whoami"].join("  "),
    about: () => [
      "Name:     Junior Jackson Lyimo",
      "Role:     Software Developer & AI/ML Enthusiast",
      "Location: Mbeya, Tanzania 🇹🇿  (UTC+3)",
      "Status:   Open To Remote/Part-Time (20hrs/wk)",
      "Bio:      Final-year Data Science student at MUST with",
      "          1+ year professional experience building",
      "          production-grade systems at BLECA Smartlabs.",
    ].join("\n"),
    skills: () => skills.map(s => `  ${s.name.padEnd(24)} ${buildAsciiBar(s.level)} ${s.level}%`).join("\n"),
    projects: () => projects.map(p => `  [${p.num}] ${p.title}`).join("\n"),
    contact: () => [
      "Email:    jjuniorlyimo@gmail.com",
      "Phone:    +255-745-488-710",
      "GitHub:   github.com/Junior-189",
      "LinkedIn: linkedin.com/in/junior-jackson-271016393",
    ].join("\n"),
    whoami: () => "guest@junior-portfolio\nVisitor — you found the easter egg!",
    clear: () => null,
    exit: () => "__EXIT__",
  });

  const runCmd = (raw: string) => {
    const c = raw.trim().toLowerCase();
    const cmds = makeTermCmds();
    const fn = cmds[c];
    if (!fn) {
      setTermHistory(prev => [...prev, { type: "in", text: raw }, { type: "err", text: `Unknown command: '${raw}'. Type 'help' for available commands.` }]);
    } else {
      const result = fn();
      if (result === null) {
        setTermHistory([{ type: "sys", text: "Terminal cleared." }]);
      } else if (result === "__EXIT__") {
        closeTerminal();
      } else {
        setTermHistory(prev => [...prev, { type: "in", text: raw }, { type: "out", text: result }]);
      }
    }
    setTermInput("");
  };

  const openTerminal = (trigger?: HTMLElement | null) => {
    termTriggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    setTermOpen(true);
  };
  const closeTerminal = () => {
    setTermOpen(false);
    termTriggerRef.current?.focus?.();
  };

  const openPalette = (trigger?: HTMLElement | null) => {
    paletteTriggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    setPaletteQuery("");
    setPaletteIndex(0);
    setPaletteOpen(true);
  };
  const closePalette = () => {
    setPaletteOpen(false);
    paletteTriggerRef.current?.focus?.();
  };
  const filteredSections = SECTIONS.filter(s => s.toLowerCase().includes(paletteQuery.trim().toLowerCase()));
  const selectPaletteItem = (label: string) => {
    document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: "smooth" });
    closePalette();
  };

  const openProjectModal = (p: Project, trigger?: HTMLElement | null) => {
    projectTriggerRef.current = trigger ?? (document.activeElement as HTMLElement | null);
    setActiveProject(p);
  };
  const closeProjectModal = () => {
    setActiveProject(null);
    projectTriggerRef.current?.focus?.();
  };

  const finishBoot = () => {
    setBootDone(true);
    try { sessionStorage.setItem("pf_boot_shown", "1"); } catch { /* private-browsing sessionStorage can throw — non-fatal */ }
  };

  /* ── EFFECTS ── */

  /* 1. Font injection */
  useEffect(() => {
    if (document.getElementById("pf-fonts")) return;
    const link = document.createElement("link");
    link.id = "pf-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&family=Outfit:wght@300;400;600&display=swap";
    document.head.appendChild(link);
  }, []);

  /* 2. Glitch interval */
  useEffect(() => {
    const id = setInterval(() => { setGlitching(true); setTimeout(() => setGlitching(false), 600); }, 6000);
    return () => clearInterval(id);
  }, []);

  /* 3. Cursor dot tracker (mouse-capable devices only — see effect 11) */
  useEffect(() => {
    const mm = (e: MouseEvent) => { setDotPos({ x: e.clientX, y: e.clientY }); mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const mo = (e: MouseEvent) => { if ((e.target as HTMLElement).closest("a,button,[data-cur]")) setCursorHover(true); };
    const ml = () => setCursorHover(false);
    const md = () => setCursorClicking(true);
    const mu = () => setCursorClicking(false);
    window.addEventListener("mousemove", mm);
    window.addEventListener("mouseover", mo);
    window.addEventListener("mouseout", ml);
    window.addEventListener("mousedown", md);
    window.addEventListener("mouseup", mu);
    return () => { window.removeEventListener("mousemove", mm); window.removeEventListener("mouseover", mo); window.removeEventListener("mouseout", ml); window.removeEventListener("mousedown", md); window.removeEventListener("mouseup", mu); };
  }, []);

  /* 4. Ring lerp RAF */
  useEffect(() => {
    const loop = () => {
      ringRef.current = {
        x: ringRef.current.x + (mouseRef.current.x - ringRef.current.x) * 0.1,
        y: ringRef.current.y + (mouseRef.current.y - ringRef.current.y) * 0.1,
      };
      setRingPos(ringRef.current);
      ringAnimRef.current = requestAnimationFrame(loop);
    };
    ringAnimRef.current = requestAnimationFrame(loop);
    return () => { if (ringAnimRef.current) cancelAnimationFrame(ringAnimRef.current); };
  }, []);

  /* 5. Typewriter */
  useEffect(() => {
    const role = ROLES[roleIdx];
    let timer: ReturnType<typeof setTimeout>;
    if (!isDeleting && roleText.length < role.length) {
      timer = setTimeout(() => setRoleText(role.slice(0, roleText.length + 1)), 75);
    } else if (!isDeleting && roleText.length === role.length) {
      timer = setTimeout(() => setIsDeleting(true), 2200);
    } else if (isDeleting && roleText.length > 0) {
      timer = setTimeout(() => setRoleText(roleText.slice(0, -1)), 35);
    } else if (isDeleting && roleText.length === 0) {
      timer = setTimeout(() => { setIsDeleting(false); setRoleIdx((roleIdx + 1) % ROLES.length); }, 0);
    }
    return () => clearTimeout(timer);
  }, [roleText, isDeleting, roleIdx]);

  /* 6. Particle canvas */
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let w = 0, h = 0;
    const particles: Particle[] = [];
    const N = 70;
    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < N; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.5 + 0.5,
      });
    }
    const loop = () => {
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      for (const p of particles) {
        const dx = mx - p.x, dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) { p.vx += (dx / dist) * -0.3; p.vy += (dy / dist) * -0.3; }
        p.vx *= 0.99; p.vy *= 0.99;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = inverted ? `rgba(255,255,255,${0.12 + (dist < 130 ? (1 - dist / 130) * 0.4 : 0)})` : `rgba(0,0,0,${0.08 + (dist < 130 ? (1 - dist / 130) * 0.25 : 0)})`;
        ctx.fill();
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const d = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
          if (d < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = inverted ? `rgba(255,255,255,${0.03 * (1 - d / 110)})` : `rgba(0,0,0,${0.03 * (1 - d / 110)})`;
            ctx.stroke();
          }
        }
      }
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); };
  }, [inverted]);

  /* 7. Scroll reveal + scroll progress bar */
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).dataset.sec;
          if (id) setRevealed(prev => { const next = new Set(prev); next.add(id); return next; });
        }
      }
    }, { threshold: 0.12 });
    Object.values(sectionRefs.current).forEach(el => { if (el) obs.observe(el); });

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setScrollPct(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  /* 8. Global keyboard shortcuts + focus traps for every modal
   * (boot skip, terminal, quick-nav palette, project case-study). */
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (!bootDone) { finishBoot(); return; } // any key during boot skips straight to the hero

      const isMetaK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isMetaK) {
        e.preventDefault();
        if (paletteOpen) closePalette();
        else if (!termOpen && !activeProject) openPalette();
        return;
      }

      if (!paletteOpen && !activeProject) {
        if (e.key === "`") { e.preventDefault(); if (termOpen) { closeTerminal(); } else { openTerminal(); } }
        if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") { e.preventDefault(); if (termOpen) { closeTerminal(); } else { openTerminal(); } }
      }

      if (e.key === "Escape") {
        if (paletteOpen) closePalette();
        else if (activeProject) closeProjectModal();
        else if (termOpen) closeTerminal();
      }

      if (e.key === "Tab") {
        if (termOpen) {
          /* only two focusable elements inside the terminal: the close
           * button and the input — keep Tab cycling between them so
           * focus never escapes to the page behind the overlay. */
          const focusables = [termCloseRef.current, termInputRef.current].filter(Boolean) as HTMLElement[];
          if (focusables.length >= 2) {
            const first = focusables[0], last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
          }
        } else if (paletteOpen && paletteModalRef.current) {
          trapTabWithin(e, paletteModalRef.current);
        } else if (activeProject && projectModalRef.current) {
          trapTabWithin(e, projectModalRef.current);
        }
      }

      if (paletteOpen) {
        if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex(i => Math.min(i + 1, Math.max(filteredSections.length - 1, 0))); }
        if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex(i => Math.max(i - 1, 0)); }
        if (e.key === "Enter" && filteredSections[paletteIndex]) { e.preventDefault(); selectPaletteItem(filteredSections[paletteIndex]); }
      }
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termOpen, paletteOpen, activeProject, paletteIndex, paletteQuery, bootDone]);

  /* 9. Terminal / palette / project-modal auto-scroll + focus */
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [termHistory]);
  useEffect(() => { if (termOpen) setTimeout(() => termInputRef.current?.focus(), 80); }, [termOpen]);
  useEffect(() => { if (paletteOpen) setTimeout(() => paletteInputRef.current?.focus(), 80); }, [paletteOpen]);
  useEffect(() => { if (activeProject) setTimeout(() => projectCloseRef.current?.focus(), 80); }, [activeProject]);

  /* 10. Local CMS fetch — replaces the old Sanity integration. Always
   * attempts a fetch; silently keeps the static fallback data above if
   * the backend isn't reachable or returns nothing. cmsSyncing drives
   * the small "syncing" indicator on the Skills/Projects section labels
   * while this is in flight. */
  useEffect(() => {
    Promise.all([fetchSkills(), fetchProjects(), fetchExperience(), fetchBio(), fetchProfile()])
      .then(([sk, pr, ex, bi, pf]) => {
        if (sk?.length) setSkills(sk);
        if (pr?.length) setProjects(pr.map((p, i) => ({ id: p.id ?? i + 1, num: p.num, title: p.title, desc: p.desc, stack: p.stack || [], lines: seededLines(p.title), githubUrl: p.githubUrl ?? undefined, liveUrl: p.liveUrl ?? undefined })));
        if (ex?.length) setExperience(ex);
        if (bi) setBioData({ heading: bi.heading, paragraph1: bi.paragraph1, paragraph2: bi.paragraph2, stats: (bi.stats || []).map(s => [s.value, s.label] as [string, string]) });
        if (pf) setProfile({ name: pf.name, email: pf.email, githubUrl: pf.githubUrl, linkedinUrl: pf.linkedinUrl, footerNote: pf.footerNote });
      })
      .finally(() => setCmsSyncing(false));
  }, []);

  /* 10b. Boot-sequence timer — advances one line at a time, then hands
   * off to the normal hero. Skippable at any point via finishBoot()
   * (wired to a click on the overlay and to any keypress in effect 8). */
  useEffect(() => {
    if (bootDone) return;
    if (bootLineIdx >= BOOT_LINES.length) {
      const t = setTimeout(finishBoot, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBootLineIdx(i => i + 1), 300);
    return () => clearTimeout(t);
  }, [bootLineIdx, bootDone]);

  /* 11. Disable the custom cursor on touch/coarse-pointer devices — the
   * mouse listeners above never fire there, so without this the native
   * cursor stays hidden with no custom one ever drawn in its place. */
  const [hasFinePointer, setHasFinePointer] = useState(() => (
    typeof window === "undefined" ? true : window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ));
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = () => setHasFinePointer(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* close mobile nav on route/hash change */
  useEffect(() => {
    const onHash = () => setNavOpen(false);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* ── cursor compute ── */
  const ringSize = cursorClicking ? 28 : cursorHover ? 52 : 36;
  const ringOpacity = cursorHover ? 0.75 : 0.55;

  /* ── RENDER ── */
  return (
    <div style={{ cursor: hasFinePointer ? "none" : "auto", background: BG, color: FG, minHeight: "100vh", fontFamily: F_BODY, position: "relative", overflowX: "hidden", transition: "background 0.35s, color 0.35s" }}>
      {/* injected style */}
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        ${hasFinePointer ? "*{cursor:none!important}" : ""}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:${BG}}
        ::-webkit-scrollbar-thumb{background:${MUTED};border-radius:1.5px}
        @keyframes gridScroll{from{background-position:0 0}to{background-position:60px 60px}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes glitchA{0%,100%{clip-path:inset(40% 0 30% 0);transform:translate(0)}10%{clip-path:inset(15% 0 70% 0);transform:translate(-4px,2px)}20%{clip-path:inset(60% 0 10% 0);transform:translate(4px,-1px)}30%{clip-path:inset(10% 0 80% 0);transform:translate(-2px,-3px)}40%{clip-path:inset(75% 0 5% 0);transform:translate(3px,1px)}}
        @keyframes glitchB{0%,100%{opacity:0}20%{opacity:0.6;clip-path:inset(30% 0 50% 0);transform:translate(-2px,1px)}40%{opacity:0}60%{opacity:0.5;clip-path:inset(50% 0 30% 0);transform:translate(2px,-1px)}80%{opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scrollLine{0%,100%{height:0;opacity:0}50%{height:40px;opacity:0.5}}
        @keyframes slideRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        .nav-a:hover{color:${FG}!important}
        .proj-card:hover{background:${inverted ? "#1a1a1a" : "#eee"}}
        .outline-link:hover{color:${FG}!important;border-color:${FG}!important}
        .cv-btn:hover{opacity:0.8}
        .pf-hamburger{display:none}
        .pf-nav-links{display:flex;align-items:center;gap:24px}
        .pf-photo-frame{cursor:pointer}
        .pf-photo-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:opacity 0.45s ease}

        @media (max-width: 860px){
          .pf-about-grid{grid-template-columns:1fr!important}
          .pf-skills-grid{grid-template-columns:1fr!important}
          .pf-projects-grid{grid-template-columns:1fr!important}
          .pf-about-grid > div:first-child{max-width:280px;margin:0 auto}
        }
        @media (max-width: 700px){
          nav{padding:14px 20px!important}
          .pf-nav-links{
            display:${navOpen ? "flex" : "none"};
            position:absolute;top:100%;left:0;right:0;flex-direction:column;
            align-items:flex-start;gap:0;background:${BG};border-bottom:1px solid ${BORDER};
            padding:8px 20px 18px;
          }
          .pf-nav-links > *{width:100%;padding:12px 0!important;border-bottom:1px solid ${BORDER};}
          .pf-hamburger{display:flex!important}
          section{padding-left:20px!important;padding-right:20px!important}
          #hero{padding-left:20px!important;padding-right:20px!important}
          footer{padding-left:20px!important;padding-right:20px!important;flex-direction:column;align-items:flex-start!important}
        }
        @media (max-width: 480px){
          .pf-stats-grid{grid-template-columns:1fr!important}
          .pf-hero-actions{flex-direction:column;align-items:stretch!important}
        }
      `}</style>

      {/* scroll progress bar */}
      <div aria-hidden style={{ position:"fixed",top:0,left:0,height:2,width:`${scrollPct}%`,background:FG,zIndex:150,transition:"width 0.1s linear" }} />

      {hasFinePointer && (
        <>
          {/* cursor dot */}
          <div aria-hidden style={{ position:"fixed",zIndex:9999,left:dotPos.x,top:dotPos.y,width:cursorHover?0:cursorClicking?4:7,height:cursorHover?0:cursorClicking?4:7,background:FG,borderRadius:"50%",pointerEvents:"none",transform:"translate(-50%,-50%)",transition:"width 0.15s,height 0.15s",opacity:cursorHover?0:1 }} />
          {/* cursor ring */}
          <div aria-hidden style={{ position:"fixed",zIndex:9998,left:ringPos.x,top:ringPos.y,width:ringSize,height:ringSize,border:`1.5px solid ${FG}`,borderRadius:"50%",pointerEvents:"none",transform:"translate(-50%,-50%)",transition:"width 0.2s,height 0.2s,border-color 0.2s",background:cursorHover?`${FG}10`:"transparent",opacity:ringOpacity }} />
        </>
      )}

      {/* particle canvas */}
      <canvas ref={canvasRef} aria-hidden style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none" }} />

      {/* grid bg */}
      <div aria-hidden style={{ position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none" }}>
        <div style={{ position:"absolute",inset:-120,backgroundImage:`linear-gradient(${inverted?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${inverted?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 1px, transparent 1px)`,backgroundSize:"60px 60px",animation:"gridScroll 25s linear infinite",opacity:inverted?0.25:0.35 }} />
      </div>

      {/* navbar */}
      <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 40px",background:`${BG}dd`,backdropFilter:"blur(12px)",borderBottom:`1px solid ${BORDER}` }}>
        <a href="#" data-cur style={{ fontFamily:F_MONO,fontSize:20,fontWeight:700,color:FG,textDecoration:"none",letterSpacing:2 }}>JJL.DEV</a>

        <button
          data-cur
          className="pf-hamburger"
          aria-label={navOpen ? "Close menu" : "Open menu"}
          aria-expanded={navOpen}
          onClick={() => setNavOpen(v => !v)}
          style={{ background:"none",border:`1px solid ${BORDER}`,color:FG,width:38,height:38,alignItems:"center",justifyContent:"center",cursor:"pointer" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FG} strokeWidth="2" strokeLinecap="round">
            {navOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
          </svg>
        </button>

        <div className="pf-nav-links">
          {SECTIONS.map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} data-cur className="nav-a" onClick={() => setNavOpen(false)} style={{ fontFamily:F_MONO,fontSize:13,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"color 0.3s" }}>{l}</a>
          ))}
          <a data-cur href={CV_URL} download className="cv-btn" style={{ fontFamily:F_MONO,fontSize:12,border:`1px solid ${FG}`,background:FG,color:BG,padding:"6px 16px",textDecoration:"none",textTransform:"uppercase",letterSpacing:1,transition:"opacity 0.3s" }}>↓ CV</a>
          <button data-cur onClick={(e) => openPalette(e.currentTarget)} aria-label="Open quick navigation (Ctrl+K)" style={{ fontFamily:F_MONO,fontSize:12,background:"none",border:`1px solid ${BORDER}`,color:MUTED,padding:"6px 16px",cursor:"pointer" }}>⌘K</button>
          <button data-cur onClick={(e) => openTerminal(e.currentTarget)} style={{ fontFamily:F_MONO,fontSize:12,background:"none",border:`1px solid ${BORDER}`,color:MUTED,padding:"6px 16px",cursor:"pointer" }}>~/terminal</button>
          <button data-cur onClick={() => setInverted(!inverted)} style={{ fontFamily:F_MONO,fontSize:12,background:"none",border:`1px solid ${BORDER}`,color:MUTED,padding:"6px 16px",cursor:"pointer",textTransform:"uppercase",letterSpacing:1 }}>{inverted?"◑ DARK":"◐ LIGHT"}</button>
        </div>
      </nav>

      {/* main */}
      <main>

        {/* ═══ HERO ═══ */}
        <section id="hero" style={{ minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"120px 40px 100px",position:"relative",zIndex:2,maxWidth:900,margin:"0 auto",width:"100%" }}>
          <p style={{ fontFamily:F_MONO,fontSize:14,color:MUTED,marginBottom:24,animation:"fadeUp 1s ease" }}>&gt; Hello, world. I&apos;m Junior Jackson.</p>
          <h1 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(52px,11vw,150px)",fontWeight:400,lineHeight:0.9,color:FG,position:"relative",marginBottom:24 }}>
            JUNIOR JACKSON<span style={{ display:"block",marginTop:4 }}>LYIMO</span>
            {glitching && (
              <span aria-hidden style={{ position:"absolute",top:0,left:0,right:0,bottom:0,fontFamily:"inherit",fontSize:"inherit",fontWeight:"inherit",lineHeight:"inherit",color:inverted?"#0ff":"#f00",opacity:0.65,animation:"glitchA 0.6s infinite",textShadow:`2px 0 ${inverted?"#f0f":"#00f"}, -2px 0 ${inverted?"#ff0":"#0f0"}` }}>JUNIOR JACKSON<br/>LYIMO</span>
            )}
          </h1>
          <p style={{ fontFamily:F_MONO,fontSize:18,color:MUTED,minHeight:28,marginBottom:16 }}>
            {roleText}<span style={{ animation:"blink 1s infinite",fontWeight:300 }}>|</span>
          </p>
          <p style={{ fontSize:15,lineHeight:1.7,color:MUTED,maxWidth:560,marginBottom:36 }}>
            Building AI-integrated and IoT-enabled systems that connect the physical world to the digital from sensor firmware to real-time dashboards.
          </p>
          <div className="pf-hero-actions" style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
            <a data-cur href="#projects" style={{ fontFamily:F_MONO,fontSize:13,padding:"14px 32px",background:FG,color:BG,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,fontWeight:600,transition:"opacity 0.3s" }}>VIEW WORK</a>
            <a data-cur href="#contact" style={{ fontFamily:F_MONO,fontSize:13,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s" }}>CONTACT ME</a>
            <a data-cur href={CV_URL} download style={{ fontFamily:F_MONO,fontSize:13,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s",display:"inline-flex",alignItems:"center",gap:8 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/></svg>
              DOWNLOAD CV
            </a>
          </div>
          <div aria-hidden style={{ position:"absolute",bottom:50,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
            <span style={{ fontFamily:F_MONO,fontSize:10,color:MUTED,letterSpacing:3,textTransform:"uppercase" }}>SCROLL</span>
            <div style={{ width:1,background:MUTED,animation:"scrollLine 2s ease-in-out infinite" }} />
          </div>
        </section>

        {/* ═══ ABOUT ═══ */}
        <section id="about" data-sec="about" ref={el => { sectionRefs.current.about = el; }} style={{ ...sectionBorder, ...reveal("about"), maxWidth:1100,margin:"0 auto",padding:"0 40px 100px",position:"relative",zIndex:2 }}>
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8 }}>01 / ABOUT</p>
          <div className="pf-about-grid" style={{ display:"grid",gridTemplateColumns:"260px 1fr",gap:60,alignItems:"start" }}>
            {/* photo — hover/tap to flip between portrait and field shot */}
            <div>
              <div
                className="pf-photo-frame"
                data-cur
                onMouseEnter={() => { if (hasFinePointer) setPhotoFlipped(true); }}
                onMouseLeave={() => { if (hasFinePointer) setPhotoFlipped(false); }}
                onClick={() => { if (!hasFinePointer) setPhotoFlipped(v => !v); }}
                role="button"
                tabIndex={0}
                aria-label="Toggle between portrait and field photo"
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPhotoFlipped(v => !v); } }}
                style={{ position:"relative",paddingBottom:"125%",background:CARD,border:`1px solid ${BORDER}`,overflow:"hidden" }}
              >
                <img src="/junior-portrait.jpeg" alt="Junior Jackson Lyimo, portrait" className="pf-photo-img" style={{ opacity: photoFlipped ? 0 : 1 }} />
                <img src="/junior-field.jpg" alt="Junior Jackson Lyimo working in the field on an IoT hardware setup" className="pf-photo-img" style={{ opacity: photoFlipped ? 1 : 0 }} />
                {CORNERS.map((c, i) => (
                  <span key={i} aria-hidden style={{ position:"absolute",top:c.top,bottom:c.bottom,left:c.left,right:c.right,width:22,height:22,borderTop:c.borderTop?`1px solid ${MUTED}`:undefined,borderBottom:c.borderBottom?`1px solid ${MUTED}`:undefined,borderLeft:c.borderLeft?`1px solid ${MUTED}`:undefined,borderRight:c.borderRight?`1px solid ${MUTED}`:undefined,zIndex:2 }} />
                ))}
              </div>
              <p style={{ fontFamily:F_MONO,fontSize:13,fontWeight:700,color:FG,marginTop:16,textAlign:"center" }}>JUNIOR JACKSON LYIMO</p>
              <p style={{ fontFamily:F_MONO,fontSize:10,color:MUTED,textAlign:"center",textTransform:"uppercase",letterSpacing:2,minHeight:28 }}>
                {photoFlipped ? "IN THE FIELD · TESTING HARDWARE" : "SOFTWARE DEVELOPER · MBEYA, TZ"}
              </p>
            </div>
            {/* bio */}
            <div>
              <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(28px,4vw,40px)",fontWeight:400,color:FG,lineHeight:1.15,marginBottom:20 }}>{bioData.heading}</h2>
              <p style={{ fontSize:15,lineHeight:1.8,color:MUTED,marginBottom:16 }}>{bioData.paragraph1}</p>
              <p style={{ fontSize:15,lineHeight:1.8,color:MUTED,marginBottom:28 }}>{bioData.paragraph2}</p>
              <div style={{ display:"inline-flex",alignItems:"center",gap:10,padding:"10px 18px",border:`1px solid ${BORDER}`,borderRadius:6,marginBottom:32 }}>
                <span aria-hidden style={{ width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0 }} />
                <span style={{ fontFamily:F_MONO,fontSize:11,color:FG }}>AVAILABLE FOR OPPORTUNITIES</span>
              </div>
              <div className="pf-stats-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
                {bioData.stats.map(([v,l], i) => (
                  <div key={i} style={{ padding:"20px 16px",background:CARD,border:`1px solid ${BORDER}` }}>
                    <div style={{ fontFamily:F_DISPLAY,fontSize:40,color:FG,lineHeight:1 }}>{v}</div>
                    <div style={{ fontFamily:F_MONO,fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:1,marginTop:6 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SKILLS ═══ */}
        <section id="skills" data-sec="skills" ref={el => { sectionRefs.current.skills = el; }} style={{ ...sectionBorder, ...reveal("skills"), maxWidth:1100,margin:"0 auto",padding:"0 40px 100px",position:"relative",zIndex:2 }}>
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8,display:"flex",alignItems:"center",gap:10 }}>
            02 / SKILLS
            {cmsSyncing && <span aria-live="polite" style={{ display:"inline-flex",alignItems:"center",gap:6 }}><span aria-hidden style={{ width:6,height:6,borderRadius:"50%",background:MUTED,animation:"blink 1s infinite" }} /><span>syncing</span></span>}
          </p>
          <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(32px,5vw,48px)",fontWeight:400,color:FG,marginBottom:40 }}>Tech Stack</h2>
          <div className="pf-skills-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
            {skills.map((s, i) => (
              <div key={i} data-cur onMouseEnter={() => setHovSkill(i)} onMouseLeave={() => setHovSkill(null)}
                style={{
                  padding:"18px 20px",border:`1px solid ${hoveredMatch(hovSkill, i) ? FG : BORDER}`,
                  background:hoveredMatch(hovSkill, i) ? CARD : "transparent",cursor:"pointer",
                  transition:"border-color 0.3s, background 0.3s",
                }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10 }}>
                  <span style={{ fontFamily:F_MONO,fontSize:13,fontWeight:600,color:FG }}>{s.name}</span>
                  <span style={{ fontFamily:F_MONO,fontSize:11,color:MUTED }}>{s.years}yr · {s.level}%</span>
                </div>
                <div style={{ height:2,background:BORDER,borderRadius:1,overflow:"hidden" }}>
                  <div style={{ height:"100%",background:FG,borderRadius:1,width:revealed.has("skills")?`${s.level}%`:"0%",transition:`width 1.3s cubic-bezier(0.4,0,0.2,1) ${i*0.08}s` }} />
                </div>
                <div style={{ maxHeight:hovSkill===i?60:0,overflow:"hidden",transition:"max-height 0.3s ease" }}>
                  <p style={{ fontFamily:F_BODY,fontSize:13,color:MUTED,marginTop:12,lineHeight:1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ PROJECTS ═══ */}
        <section id="projects" data-sec="projects" ref={el => { sectionRefs.current.projects = el; }} style={{ ...sectionBorder, ...reveal("projects"), maxWidth:1100,margin:"0 auto",padding:"0 40px 100px",position:"relative",zIndex:2 }}>
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8,display:"flex",alignItems:"center",gap:10 }}>
            03 / PROJECTS
            {cmsSyncing && <span aria-live="polite" style={{ display:"inline-flex",alignItems:"center",gap:6 }}><span aria-hidden style={{ width:6,height:6,borderRadius:"50%",background:MUTED,animation:"blink 1s infinite" }} /><span>syncing</span></span>}
          </p>
          <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(32px,5vw,48px)",fontWeight:400,color:FG,marginBottom:40 }}>Selected Work</h2>
          <div className="pf-projects-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:BORDER }}>
            {projects.map((p, i) => (
              <div key={p.id as number} data-cur className="proj-card"
                role="button"
                tabIndex={0}
                aria-label={`View case study: ${p.title}`}
                onMouseEnter={() => setHovProject(i)}
                onMouseLeave={() => { setHovProject(null); setTilt(null); }}
                onMouseMove={(e) => {
                  if (!hasFinePointer) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const px = (e.clientX - rect.left) / rect.width - 0.5;
                  const py = (e.clientY - rect.top) / rect.height - 0.5;
                  setTilt({ i, rx: py * -7, ry: px * 7 });
                }}
                onClick={(e) => { if ((e.target as HTMLElement).closest("a")) return; openProjectModal(p, e.currentTarget); }}
                onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !(e.target as HTMLElement).closest("a")) { e.preventDefault(); openProjectModal(p, e.currentTarget); } }}
                style={{
                  background:BG,padding:0,overflow:"hidden",position:"relative",cursor:"pointer",minHeight:320,
                  transform: tilt && tilt.i === i ? `perspective(700px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale3d(1.015,1.015,1.015)` : "perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
                  transition: tilt && tilt.i === i ? "transform 0.08s linear" : "transform 0.4s ease, background 0.3s",
                }}>
                <div style={{ padding:"28px 28px 100px" }}>
                  <div style={{ fontFamily:F_MONO,fontSize:11,color:MUTED,marginBottom:6 }}>{p.num}</div>
                  <h3 style={{ fontFamily:F_DISPLAY,fontSize:26,fontWeight:400,color:FG,lineHeight:1.1,marginBottom:12 }}>{p.title}</h3>
                  <p style={{ fontSize:13,lineHeight:1.7,color:MUTED,marginBottom:16 }}>{p.desc}</p>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:16 }}>
                    {p.stack.map((t, j) => (
                      <span key={j} style={{ fontFamily:F_MONO,fontSize:10,padding:"4px 10px",border:`1px solid ${BORDER}`,color:MUTED,textTransform:"uppercase",letterSpacing:1 }}>{t}</span>
                    ))}
                  </div>
                  {(p.githubUrl || p.liveUrl) && (
                    <div style={{ display:"flex",gap:20 }}>
                      {p.githubUrl && <a data-cur href={p.githubUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily:F_MONO,fontSize:11,color:MUTED,textDecoration:"underline",textUnderlineOffset:4,textTransform:"uppercase",letterSpacing:1 }}>GitHub ↗</a>}
                      {p.liveUrl && <a data-cur href={p.liveUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily:F_MONO,fontSize:11,color:FG,textDecoration:"underline",textUnderlineOffset:4,textTransform:"uppercase",letterSpacing:1 }}>Live Demo ↗</a>}
                    </div>
                  )}
                </div>
                {/* MockPreview slides in from right */}
                <div aria-hidden style={{ position:"absolute",top:20,right:hovProject===i?20:-130,width:140,opacity:hovProject===i?1:0,transition:"right 0.4s ease, opacity 0.3s ease",pointerEvents:"none" }}>
                  <MockPreview lines={p.lines} fg={FG} border={BORDER} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ EXPERIENCE ═══ */}
        <section id="experience" data-sec="experience" ref={el => { sectionRefs.current.experience = el; }} style={{ ...sectionBorder, ...reveal("experience"), maxWidth:1100,margin:"0 auto",padding:"0 40px 100px",position:"relative",zIndex:2 }}>
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8 }}>04 / EXPERIENCE</p>
          <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(32px,5vw,48px)",fontWeight:400,color:FG,marginBottom:40 }}>Career Timeline</h2>
          <div className="pf-timeline" style={{ display:"grid",gridTemplateColumns:"24px 1fr",columnGap:20 }}>
            {experience.map((e, i) => (
              <Fragment key={i}>
                <div aria-hidden style={{ position:"relative" }}>
                  {i < experience.length-1 && (
                    <span style={{ position:"absolute",left:"50%",top:12,bottom:-6,transform:"translateX(-50%)",width:1,background:BORDER }} />
                  )}
                  <span style={{ position:"absolute",left:"50%",top:6,transform:"translateX(-50%)",width:11,height:11,borderRadius:"50%",background:FG,boxShadow:`0 0 0 4px ${BG}` }} />
                </div>
                <div style={{ ...reveal("experience"), transitionDelay:`${i*0.18}s`, paddingBottom:i<experience.length-1?40:0 }}>
                  <span style={{ display:"inline-block",fontFamily:F_MONO,fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:2,padding:"4px 10px",border:`1px solid ${BORDER}`,background:CARD,marginBottom:12 }}>{e.year}</span>
                  <h3 style={{ fontFamily:F_DISPLAY,fontSize:24,fontWeight:400,color:FG,margin:"0 0 2px" }}>{e.role}</h3>
                  <p style={{ fontFamily:F_MONO,fontSize:13,color:MUTED,marginBottom:10 }}>{e.company}</p>
                  <p style={{ fontSize:14,lineHeight:1.7,color:MUTED }}>{e.desc}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        {/* ═══ CONTACT ═══ */}
        <section id="contact" data-sec="contact" ref={el => { sectionRefs.current.contact = el; }} style={{ ...sectionBorder, ...reveal("contact"), maxWidth:1100,margin:"0 auto",padding:"0 40px 100px",position:"relative",zIndex:2 }}>
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8 }}>05 / CONTACT</p>
          <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(44px,7vw,80px)",fontWeight:400,color:FG,lineHeight:1.05,marginBottom:20 }}>Let&apos;s build<br/>something great.</h2>
          <p style={{ fontSize:15,lineHeight:1.7,color:MUTED,maxWidth:500,marginBottom:40 }}>
            I&apos;m currently available for remote and part-time opportunities — up to 20 hours per week in the UTC+3 timezone. If you have a project, an idea, or just want to connect, reach out.
          </p>
          <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
            <a data-cur href={`mailto:${profile.email}`} style={{ fontFamily:F_MONO,fontSize:14,padding:"14px 32px",background:FG,color:BG,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,fontWeight:600,transition:"opacity 0.3s" }}>{profile.email}</a>
            <a data-cur href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="outline-link" style={{ fontFamily:F_MONO,fontSize:14,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s" }}>GitHub ↗</a>
            <a data-cur href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="outline-link" style={{ fontFamily:F_MONO,fontSize:14,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s" }}>LinkedIn ↗</a>
            <a data-cur href={CV_URL} download className="outline-link" style={{ fontFamily:F_MONO,fontSize:14,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s" }}>↓ DOWNLOAD CV</a>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ ...sectionBorder, maxWidth:1100,margin:"0 auto",padding:"40px 40px",position:"relative",zIndex:2,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
          <p style={{ fontFamily:F_MONO,fontSize:11,color:MUTED }}>© 2026 {profile.name} — {profile.footerNote}</p>
          <p style={{ fontFamily:F_MONO,fontSize:11,color:MUTED }}>
            press <kbd style={{ padding:"2px 6px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:3,fontSize:10 }}>`</kbd> for terminal ·{" "}
            <kbd style={{ padding:"2px 6px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:3,fontSize:10 }}>⌘K</kbd> to jump around
          </p>
        </footer>

      </main>

      {/* ═══ TERMINAL ═══ */}
      {termOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeTerminal(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Portfolio terminal"
          style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeUp 0.3s ease" }}
        >
          <div style={{ width:"min(90vw,660px)",maxHeight:"75vh",background:"#0d0d0d",border:"1px solid #333",borderRadius:8,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* title bar */}
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"#1a1a1a",borderBottom:"1px solid #333" }}>
              <span aria-hidden style={{ width:11,height:11,borderRadius:"50%",background:"#ff5f57" }} />
              <span aria-hidden style={{ width:11,height:11,borderRadius:"50%",background:"#ffbd2e" }} />
              <span aria-hidden style={{ width:11,height:11,borderRadius:"50%",background:"#28ca41" }} />
              <span style={{ fontFamily:F_MONO,fontSize:11,color:"#666",marginLeft:8 }}>junior@portfolio:~$</span>
              <span
                ref={termCloseRef}
                role="button"
                tabIndex={0}
                aria-label="Close terminal"
                onClick={closeTerminal}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeTerminal(); } }}
                style={{ marginLeft:"auto",cursor:"pointer",color:"#666",fontSize:18,lineHeight:1,fontFamily:"sans-serif" }}
              >✕</span>
            </div>
            {/* body */}
            <div style={{ flex:1,overflow:"auto",padding:16,fontFamily:F_MONO,fontSize:13,lineHeight:1.85,maxHeight:400 }}>
              {termHistory.map((h, i) => (
                <div key={i} style={{ marginBottom:2 }}>
                  {h.type === "in" && <div><span style={{ color:"#0f0" }}>~$</span> <span style={{ color:"#eee" }}>{h.text}</span></div>}
                  {h.type === "out" && h.text.split("\n").map((l, j) => <div key={j} style={{ color:"#aaa",whiteSpace:"pre" }}>{l}</div>)}
                  {h.type === "sys" && <div style={{ color:"#555" }}>{h.text}</div>}
                  {h.type === "err" && <div style={{ color:"#f66" }}>{h.text}</div>}
                </div>
              ))}
              <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:2 }}>
                <span style={{ color:"#0f0" }}>~$</span>
                <label htmlFor="pf-term-input" style={{ position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)" }}>Terminal command input</label>
                <input id="pf-term-input" ref={termInputRef} value={termInput} onChange={e => setTermInput(e.target.value)} onKeyDown={e => { if (e.key==="Enter"&&termInput.trim()) runCmd(termInput); }} style={{ flex:1,background:"none",border:"none",color:"#eee",fontFamily:F_MONO,fontSize:13,outline:"none",caretColor:"#0f0" }} autoFocus />
              </div>
              <div ref={termEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ═══ QUICK-NAV PALETTE (Cmd/Ctrl+K) ═══ */}
      {paletteOpen && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closePalette(); }}
          role="dialog"
          aria-modal="true"
          aria-label="Quick navigation"
          style={{ position:"fixed",inset:0,zIndex:210,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"14vh",animation:"fadeUp 0.2s ease" }}
        >
          <div ref={paletteModalRef} style={{ width:"min(90vw,480px)",background:BG,color:FG,border:`1px solid ${BORDER}`,borderRadius:8,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,padding:"14px 16px",borderBottom:`1px solid ${BORDER}` }}>
              <span aria-hidden style={{ fontFamily:F_MONO,fontSize:14,color:MUTED }}>⌘K</span>
              <label htmlFor="pf-palette-input" style={{ position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)" }}>Jump to section</label>
              <input
                id="pf-palette-input"
                ref={paletteInputRef}
                value={paletteQuery}
                onChange={e => { setPaletteQuery(e.target.value); setPaletteIndex(0); }}
                placeholder="Jump to a section…"
                style={{ flex:1,background:"none",border:"none",color:FG,fontFamily:F_MONO,fontSize:14,outline:"none" }}
              />
              <span
                role="button"
                tabIndex={0}
                aria-label="Close quick navigation"
                onClick={closePalette}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closePalette(); } }}
                style={{ cursor:"pointer",color:MUTED,fontSize:16,lineHeight:1 }}
              >✕</span>
            </div>
            <div role="listbox" aria-label="Sections" style={{ maxHeight:280,overflow:"auto" }}>
              {filteredSections.length === 0 && (
                <p style={{ padding:"20px 16px",fontFamily:F_MONO,fontSize:13,color:MUTED }}>No matching section.</p>
              )}
              {filteredSections.map((label, i) => (
                <div
                  key={label}
                  role="option"
                  aria-selected={i === paletteIndex}
                  data-cur
                  onMouseEnter={() => setPaletteIndex(i)}
                  onClick={() => selectPaletteItem(label)}
                  style={{ padding:"12px 16px",fontFamily:F_MONO,fontSize:13,color:i === paletteIndex ? FG : MUTED,background:i === paletteIndex ? CARD : "transparent",cursor:"pointer",display:"flex",justifyContent:"space-between" }}
                >
                  <span>{label}</span>
                  <span aria-hidden style={{ color:MUTED }}>↵</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PROJECT CASE-STUDY MODAL ═══ */}
      {activeProject && (
        <div
          onClick={e => { if (e.target === e.currentTarget) closeProjectModal(); }}
          role="dialog"
          aria-modal="true"
          aria-label={`${activeProject.title} case study`}
          style={{ position:"fixed",inset:0,zIndex:210,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,animation:"fadeUp 0.25s ease" }}
        >
          <div ref={projectModalRef} style={{ width:"min(92vw,640px)",maxHeight:"85vh",overflow:"auto",background:BG,color:FG,border:`1px solid ${BORDER}`,borderRadius:8,boxShadow:"0 20px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"20px 24px",borderBottom:`1px solid ${BORDER}` }}>
              <div>
                <span style={{ fontFamily:F_MONO,fontSize:11,color:MUTED }}>{activeProject.num}</span>
                <h3 style={{ fontFamily:F_DISPLAY,fontSize:32,fontWeight:400,color:FG,lineHeight:1.05,marginTop:4 }}>{activeProject.title}</h3>
              </div>
              <span
                ref={projectCloseRef}
                role="button"
                tabIndex={0}
                aria-label="Close case study"
                onClick={closeProjectModal}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeProjectModal(); } }}
                style={{ cursor:"pointer",color:MUTED,fontSize:20,lineHeight:1,flexShrink:0,marginLeft:16 }}
              >✕</span>
            </div>
            <div style={{ padding:"24px" }}>
              <div style={{ width:"100%",maxWidth:280,margin:"0 auto 24px",aspectRatio:"3/2" }}>
                <MockPreview lines={activeProject.lines} fg={FG} border={BORDER} />
              </div>
              <p style={{ fontSize:15,lineHeight:1.8,color:MUTED,marginBottom:20 }}>{activeProject.desc}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:24 }}>
                {activeProject.stack.map((t, j) => (
                  <span key={j} style={{ fontFamily:F_MONO,fontSize:11,padding:"5px 12px",border:`1px solid ${BORDER}`,color:MUTED,textTransform:"uppercase",letterSpacing:1 }}>{t}</span>
                ))}
              </div>
              {(activeProject.githubUrl || activeProject.liveUrl) && (
                <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
                  {activeProject.githubUrl && <a data-cur href={activeProject.githubUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily:F_MONO,fontSize:13,padding:"12px 24px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:1 }}>GitHub ↗</a>}
                  {activeProject.liveUrl && <a data-cur href={activeProject.liveUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily:F_MONO,fontSize:13,padding:"12px 24px",background:FG,color:BG,textDecoration:"none",textTransform:"uppercase",letterSpacing:1 }}>Live Demo ↗</a>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ BOOT-SEQUENCE INTRO ═══ */}
      {!bootDone && (
        <div
          onClick={finishBoot}
          role="status"
          aria-live="polite"
          aria-label="Loading portfolio"
          style={{ position:"fixed",inset:0,zIndex:300,background:"#000",color:"#0f0",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 40px",fontFamily:F_MONO,fontSize:14,cursor:"pointer" }}
        >
          {BOOT_LINES.slice(0, Math.min(bootLineIdx + 1, BOOT_LINES.length)).map((l, i) => (
            <div key={i} style={{ marginBottom:8, animation:"fadeUp 0.3s ease" }}>{`> ${l}`}</div>
          ))}
          <p style={{ position:"absolute",bottom:30,left:40,fontSize:11,color:"#0a0",letterSpacing:1 }}>press any key or click to skip</p>
        </div>
      )}
    </div>
  );
}

/* helper */
function hoveredMatch(hov: number | null, idx: number) { return hov === idx; }
