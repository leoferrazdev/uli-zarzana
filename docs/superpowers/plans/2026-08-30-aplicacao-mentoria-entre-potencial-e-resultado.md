# Aplicação da Mentoria Entre Potencial e Resultado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a public, multi-step application flow for the Mentoria Entre Potencial e Resultado, persist every submitted answer in Supabase, and expose the complete application inside the authenticated CRM.

**Architecture:** The public flow is a client-side wizard rendered by Next.js. It sends one validated payload to a server Route Handler only after the final terms acceptance. Supabase stores the normalized application in a dedicated table with public insert-only RLS; authenticated CRM pages query the same table through the existing server Supabase client. The MVP keeps applications as their own record and does not duplicate them into `leads`.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Node.js 22, Supabase PostgreSQL/Auth/RLS, existing CSS tokens, Node test runner with TypeScript stripping.

## Global Constraints

- Public route: `/aplicacao/mentoria-entre-potencial-e-resultado`.
- Public submission endpoint: `/api/aplicacoes/mentoria-entre-potencial-e-resultado`.
- Authenticated CRM route: `/aplicacoes` with application detail view.
- Supabase table: `public.mentoria_entre_potencial_resultado_applications`.
- Public access may insert only a valid application with `terms_accepted = true`.
- Anonymous users may not select, update or delete applications.
- CRM access is restricted to existing `administradora` and `comercial` profiles through Auth and RLS.
- No application is automatically duplicated into `public.leads` in this MVP.
- No real applicant data, secrets, service-role keys or tokens may enter the repository, URL, browser console or vault.
- The complete approved orientation and terms copy must be preserved.
- Existing protected CRM routes `/`, `/login`, `/capas` and all current tests must remain functional.
- Preserve unrelated dirty worktree changes; stage only files belonging to this feature and its documentation.

---

### Task 1: Define the application contract and database migration

**Files:**
- Create: `apps/crm-next/lib/applications/mentorship-application.ts`
- Create: `tests/mentorship-application.test.mjs`
- Create: `supabase/migrations/202608300001_mentorship_application.sql`

**Interfaces:**
- Produces `MentorshipApplicationInput`, controlled option constants, and `validateMentorshipApplication(input)` for both the Route Handler and tests.
- Produces the table `public.mentoria_entre_potencial_resultado_applications` with columns specified in the approved design.

- [ ] **Step 1: Write failing contract tests**

Add tests covering:

Create a local `validApplication()` helper in the test that returns a complete payload using `instagram`, `individual`, `sim`, `noite`, `7-8`, `terms_accepted: true`, and non-empty values for every required text field.

```js
test('accepts a complete application with terms accepted', () => {
  assert.deepEqual(validateMentorshipApplication(validApplication()), []);
});

test('rejects missing required fields, invalid options and terms not accepted', () => {
  const errors = validateMentorshipApplication({ ...validApplication(), terms_accepted: false, commitment_level: '11-12' });
  assert.ok(errors.some((error) => error.field === 'terms_accepted'));
  assert.ok(errors.some((error) => error.field === 'commitment_level'));
});

test('requires the free-text origin only when discovery_source is outro', () => {
  const errors = validateMentorshipApplication({ ...validApplication(), discovery_source: 'outro', discovery_source_other: '' });
  assert.ok(errors.some((error) => error.field === 'discovery_source_other'));
});
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs`

Expected: FAIL because the application contract module does not exist yet.

- [ ] **Step 3: Implement the minimal typed contract and validator**

