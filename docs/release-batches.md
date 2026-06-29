# Release Batches

## Batch 1 - Stabilization

- Keep the student redesign on a dedicated branch.
- Verify lint, production build, auth redirects, and legacy route redirects.
- Keep teacher visual alignment on a separate branch until its file scope is clean enough to commit safely.

## Batch 2 - Public Shell Polish

- Redesign the public login screen so it matches the student dashboard visual system.
- Remove the old bottom navigation from public/auth screens.
- Check `/login`, `/pending`, `/auth/callback`, and unauthenticated legacy redirects for visual consistency.
- Keep old student routes hidden behind dashboard redirects unless we intentionally redesign them.
