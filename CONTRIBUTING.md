# Contributing to CareCircle 🩺

Thank you for your interest in contributing to CareCircle! Our mission is to empower elderly individuals to maintain health and independence with peace of mind for their families and caregivers.

Please take a moment to review this document before submitting contributions.

---

## Code of Conduct & Philosophy

CareCircle adheres to an **elderly-first, patient safety first** development philosophy:

1. **Elderly Usability:** Touch targets must be at least $44\text{px} \times 44\text{px}$ (preferably $\ge 48\text{px}$). Fonts must be large, legible, and high-contrast.
2. **Honest Healthcare Data:** Never label pending doses as "missed". Never suggest altered dosages or double-dosing. Never claim external notification delivery (SMS/email/emergency services) unless a real third-party provider is actively integrated and configured.
3. **Data Security & Privacy:** All patient tables must have strict PostgreSQL Row Level Security (RLS) policies enforcing `patient_id = auth.uid()`. Unauthenticated visitors must never see real patient data.

---

## Development Workflow

We follow a strict **Feature Branch + Pull Request** workflow:

```
main (Production)
  └── feature/<phase-or-feature-name>
```

1. **Fork or Clone the Repository:**
   ```bash
   git clone https://github.com/Cassion478/CareCircle.git
   cd CareCircle
   ```

2. **Create a Feature Branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Configure Environment:**
   ```bash
   cp .env.example .env.local
   # Fill in your Supabase credentials in .env.local
   ```

---

## Quality Gates & Verification

Before opening a pull request, ensure all quality gates pass locally:

```bash
# 1. Run all unit and regression test suites
npm test

# 2. Verify TypeScript type safety
npm run typecheck

# 3. Check code style and lint rules
npm run lint

# 4. Verify production compilation and static page generation
npm run build

# 5. Ensure no Git whitespace or formatting defects
git diff --check
```

---

## Commit Guidelines

We use conventional commit messages:

- `feat(scope): add new capability`
- `fix(scope): resolve defect or incorrect calculation`
- `docs(scope): update documentation or README`
- `test(scope): add or improve automated test suites`
- `refactor(scope): internal code cleanup with zero user-facing changes`

---

## Pull Request Checklist

When opening a Pull Request:

- [ ] Target branch is `main`.
- [ ] PR title follows conventional commit syntax.
- [ ] Automated tests pass (`npm test`).
- [ ] TypeScript check passes with 0 errors (`npm run typecheck`).
- [ ] ESLint passes with 0 warnings/errors (`npm run lint`).
- [ ] Production build succeeds (`npm run build`).
- [ ] No secrets or `.env.local` are tracked in Git.
- [ ] Clear description of changes, testing performed, and screenshots/GIFs (if UI changes are made).
