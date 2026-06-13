import { useState, useEffect, useRef, type CSSProperties } from "react";
import { sanityClient } from "./sanity/client";

/* local groq tagged template (behaves identically to @sanity/client's groq) */
const groq = (strs: TemplateStringsArray, ...vals: string[]) => strs.reduce((a, s, i) => a + s + (vals[i] || ""), "");

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
interface MockPreviewProps { lines: number[]; fg: string; bg: string; border: string; }
interface CornerBracket { top?: number; bottom?: number; left?: number; right?: number; borderTop: boolean; borderBottom: boolean; borderLeft: boolean; borderRight: boolean; }

/* ──────────────────────── SANITY CMS LAYER ──────────────────────── */

interface SanitySkill   { _id: string; name: string; years: number; level: number; desc: string; }
interface SanityProject { _id: string; num: string; title: string; desc: string; stack: string[]; githubUrl?: string; liveUrl?: string; }
interface SanityExp     { _id: string; year: string; role: string; company: string; desc: string; }
interface SanityStat    { value: string; label: string; }
interface SanityBio     { heading: string; paragraph1: string; paragraph2: string; stats: SanityStat[]; }
interface BioData       { heading: string; paragraph1: string; paragraph2: string; stats: [string, string][]; }

const CMS_QUERIES = {
  skills:     groq`*[_type == "skill"]      | order(order asc) { _id, name, years, level, desc }`,
  projects:   groq`*[_type == "project"]    | order(order asc) { _id, num, title, desc, stack, githubUrl, liveUrl }`,
  experience: groq`*[_type == "experience"] | order(order asc) { _id, year, role, company, desc }`,
  bio:        groq`*[_type == "bio"][0]     { heading, paragraph1, paragraph2, stats[]{ value, label } }`,
} as const;

const seededLines = (title: string): number[] => {
  let h = 0; for (let i = 0; i < title.length; i++) h = ((h << 5) - h + title.charCodeAt(i)) | 0;
  return Array.from({ length: 6 }, (_, i) => 30 + ((Math.abs(h) >> (i * 4)) & 0x3f) % 56);
};

const toSkill   = (s: SanitySkill): Skill => s;
const toProject = (p: SanityProject, id: number): Project => ({ id, num: p.num, title: p.title, desc: p.desc, stack: p.stack || [], lines: seededLines(p.title), githubUrl: p.githubUrl, liveUrl: p.liveUrl });
const toExp     = (e: SanityExp): Experience => e;
const toBioData = (b: SanityBio): BioData => ({ heading: b.heading, paragraph1: b.paragraph1, paragraph2: b.paragraph2, stats: (b.stats || []).map(s => [s.value, s.label] as [string, string]) });

/* ──────────────────────── STATIC FALLBACK DATA ──────────────────────── */

const ROLES = ["Software Developer", "AI / ML Engineer", "IoT Systems Builder", "Full-Stack Developer", "Data Science Student"];

const SKILLS: Skill[] = [
  { name: "React.js / TypeScript",   years: 2, level: 85, desc: "Component architecture, hooks, Vite, Tailwind CSS, PWA development" },
  { name: "Node.js / Express.js",    years: 2, level: 80, desc: "REST API design, JWT authentication, middleware, role-based access" },
  { name: "PostgreSQL / MongoDB",    years: 2, level: 78, desc: "Schema design, complex queries, Firebase Firestore & OAuth integration" },
  { name: "AI / ML Engineering",     years: 3, level: 74, desc: "TensorFlow, PyTorch, Scikit-learn, Keras, TFLite, spaCy, Transformers" },
  { name: "IoT & Embedded Systems",  years: 3, level: 76, desc: "ESP32, Arduino, Raspberry Pi, MQTT, LoRaWAN, PlatformIO, Edge AI" },
  { name: "Docker / DevOps",         years: 1, level: 62, desc: "Docker, Nginx, Render, Railway, Linux (Ubuntu), Git & GitHub" },
  { name: "Data Science",            years: 3, level: 72, desc: "Pandas, NumPy, Matplotlib, Jupyter Notebook, data analysis pipelines" },
  { name: "WebSocket / Real-Time",   years: 1, level: 70, desc: "Socket.IO, Leaflet, live GPS tracking, real-time analytics dashboards" },
];