Use explicit string unions for controlled options, trim text before validation, reject empty required values, validate the e-mail shape and ISO birth date, enforce the `outro` conditional field, enforce the four commitment ranges and require `terms_accepted === true`.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs`

Expected: PASS.

- [ ] **Step 5: Write the migration with least-privilege policies**

Create the dedicated table with normalized columns, `submitted_at` and `created_at` defaults, indexes for recent submissions and controlled text checks. Enable RLS, revoke anonymous read/update/delete, grant anonymous insert only through a policy requiring `terms_accepted`, and grant authenticated select only when `public.is_admin_or_commercial()` is true. Grant no public update or delete.

- [ ] **Step 6: Run a static migration audit**

Verify the migration contains no credentials, no applicant data, no Uli-specific production records, and no policy that grants anonymous select. Keep the existing CRM migration unchanged.

---

### Task 2: Add the public submission endpoint and route access exception

**Files:**
- Create: `apps/crm-next/app/api/aplicacoes/mentoria-entre-potencial-e-resultado/route.ts`
- Modify: `apps/crm-next/middleware.ts`
- Test: `tests/mentorship-application.test.mjs`

**Interfaces:**
- `POST /api/aplicacoes/mentoria-entre-potencial-e-resultado` accepts JSON matching `MentorshipApplicationInput` and returns `{ ok: true }` only after persistence.
- Invalid payloads return HTTP 400 with field-level errors; persistence errors return HTTP 500 without exposing database internals.

- [ ] **Step 1: Add failing source-contract assertions**

Assert that the route uses `POST`, `validateMentorshipApplication`, the dedicated table name, and returns no application record; assert that middleware explicitly allows the public page and endpoint while preserving the existing login redirect for other paths.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs`

Expected: FAIL because the route and public-path exception do not exist.

- [ ] **Step 3: Implement the Route Handler**

Parse JSON safely, validate with the shared contract, insert with the existing server Supabase client, and return a minimal success response. Do not log payloads. Handle malformed JSON and Supabase errors with actionable but non-sensitive messages.

- [ ] **Step 4: Allow only the required public paths in middleware**

Bypass Auth for the exact application page and exact application POST endpoint. Keep every other path, including CRM pages and unrelated API paths, behind the current Auth behavior.

- [ ] **Step 5: Run focused tests and lint**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs` and `npm --prefix apps/crm-next run lint`.

Expected: PASS with no new lint errors.

---

### Task 3: Build the public multi-step application experience

**Files:**
- Create: `apps/crm-next/app/aplicacao/mentoria-entre-potencial-e-resultado/page.tsx`
- Create: `apps/crm-next/components/mentorship-application.tsx`
- Modify: `apps/crm-next/app/globals.css`
- Test: `tests/mentorship-application.test.mjs`

**Interfaces:**
- The page renders without Auth and mounts the client wizard.
- The wizard owns local draft state, current step, validation messages, submission state and success state.

- [ ] **Step 1: Add failing UI contract assertions**

Assert the approved orientation, all required labels/options, eight step labels, `Avançar`, `Voltar`, `Enviar respostas`, terms text, `aria-live`, and the exact endpoint path. Assert that no data is sent before the final submit action.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs`

Expected: FAIL because the page and component do not exist.

- [ ] **Step 3: Implement the wizard**

Create the eight approved screens: orientation; identification; professional context; moment and objective; obstacle and format; expectation and selection; availability and commitment; terms and submission. Use semantic labels, correct input types, conditional `Outro` and previous-mentoring fields, client-side validation, a visible progress indicator, back navigation, focus restoration and disabled submission while loading.

- [ ] **Step 4: Implement success and failure states**

On success, clear the draft and show only a confirmation that the application was received and will be individually analyzed. On failure, preserve entered values and show an actionable message without exposing database or network details.

- [ ] **Step 5: Style the page using existing brand tokens**

Use the established paper, ink, dark-brown and champagne tokens; maintain the editorial hierarchy; provide a comfortable centered desktop layout and a one-column mobile layout without horizontal overflow. Do not introduce a generic component library or unrelated identity changes.

