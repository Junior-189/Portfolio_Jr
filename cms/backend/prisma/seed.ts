import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    throw new Error("Set ADMIN_USERNAME and ADMIN_PASSWORD in backend/.env before seeding.");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD is too short — use at least 8 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.adminUser.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
  console.log(`Admin user "${username}" ready.`);

  const skillCount = await prisma.skill.count();
  if (skillCount === 0) {
    await prisma.skill.createMany({
      data: [
        { name: "React.js / TypeScript",  years: 2, level: 85, desc: "Component architecture, hooks, Vite, Tailwind CSS, PWA development", order: 1 },
        { name: "Node.js / Express.js",   years: 2, level: 80, desc: "REST API design, JWT authentication, middleware, role-based access", order: 2 },
        { name: "PostgreSQL / MongoDB",   years: 2, level: 78, desc: "Schema design, complex queries, Firebase Firestore & OAuth integration", order: 3 },
        { name: "AI / ML Enthusiast",     years: 3, level: 74, desc: "TensorFlow, PyTorch, Scikit-learn, Keras, TFLite, spaCy", order: 4 },
        { name: "IoT & Embedded Systems", years: 3, level: 76, desc: "ESP32, Arduino, Raspberry Pi, MQTT, PlatformIO, Edge AI", order: 5 },
        { name: "Docker / DevOps",        years: 1, level: 62, desc: "Docker, Nginx, Render, Railway, Linux (Ubuntu), Git & GitHub", order: 6 },
        { name: "Data Science",           years: 3, level: 72, desc: "Pandas, NumPy, Matplotlib, Jupyter Notebook, Data Analysis Pipelines", order: 7 },
        { name: "WebSocket / Real-Time",  years: 1, level: 70, desc: "Socket.IO, Leaflet, Live GPS tracking, Real-Time Analytics Dashboards", order: 8 },
      ],
    });
    console.log("Seeded skills.");
  }

  const projectCount = await prisma.project.count();
  if (projectCount === 0) {
    await prisma.project.createMany({
      data: [
        { num: "01", title: "CITT System",  desc: "Centralised Innovation Management System for MUST — streamlining research, IP, funding, and collaboration workflows with RBAC, audit logs, and real-time analytics.", stack: ["React", "Node.js", "PostgreSQL", "Firebase"], githubUrl: "https://github.com/Junior-189/CITT_Project", order: 1 },
        { num: "02", title: "Boat Tracker", desc: "Real-time IoT boat tracking app with live GPS mapping via Leaflet, WebSocket-based updates via Socket.IO, and end-to-end hardware-sensor-to-dashboard architecture.", stack: ["React", "Socket.IO", "PostgreSQL", "Leaflet"], githubUrl: "https://github.com/Junior-189/Boat-Tracking-System", order: 2 },
        { num: "03", title: "Coming Soon",  desc: "Next project in progress — exploring AI/ML integration with IoT sensor data for predictive maintenance and anomaly detection.", stack: ["TBD"], order: 3 },
        { num: "04", title: "Coming Soon",  desc: "More to be revealed. Building at the intersection of embedded systems, TinyML, and real-time web interfaces.", stack: ["TBD"], order: 4 },
      ],
    });
    console.log("Seeded projects.");
  }

  const experienceCount = await prisma.experience.count();
  if (experienceCount === 0) {
    await prisma.experience.createMany({
      data: [
        { year: "Oct 2025 -> Present", role: "Software Developer",                 company: "BLECA Smartlabs",                           desc: "Designed and deployed the CITT Management System, reducing administrative processing time by 90% and supporting 30 concurrent users across multiple departments. Collaborated with university stakeholders to translate business needs into scalable AI/IoT solutions — from initial spec through production deployment.", order: 1 },
        { year: "2025 -> Present",     role: "Volunteer Mentor",                   company: "MUST IoT Bootcamp",                         desc: "Led hands-on workshops on AI, IoT, and TinyML, reaching 50+ participants and helping students build their first embedded ML prototypes. Also participated in Tanzania Indaba-X — the national AI symposium themed 'AI in Tanzania: Celebrating Our Builders & Embracing Our Tools.'", order: 2 },
        { year: "2022 -> 2026",        role: "B.Sc. Engineering in Data Science",  company: "Mbeya University of Science and Technology", desc: "Advanced coursework in AI, Machine Learning, Deep Learning, IoT/TinyML, Distributed Systems, Data Analysis, Software Engineering, and Web Development. Final-year student with ongoing research and project experience across academia and industry.", order: 3 },
      ],
    });
    console.log("Seeded experience.");
  }

  const bioExists = await prisma.bio.findFirst();
  if (!bioExists) {
    await prisma.bio.create({
      data: {
        heading: "Bridging data science and software engineering.",
        paragraph1: "I'm a final-year Data Science & Engineering student at Mbeya University of Science and Technology, with 1+ year of professional experience building production-grade systems at BLECA Smartlabs. I care deeply about clean architecture, real-world impact, and the people using what I build.",
        paragraph2: "My work spans the full stack — from embedded sensor firmware on ESP32s and Raspberry Pis, through Node.js APIs and PostgreSQL schemas, to React frontends with real-time WebSocket dashboards. Available for remote or part-time opportunities in the East Africa Time zone (UTC+3).",
        stats: [
          { value: "1+", label: "years professional exp." },
          { value: "2", label: "production systems shipped" },
          { value: "50+", label: "students mentored" },
          { value: "8+", label: "technologies mastered" },
        ],
      },
    });
    console.log("Seeded bio.");
  }

  const profileExists = await prisma.profile.findFirst();
  if (!profileExists) {
    await prisma.profile.create({
      data: {
        name: "Junior Jackson Lyimo",
        email: "jjuniorlyimo@gmail.com",
        githubUrl: "https://github.com/Junior-189",
        linkedinUrl: "https://linkedin.com/in/junior-jackson-271016393",
        footerNote: "built with React + TypeScript",
      },
    });
    console.log("Seeded profile.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