const PROJECTS: Project[] = [
  { id:1, num:"01", title:"CITT System",  desc:"Centralised Innovation Management System for MUST — streamlining research, IP, funding, and collaboration workflows with RBAC, audit logs, and real-time analytics.", stack:["React","Node.js","PostgreSQL","Firebase"], lines:[80,50,70,40,60,30], githubUrl:"https://github.com/Junior-189/CITT_Project" },
  { id:2, num:"02", title:"Boat Tracker", desc:"Real-time IoT boat tracking app with live GPS mapping via Leaflet, WebSocket-based updates via Socket.IO, and end-to-end hardware-sensor-to-dashboard architecture.", stack:["React","Socket.IO","PostgreSQL","Leaflet"], lines:[60,80,45,70,55,40], githubUrl:"https://github.com/Junior-189/Boat-Tracking-System" },
  { id:3, num:"03", title:"Coming Soon",  desc:"Next project in progress — exploring AI/ML integration with IoT sensor data for predictive maintenance and anomaly detection.", stack:["TBD"], lines:[45,35,55,30,50,40] },
  { id:4, num:"04", title:"Coming Soon",  desc:"More to be revealed. Building at the intersection of embedded systems, TinyML, and real-time web interfaces.", stack:["TBD"], lines:[55,40,30,60,35,45] },
];

const EXPERIENCE: Experience[] = [
  { year:"Oct 2025 – Present", role:"Software Developer",                    company:"BLECA Smartlabs",                            desc:"Designed and deployed the CITT Management System, reducing administrative processing time by 90% and supporting 30 concurrent users across multiple departments. Collaborated with university stakeholders to translate business needs into scalable AI/IoT solutions — from initial spec through production deployment." },
  { year:"2025 – Present",     role:"Volunteer Mentor",                      company:"MUST IoT Bootcamp",                          desc:"Led hands-on workshops on AI, IoT, and TinyML, reaching 50+ participants and helping students build their first embedded ML prototypes. Also participated in Tanzania Indaba-X — the national AI symposium themed 'AI in Tanzania: Celebrating Our Builders & Embracing Our Tools.'" },
  { year:"2022 – 2026",        role:"B.Sc. Engineering in Data Science",     company:"Mbeya University of Science and Technology",  desc:"Advanced coursework in AI, Machine Learning, Deep Learning, IoT/TinyML, Distributed Systems, Data Analysis, Software Engineering, and Web Development. Final-year student with ongoing research and project experience across academia and industry." },
];

const DEFAULT_BIO: BioData = {
  heading:    "Bridging data science and software engineering.",
  paragraph1: "I'm a final-year Data Science & Engineering student at Mbeya University of Science and Technology, with 1+ year of professional experience building production-grade systems at BLECA Smartlabs. I care deeply about clean architecture, real-world impact, and the people using what I build.",
  paragraph2: "My work spans the full stack — from embedded sensor firmware on ESP32s and Raspberry Pis, through Node.js APIs and PostgreSQL schemas, to React frontends with real-time WebSocket dashboards. Available for remote or part-time opportunities in the East Africa Time zone (UTC+3).",
  stats: [["1+","years professional exp."], ["2","production systems shipped"], ["50+","students mentored"], ["8+","technologies mastered"]],
};

const CORNERS: CornerBracket[] = [
  { top: 14, left: 14, borderTop: true, borderLeft: true, borderBottom: false, borderRight: false },
  { top: 14, right: 14, borderTop: true, borderRight: true, borderBottom: false, borderLeft: false },
  { bottom: 14, left: 14, borderBottom: true, borderLeft: true, borderTop: false, borderRight: false },
  { bottom: 14, right: 14, borderBottom: true, borderRight: true, borderTop: false, borderLeft: false },
];

/* ──────────────────────── MOCK PREVIEW ──────────────────────── */

