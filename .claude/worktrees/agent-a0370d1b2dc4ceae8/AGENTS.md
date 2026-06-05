# AGENTS.md

## Repo Snapshot

- Framework: Next.js 16 App Router (`next@16.0.10`) with React 19 and TypeScript.
- Package manager in use: `npm`.
  Reason: root `package-lock.json` is present and the repo scripts are defined in `package.json`.
- Styling: global CSS plus many inline styles; Tailwind is installed but not clearly driving the current UI.
- Backend/auth: Supabase client usage is spread through app routes and components.
- Current worktree note: this repo may be dirty; do not revert unrelated local changes.

## Real Commands

- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start production server: `npm run start`
- Typecheck: `npx tsc --noEmit`
- Lint script present but currently not reliable: `npm run lint`
  Current behavior: crashes in this repo with `TypeError: require(...) is not a function`.
- Tests: no working root test command is defined in `package.json`.

## Required Validation Before Finishing

- Always run `npm run build`.
- Also run `npx tsc --noEmit`.
- Do not treat `npm run lint` as a required pass gate unless the task explicitly fixes lint tooling first.
- Prefer small, scoped edits. Do not bundle product rewrites with infra cleanup.

## Current Product Structure

There are two parallel UI structures in this repo. Prefer the newer study shell unless the task explicitly targets a legacy route.

- Main study shell: `/study`
  Uses the four-section tab model:
  - `Inicio`
  - `Aprender`
  - `Practicar`
  - `Recursos`
- Legacy/mobile routes also still exist:
  - `/`
  - `/kana`
  - `/practicar`
  - `/comunidad`
  - `/recursos`
  - `/resources`
  - `/perfil`
  - `/profile`

## Navigation Rules

- Visible top-level sections should be exactly:
  - `Inicio`
  - `Aprender`
  - `Practicar`
  - `Recursos`
- Do not reintroduce `Repasar` or `Biblioteca` as top-level tabs.
- When touching navigation, align with the four-tab study shell in `components/study/ds.tsx`.
- Be careful: legacy components still reference older labels/routes like `Study`, `Resources`, `Review`, `Vault`, `Kana`, and `Comunidad`. Do not use those as the source of truth for new top-level nav decisions.

## Language Rules

- All user-facing UI must be in Spanish.
- Do not mix English and Spanish in UI copy, labels, buttons, headings, ARIA labels, or navigation.
- If you touch a screen and notice mixed-language UI nearby, only normalize it if the task clearly requires it and the change stays scoped.

## Design / UI Rules

- Preserve the current visual system before introducing anything new.
- The active study-shell design language is defined in `components/study/ds.tsx`:
  - warm cream background
  - red accent
  - teal secondary accent
  - rounded cards
  - `Plus Jakarta Sans`/`Poppins`/`Noto Sans JP` font stack from `app/layout.tsx`
- Prefer reusing existing design tokens and tab patterns instead of inventing new ones.
- Avoid redesign work unless the task explicitly asks for it.
- Keep mobile-first behavior intact; most screens are clearly optimized for phone-sized layouts and fixed bottom navigation.

## Major Files And Components To Read First

- `package.json`
  Real scripts and dependency surface.
- `app/layout.tsx`
  Global fonts, metadata, viewport, service worker registration, and app-wide wrappers.
- `app/study/page.tsx`
  Largest product surface and the current four-tab study shell.
- `components/study/ds.tsx`
  Source of truth for the current top-level tab labels and study-shell design tokens.
- `components/study/HomeScreen.tsx`
  `Inicio` screen for the study shell.
- `components/study/AprenderKanaModule.tsx`
  Main learning flow for kana and related study interactions.
- `components/study/PracticeIndexScreen.tsx`
  `Practicar` entry screen and practice-mode selection.
- `components/study/RecursosScreen.tsx`
  `Recursos` entry screen in the study shell.
- `lib/kana-progress.ts`
  Kana progress persistence and due-state behavior. Treat as sensitive.
- `lib/study-srs.ts`
  SRS/session-style study scheduling and review ranking. Treat as sensitive.
- `lib/supabase.ts`
  Shared Supabase client wiring. Do not touch unless necessary.
- `components/BottomNav.tsx`, `components/AppTopNav.tsx`
  Legacy navigation surfaces that still contain mixed labels/routes and can easily regress current direction if edited casually.
- `app/resources/page.tsx` and `app/recursos/page.tsx`
  Parallel resource implementations; inspect carefully before changing anything in resources.

## Sensitive Areas

- Do not touch Supabase/build-env handling unless the task explicitly requires it.
- Do not touch SRS/session logic unless the task explicitly requires it.
- Be extra careful in:
  - `lib/supabase.ts`
  - `lib/kana-progress.ts`
  - `lib/study-srs.ts`
  - auth/admin routes under `app/api` and `app/admin`

## Known Ambiguities / Legacy Conflicts

- The repo has both Spanish and English route families:
  - `/recursos` and `/resources`
  - `/perfil` and `/profile`
  - `/study` alongside `/`, `/kana`, `/practicar`, `/comunidad`
- Some components still expose English UI labels:
  - `components/AppTopNav.tsx`
  - `components/study/ReviewScreen.tsx`
  - `components/study/VaultScreen.tsx`
- `ReviewScreen` and `VaultScreen` still imply older top-level concepts that should not be reintroduced as primary tabs.
- Root README is the default Create Next App template and is not a reliable source of repo conventions.
- Tailwind/PostCSS files exist, but the current app is primarily driven by component-level styles and global CSS.

## Editing Guidance For Future Codex Runs

- Prefer editing the smallest relevant surface.
- When a task affects top-level product navigation or section naming, inspect `app/study/page.tsx` and `components/study/ds.tsx` first.
- Before changing resource, profile, or navigation flows, check whether you are in a legacy route or the newer study shell.
- Do not “clean up” parallel legacy routes unless the task explicitly asks for consolidation.
- Do not make speculative infra or tooling changes while doing product work.
