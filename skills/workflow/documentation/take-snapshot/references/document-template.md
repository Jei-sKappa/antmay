# Document template

The snapshot has these sections in this order. Skip a section if it would be genuinely empty; don't pad.

## 1. Methodology preamble

A short block at the very top, before any other section. It records:

- Skill name and version that produced the run.
- Date of generation.
- Source root inspected (absolute or repo-relative path).
- Scope filter applied, if any (subdirectory limit).
- A one-line statement that the document is a frozen snapshot of the application at the time of generation, bounded by what's observable in code plus answers to Open Questions, and is **not** stack-specific guidance.
- A bulleted list of *what was inspected* (the angles that ran) and *what was not* (anything the orchestrator deliberately did not look at — e.g. backend code in a frontend-only run, generated files, vendored dependencies).

The preamble exists so reviewers can calibrate confidence without reading every requirement.

## 2. Product overview

Non-technical framing. What the application is, who uses it, what problems it solves, the high-level user journeys. Inferred from screens, routes, copy, README content, and feature folders.

If the source is silent on intent (no README, no in-app copy, no obvious user-facing naming), state that explicitly and ask for product framing in Open Questions — do not invent positioning.

## 3. Feature inventory

A flat list of every user-facing feature the orchestrator could identify, grouped by area. One short paragraph per feature: what it does from the user's perspective. No requirements yet, no IDs yet — this section is the bridge between product framing and the formal FR list. PMs should be able to read this and confirm the feature map before engineers consume the FRs.

## 4. Functional requirements

Numbered list with stable IDs scoped to this document. Format per item:

```
#### FR-0042 — <short title>

**Statement.** <One paragraph stating what the system must do. Active voice. Testable.>

**Acceptance.** <Bulleted conditions a tester or downstream implementer could verify against.>

**Trace.** <Source files, route paths, function names, or other evidence pointers. Multiple entries allowed.>

**Notes.** <Optional. Edge cases, related FRs, dependencies.>
```

- **IDs are zero-padded to 4 digits** (`FR-0001`, `FR-0002`, …); the skill's `## ID assignment` section governs how they are numbered and scoped.
- Group requirements by feature area with `###` subheadings.
- Every FR must have at least one entry under **Trace**, or it must explicitly say `Trace: derived from <screen/route/observable behavior>, no single source file owns it`. Untraceable FRs are red flags — surface them in Open Questions if you suspect you're guessing.

## 5. Non-functional requirements

Same shape as FRs but `NFR-XXXX`. Cover only what is observable or strongly implied by code:

- Performance budgets visible in code (timeouts, debounces, cache TTLs).
- Security postures (auth scheme, password rules, session handling, transport).
- Accessibility commitments visible in markup/semantics (ARIA roles, focus management, contrast tokens).
- Internationalization (locales supported, translation pipeline, RTL handling).
- Observability (logging levels, telemetry endpoints, error boundaries).
- Offline / connectivity behavior (caching layers, retry policies, queueing).
- Compatibility (minimum platform versions declared in manifests or build config).

Do **not** invent NFRs the code is silent on ("the rebuild should be performant" is filler). If an NFR feels obviously required but isn't expressed anywhere in the source, put it in Open Questions, not in this section.

## 6. Technical architecture

A description of the *logical* architecture — components, modules, data flow, persistence boundaries, external integrations — **without naming the source stack**. Write as if explaining to a senior engineer who will pick the rebuild stack themselves: "a layer that owns user session state and persists it across app restarts", not "a Zustand store with persist middleware".

Sub-sections to include when relevant:

- **Components and responsibilities** — logical building blocks.
- **Data model** — entities, relationships, key fields, identifiers. Use stack-neutral notation (a simple table or ER-style prose).
- **External integrations** — APIs consumed, endpoints, payload shapes, authentication mode, webhooks, third-party SDKs (named by what they *do* where possible: "a transactional email provider" rather than "SendGrid", unless the provider identity is itself a requirement).
- **Configuration surface** — environment variables, feature flags, runtime config keys. List names and what each controls. Never list secret values.
- **Permissions and manifests** — device/platform permissions requested, declared capabilities, deep link / universal link routes, push notification channels.
- **Build and deployment surface** — what gets built, what gets deployed where. Describe outputs, not toolchain.

## 7. Business rules and edge cases

The "if X then Y" rules the application encodes — validation rules, calculation formulas, state machines, eligibility checks, throttling and quota logic, retry behavior, conflict resolution. Each rule gets its own item; cross-reference the FRs it supports.

This section often surfaces the highest-leverage gaps for a rebuild, because business rules are the most expensive to lose. Be exhaustive.

## 8. Glossary

Domain terms used in the document with one-line definitions. Helps PMs and engineers stay aligned. Skip if the domain language is trivially common.

## 9. Open Questions

Everything the code cannot answer, consolidated here and nowhere else — don't scatter `TODO`s through the rest of the document. One item per question. Each item should:

- Pose the question precisely.
- State why the code cannot answer it (server-side rule, design decision in Figma/Jira, A/B experiment config, push-notification payload semantics decided on the server, etc.).
- Identify who is likely to know (backend team, PM, designer, etc.) when that's inferable.
- Cross-reference the FRs/NFRs/rules that depend on the answer.

This section is **never empty in practice**. If it appears empty, the orchestrator probably guessed somewhere — re-check.