- [ ] **Step 6: Run focused tests and build**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs`, `npm --prefix apps/crm-next run lint` and `npm --prefix apps/crm-next run build`.

Expected: PASS and a generated public application route.

---

### Task 4: Integrate applications into the authenticated CRM

**Files:**
- Create: `apps/crm-next/app/aplicacoes/page.tsx`
- Create: `apps/crm-next/app/aplicacoes/[id]/page.tsx`
- Create: `apps/crm-next/lib/applications/queries.ts`
- Modify: `apps/crm-next/app/page.tsx`
- Modify: `apps/crm-next/app/globals.css`
- Test: `tests/mentorship-application.test.mjs`

**Interfaces:**
- `getMentorshipApplications()` returns recent application summaries from the dedicated table.
- `getMentorshipApplication(id)` returns one complete application or `null`.
- Both query helpers use the existing server Supabase client and rely on RLS in addition to the page session check.

- [ ] **Step 1: Add failing CRM contract assertions**

Assert that the CRM includes `/aplicacoes`, a detail route, the dedicated table query, all required summary fields, grouped complete-response labels, a Visão Geral access link and a same-day application metric.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs`

Expected: FAIL because the CRM integration does not exist.

- [ ] **Step 3: Implement server query helpers and protected list**

Verify Auth, query newest submissions first, show a clear empty state, and link each row to its detail route. If the user lacks a profile or the query fails, use the existing access-state language rather than exposing database errors.

- [ ] **Step 4: Implement the complete detail view**

Render every submitted answer under the same sections used by the public flow, displaying optional fields honestly when empty. Do not provide edit/delete actions in this MVP.

- [ ] **Step 5: Add Visão Geral integration**

Query the number of applications received today in São Paulo time, add a simple metric and link to `/aplicacoes`, without changing existing lead metrics or duplicating application records.

- [ ] **Step 6: Run tests, lint and build**

Run: `node --experimental-strip-types --test tests/mentorship-application.test.mjs`, `npm --prefix apps/crm-next run lint` and `npm --prefix apps/crm-next run build`.

Expected: PASS.

---

### Task 5: Apply the migration, verify end to end and release

**Files:**
- Modify only if required by verification: feature files from Tasks 1–4.
- Update: `cofre-uli/01 - Estratégia/Aplicação de Mentoria Entre Potencial e Resultado Integrada ao CRM 2026-08-30.md`

- [ ] **Step 1: Apply the migration to the project-specific Supabase database**

Use the authenticated Supabase project already configured for the CRM. Apply only the new application migration, verify the table, columns, indexes and RLS policies, and do not insert test applicant data into production.

- [ ] **Step 2: Configure and verify environment variables**

Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present in the CRM runtime. Never place a service-role key in the browser or repository.

- [ ] **Step 3: Run the complete local verification**

Run:

```text
npm --prefix apps/crm-next test
npm --prefix apps/crm-next run lint
npm --prefix apps/crm-next run build
git diff --check
```

Expected: all tests, lint, build and whitespace checks pass.

- [ ] **Step 4: Perform non-destructive public verification**

Verify the public application page loads without login, the protected CRM routes still redirect without a session, and the deployed `/aplicacoes` route remains protected. Do not submit a real or fake application to production merely for visual verification.

- [ ] **Step 5: Record the implementation evidence in the vault**

Append the migration name, routes, verification commands, Supabase application result, deployment result and any limitation to the existing Obsidian decision note. Do not record credentials or applicant data.

- [ ] **Step 6: Commit only the feature and documentation files**

```bash
git add apps/crm-next/app/api/aplicacoes apps/crm-next/app/aplicacao apps/crm-next/app/aplicacoes apps/crm-next/components/mentorship-application.tsx apps/crm-next/lib/applications apps/crm-next/app/page.tsx apps/crm-next/app/globals.css apps/crm-next/middleware.ts supabase/migrations/202608300001_mentorship_application.sql tests/mentorship-application.test.mjs cofre-uli/01\ -\ Estratégia/Aplicação\ de\ Mentoria\ Entre\ Potencial\ e\ Resultado\ Integrada\ ao\ CRM\ 2026-08-30.md
git commit -m "feat: integrar aplicação da mentoria ao CRM"
git push origin main
```

Do not stage or alter unrelated existing worktree changes.

- [ ] **Step 7: Confirm deployment**

Use the existing Hostinger Node.js Web App connected to GitHub. The push to `main` must trigger the deployment. Record the deployment status and public route checks separately from local build evidence.