function MockPreview({ lines, fg, bg, border }: MockPreviewProps) {
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

  /* ── refs ── */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<Point>({ x: -1000, y: -1000 });
  const ringRef = useRef<Point>({ x: -100, y: -100 });
  const ringAnimRef = useRef<number | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const termEndRef = useRef<HTMLDivElement>(null);
  const termInputRef = useRef<HTMLInputElement>(null);
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
      "Status:   ✅  open to remote/part-time (20hrs/wk)",
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
        setTermOpen(false);
      } else {
        setTermHistory(prev => [...prev, { type: "in", text: raw }, { type: "out", text: result }]);
      }
    }
    setTermInput("");
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

  /* 3. Cursor dot tracker */
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
      setIsDeleting(false);
      setRoleIdx((roleIdx + 1) % ROLES.length);
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

  /* 7. Scroll reveal */
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
    return () => obs.disconnect();
  }, []);

  /* 8. Terminal shortcut */
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === "`") { e.preventDefault(); setTermOpen(v => !v); }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") { e.preventDefault(); setTermOpen(v => !v); }
      if (e.key === "Escape") setTermOpen(false);
    };
    window.addEventListener("keydown", kd);
    return () => window.removeEventListener("keydown", kd);
  }, []);

  /* 9. Terminal auto-scroll + focus */
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [termHistory]);
  useEffect(() => { if (termOpen) setTimeout(() => termInputRef.current?.focus(), 80); }, [termOpen]);

  /* 10. Sanity fetch */
  useEffect(() => {
    const pid = (import.meta as unknown as Record<string, string>).VITE_SANITY_PROJECT_ID;
    if (!pid) return;
    Promise.all([
      sanityClient.fetch<SanitySkill[]>(CMS_QUERIES.skills),
      sanityClient.fetch<SanityProject[]>(CMS_QUERIES.projects),
      sanityClient.fetch<SanityExp[]>(CMS_QUERIES.experience),
      sanityClient.fetch<SanityBio>(CMS_QUERIES.bio),
    ])
      .then(([sk, pr, ex, bi]) => {
        if (sk?.length) setSkills(sk.map(toSkill));
        if (pr?.length) setProjects(pr.map((p, i) => toProject(p, i + 1)));
        if (ex?.length) setExperience(ex.map(toExp));
        if (bi) setBioData(toBioData(bi));
      })
      .catch((err) => console.warn("[Sanity] Fetch failed — using defaults:", err));
  }, []);

  /* ── cursor compute ── */
  const ringSize = cursorClicking ? 28 : cursorHover ? 52 : 36;
  const ringOpacity = cursorHover ? 0.75 : 0.55;

  /* ── RENDER ── */
  return (
    <div style={{ cursor: "none", background: BG, color: FG, minHeight: "100vh", fontFamily: F_BODY, position: "relative", overflowX: "hidden", transition: "background 0.35s, color 0.35s" }}>
      {/* injected style */}
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        *{cursor:none!important}
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
      `}</style>

      {/* cursor dot */}
      <div style={{ position:"fixed",zIndex:9999,left:dotPos.x,top:dotPos.y,width:cursorHover?0:cursorClicking?4:7,height:cursorHover?0:cursorClicking?4:7,background:FG,borderRadius:"50%",pointerEvents:"none",transform:"translate(-50%,-50%)",transition:"width 0.15s,height 0.15s",opacity:cursorHover?0:1 }} />
      {/* cursor ring */}
      <div style={{ position:"fixed",zIndex:9998,left:ringPos.x,top:ringPos.y,width:ringSize,height:ringSize,border:`1.5px solid ${FG}`,borderRadius:"50%",pointerEvents:"none",transform:"translate(-50%,-50%)",transition:"width 0.2s,height 0.2s,border-color 0.2s",background:cursorHover?`${FG}10`:"transparent",opacity:ringOpacity }} />

      {/* particle canvas */}
      <canvas ref={canvasRef} style={{ position:"fixed",inset:0,zIndex:0,pointerEvents:"none" }} />

      {/* grid bg */}
      <div style={{ position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none" }}>
        <div style={{ position:"absolute",inset:-120,backgroundImage:`linear-gradient(${inverted?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${inverted?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)"} 1px, transparent 1px)`,backgroundSize:"60px 60px",animation:"gridScroll 25s linear infinite",opacity:inverted?0.25:0.35 }} />
      </div>

      {/* navbar */}
      <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 40px",background:`${BG}dd`,backdropFilter:"blur(12px)",borderBottom:`1px solid ${BORDER}` }}>
        <a href="#" data-cur style={{ fontFamily:F_MONO,fontSize:20,fontWeight:700,color:FG,textDecoration:"none",letterSpacing:2 }}>JJL.DEV</a>
        <div style={{ display:"flex",alignItems:"center",gap:24 }}>
          {["About","Skills","Projects","Experience","Contact"].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} data-cur className="nav-a" style={{ fontFamily:F_MONO,fontSize:13,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"color 0.3s" }}>{l}</a>
          ))}
          <button data-cur onClick={() => setTermOpen(true)} style={{ fontFamily:F_MONO,fontSize:12,background:"none",border:`1px solid ${BORDER}`,color:MUTED,padding:"6px 16px",cursor:"pointer" }}>~/terminal</button>
          <button data-cur onClick={() => setInverted(!inverted)} style={{ fontFamily:F_MONO,fontSize:12,background:"none",border:`1px solid ${BORDER}`,color:MUTED,padding:"6px 16px",cursor:"pointer",textTransform:"uppercase",letterSpacing:1 }}>{inverted?"◑ DARK":"◐ LIGHT"}</button>
        </div>
      </nav>

      {/* main */}
      <main>

        {/* ═══ HERO ═══ */}
        <section id="hero" style={{ minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-start",padding:"120px 40px 100px",position:"relative",zIndex:2,maxWidth:900,margin:"0 auto",width:"100%" }}>
          <p style={{ fontFamily:F_MONO,fontSize:14,color:MUTED,marginBottom:24,animation:"fadeUp 1s ease" }}>&gt; Hello, world. I&apos;m Junior.</p>
          <h1 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(70px,11vw,150px)",fontWeight:400,lineHeight:0.9,color:FG,position:"relative",marginBottom:24 }}>
            JUNIOR<span style={{ display:"block",marginTop:4 }}>LYIMO</span>
            {glitching && (
              <span aria-hidden style={{ position:"absolute",top:0,left:0,right:0,bottom:0,fontFamily:"inherit",fontSize:"inherit",fontWeight:"inherit",lineHeight:"inherit",color:inverted?"#0ff":"#f00",opacity:0.65,animation:"glitchA 0.6s infinite",textShadow:`2px 0 ${inverted?"#f0f":"#00f"}, -2px 0 ${inverted?"#ff0":"#0f0"}` }}>JUNIOR<br/>LYIMO</span>
            )}
          </h1>
          <p style={{ fontFamily:F_MONO,fontSize:18,color:MUTED,minHeight:28,marginBottom:16 }}>
            {roleText}<span style={{ animation:"blink 1s infinite",fontWeight:300 }}>|</span>
          </p>
          <p style={{ fontSize:15,lineHeight:1.7,color:MUTED,maxWidth:560,marginBottom:36 }}>
            Building AI-integrated and IoT-enabled systems that connect the physical world to the digital — from sensor firmware to real-time dashboards.
          </p>
          <div style={{ display:"flex",gap:14 }}>
            <a data-cur href="#projects" style={{ fontFamily:F_MONO,fontSize:13,padding:"14px 32px",background:FG,color:BG,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,fontWeight:600,transition:"opacity 0.3s" }}>VIEW WORK</a>
            <a data-cur href="#contact" style={{ fontFamily:F_MONO,fontSize:13,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s" }}>CONTACT ME</a>
          </div>
          <div style={{ position:"absolute",bottom:50,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
            <span style={{ fontFamily:F_MONO,fontSize:10,color:MUTED,letterSpacing:3,textTransform:"uppercase" }}>SCROLL</span>
            <div style={{ width:1,background:MUTED,animation:"scrollLine 2s ease-in-out infinite" }} />
          </div>
        </section>

        {/* ═══ ABOUT ═══ */}
        <section id="about" data-sec="about" ref={el => { sectionRefs.current.about = el; }} style={{ ...sectionBorder, ...reveal("about"), maxWidth:1100,margin:"0 auto",padding:"0 40px 100px",position:"relative",zIndex:2 }}>
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8 }}>01 / ABOUT</p>
          <div style={{ display:"grid",gridTemplateColumns:"260px 1fr",gap:60,alignItems:"start" }}>
            {/* photo */}
            <div>
              <div style={{ position:"relative",paddingBottom:"125%",background:CARD,border:`1px solid ${BORDER}`,overflow:"hidden" }}>
                <svg width="100%" height="100%" viewBox="0 0 200 250" preserveAspectRatio="none" style={{ position:"absolute",inset:0 }}>
                  <defs>
                    <pattern id="hatch2" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="8" stroke={BORDER} strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="200" height="250" fill="url(#hatch2)" />
                </svg>
                <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12 }}>
                  <div style={{ width:52,height:52,borderRadius:"50%",border:`1px dashed ${MUTED}`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-7 8-7s8 3 8 7"/></svg>
                  </div>
                  <span style={{ fontFamily:F_MONO,fontSize:9,color:MUTED,textAlign:"center",textTransform:"uppercase",letterSpacing:1.5,lineHeight:1.6 }}>YOUR PHOTO<br/>upload your image here</span>
                </div>
                {CORNERS.map((c, i) => (
                  <span key={i} aria-hidden style={{ position:"absolute",top:c.top,bottom:c.bottom,left:c.left,right:c.right,width:22,height:22,borderTop:c.borderTop?`1px solid ${MUTED}`:undefined,borderBottom:c.borderBottom?`1px solid ${MUTED}`:undefined,borderLeft:c.borderLeft?`1px solid ${MUTED}`:undefined,borderRight:c.borderRight?`1px solid ${MUTED}`:undefined }} />
                ))}
              </div>
              <p style={{ fontFamily:F_MONO,fontSize:13,fontWeight:700,color:FG,marginTop:16,textAlign:"center" }}>JUNIOR JACKSON LYIMO</p>
              <p style={{ fontFamily:F_MONO,fontSize:10,color:MUTED,textAlign:"center",textTransform:"uppercase",letterSpacing:2 }}>SOFTWARE DEVELOPER · MBEYA, TZ</p>
            </div>
            {/* bio */}
            <div>
              <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(28px,4vw,40px)",fontWeight:400,color:FG,lineHeight:1.15,marginBottom:20 }}>{bioData.heading}</h2>
              <p style={{ fontSize:15,lineHeight:1.8,color:MUTED,marginBottom:16 }}>{bioData.paragraph1}</p>
              <p style={{ fontSize:15,lineHeight:1.8,color:MUTED,marginBottom:28 }}>{bioData.paragraph2}</p>
              <div style={{ display:"inline-flex",alignItems:"center",gap:10,padding:"10px 18px",border:`1px solid ${BORDER}`,borderRadius:6,marginBottom:32 }}>
                <span style={{ width:8,height:8,borderRadius:"50%",background:"#22c55e",flexShrink:0 }} />
                <span style={{ fontFamily:F_MONO,fontSize:11,color:FG }}>AVAILABLE FOR OPPORTUNITIES</span>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
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
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8 }}>02 / SKILLS</p>
          <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(32px,5vw,48px)",fontWeight:400,color:FG,marginBottom:40 }}>Tech Stack</h2>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
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
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8 }}>03 / PROJECTS</p>
          <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(32px,5vw,48px)",fontWeight:400,color:FG,marginBottom:40 }}>Selected Work</h2>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,background:BORDER }}>
            {projects.map((p, i) => (
              <div key={p.id as number} data-cur className="proj-card"
                onMouseEnter={() => setHovProject(i)} onMouseLeave={() => setHovProject(null)}
                style={{ background:BG,padding:0,overflow:"hidden",position:"relative",cursor:"pointer",transition:"background 0.3s",minHeight:320 }}>
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
                <div style={{ position:"absolute",top:20,right:hovProject===i?20:-130,width:140,opacity:hovProject===i?1:0,transition:"right 0.4s ease, opacity 0.3s ease",pointerEvents:"none" }}>
                  <MockPreview lines={p.lines} fg={FG} bg={BG} border={BORDER} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ EXPERIENCE ═══ */}
        <section id="experience" data-sec="experience" ref={el => { sectionRefs.current.experience = el; }} style={{ ...sectionBorder, ...reveal("experience"), maxWidth:1100,margin:"0 auto",padding:"0 40px 100px",position:"relative",zIndex:2 }}>
          <p style={{ fontFamily:F_MONO,fontSize:12,color:MUTED,textTransform:"uppercase",letterSpacing:3,marginBottom:8 }}>04 / EXPERIENCE</p>
          <h2 style={{ fontFamily:F_DISPLAY,fontSize:"clamp(32px,5vw,48px)",fontWeight:400,color:FG,marginBottom:40 }}>Career Timeline</h2>
          <div style={{ position:"relative",paddingLeft:28 }}>
            <div style={{ position:"absolute",left:5,top:4,bottom:4,width:1,background:BORDER }} />
            {experience.map((e, i) => (
              <div key={i} style={{ ...reveal("experience"), transitionDelay:`${i*0.18}s`, marginBottom:i<experience.length-1?36:0 }}>
                <div style={{ position:"absolute",left:0,width:11,height:11,borderRadius:"50%",background:FG,marginTop:5 }} />
                <div>
                  <span style={{ fontFamily:F_MONO,fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:2 }}>{e.year}</span>
                  <h3 style={{ fontFamily:F_DISPLAY,fontSize:22,fontWeight:400,color:FG,margin:"4px 0 2px" }}>{e.role}</h3>
                  <p style={{ fontFamily:F_MONO,fontSize:13,color:MUTED,marginBottom:10 }}>{e.company}</p>
                  <p style={{ fontSize:14,lineHeight:1.7,color:MUTED }}>{e.desc}</p>
                </div>
              </div>
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
            <a data-cur href="mailto:jjuniorlyimo@gmail.com" style={{ fontFamily:F_MONO,fontSize:14,padding:"14px 32px",background:FG,color:BG,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,fontWeight:600,transition:"opacity 0.3s" }}>jjuniorlyimo@gmail.com</a>
            <a data-cur href="https://github.com/Junior-189" target="_blank" rel="noopener noreferrer" className="outline-link" style={{ fontFamily:F_MONO,fontSize:14,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s" }}>GitHub ↗</a>
            <a data-cur href="https://linkedin.com/in/junior-jackson-271016393" target="_blank" rel="noopener noreferrer" className="outline-link" style={{ fontFamily:F_MONO,fontSize:14,padding:"14px 32px",border:`1px solid ${BORDER}`,color:MUTED,textDecoration:"none",textTransform:"uppercase",letterSpacing:2,transition:"all 0.3s" }}>LinkedIn ↗</a>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer style={{ ...sectionBorder, maxWidth:1100,margin:"0 auto",padding:"40px 40px",position:"relative",zIndex:2,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
          <p style={{ fontFamily:F_MONO,fontSize:11,color:MUTED }}>© 2025 Junior Jackson Lyimo — built with React + TypeScript</p>
          <p style={{ fontFamily:F_MONO,fontSize:11,color:MUTED }}>press <kbd style={{ padding:"2px 6px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:3,fontSize:10 }}>`</kbd> to open terminal</p>
        </footer>

      </main>

      {/* ═══ TERMINAL ═══ */}
      {termOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setTermOpen(false); }} style={{ position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",animation:"fadeUp 0.3s ease" }}>
          <div style={{ width:"min(90vw,660px)",maxHeight:"75vh",background:"#0d0d0d",border:"1px solid #333",borderRadius:8,display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }}>
            {/* title bar */}
            <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:"#1a1a1a",borderBottom:"1px solid #333" }}>
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#ff5f57" }} />
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#ffbd2e" }} />
              <span style={{ width:11,height:11,borderRadius:"50%",background:"#28ca41" }} />
              <span style={{ fontFamily:F_MONO,fontSize:11,color:"#666",marginLeft:8 }}>junior@portfolio:~$</span>
              <span onClick={() => setTermOpen(false)} style={{ marginLeft:"auto",cursor:"pointer",color:"#666",fontSize:18,lineHeight:1,fontFamily:"sans-serif" }}>✕</span>
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
                <input ref={termInputRef} value={termInput} onChange={e => setTermInput(e.target.value)} onKeyDown={e => { if (e.key==="Enter"&&termInput.trim()) runCmd(termInput); }} style={{ flex:1,background:"none",border:"none",color:"#eee",fontFamily:F_MONO,fontSize:13,outline:"none",caretColor:"#0f0" }} autoFocus />
              </div>
              <div ref={termEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* helper */
function hoveredMatch(hov: number | null, idx: number) { return hov === idx; }
