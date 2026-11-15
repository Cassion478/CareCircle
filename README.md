# CareCircle 🩺

> Proactive Elderly Healthcare & Medication Management Platform

CareCircle is designed to bridge the gap between independent senior living and peace of mind for families and caregivers. It provides proactive medication tracking, smart alert escalations, appointment management, and family collaboration.

---

## 🚀 Technology Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, React 19)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Linting & Code Quality:** ESLint with Next.js Core Web Vitals config
- **Backend & Auth (Planned for Phase 2):** Supabase (PostgreSQL, Row Level Security, Auth)
- **Notifications (Planned for Phase 5):** Resend API

---

## 📁 Project Architecture

```
src/
├── app/                  # Next.js App Router (pages, layout, globals.css)
├── components/           # Reusable component library
│   ├── layout/           # Global layouts (Navbar, Footer, Sidebar)
│   └── ui/               # Core UI primitives (Button, Card, Badge)
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and library configurations
└── types/                # Domain models and TypeScript interfaces
```

---

## 🗺️ Development Roadmap

We follow a strict **Phase-Based Development + Pull Request** workflow:

| Phase | Name | Focus | Status |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Repository Audit & Foundation** | Next.js, TypeScript, Tailwind, ESLint setup | **Completed** |
| **Phase 1** | **UI Foundation & Dashboard** | Core "My Day" dashboard, accessible cards, adherence | **Completed** |
| **Phase 2** | **Auth & Healthcare Profile** | Supabase integration, user roles & profile | Upcoming |
| **Phase 3** | **Medication Management** | CRUD, scheduling, daily status tracking | Upcoming |
| **Phase 4** | **Family & Appointments** | Appointments, family circles, invite codes | Upcoming |
| **Phase 5** | **Smart Alert Intelligence** | Overdue detection, escalation, notifications | Upcoming |
| **Phase 6** | **Analytics & UI Polish** | Adherence calculation, charts, QA | Upcoming |
| **Phase 7** | **Deployment & Release** | Production build, Vercel deployment, submission | Upcoming |

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 18.x or 20.x+ (tested on Node v22)
- npm or pnpm

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build for Production
```bash
npm run build
```

### 5. Lint & Type Check
```bash
npm run lint
npx tsc --noEmit
```

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
