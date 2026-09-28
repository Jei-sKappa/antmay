---
type: edit
hash: 58f8a9a40faf830dac061b4acca4917b9d4250bf
---

## replace
```
Update this file when, at that level:
```
```
Change this file, through a delta document a thread drafts and `close-thread` lands, when, at that level:
```

## remove
```
docs/product/                product behavior, one document per capability
docs/architecture/           architecture description, one document per module
```

## remove
```
docs/product/method.md       how this repository works on itself
```

## remove
```
| `docs/product/method.md` | How the method works and how this repository runs it, which skill to reach for. |
| `docs/architecture/suite.md` | How the suite is put together: shared references, distribution, gates. |
```

## replace
```
- Invoke `/consult-decisions` to read the project decisions bearing on what you are about to do — `docs/adr/` and `docs/pdr/` — and `/consult-descriptions` for the product behavior and architecture description the work touches; both are authoritative and carry the rule for a contradiction.
```
```
- Invoke `/consult-decisions` to read the project decisions bearing on what you are about to do — `docs/adr/` and `docs/pdr/`; they are authoritative and carry the rule for a contradiction.
```

## replace
```
- Terms, decisions and descriptions are settled through threads — a thread drafts them as delta documents under its `delta/`, and `close-thread` lands them at close; do not edit the project layer by hand outside that landing.
```
```
- Terms, decisions and the agents files are settled through threads — a thread drafts them as delta documents under its `delta/`, and `close-thread` lands them at close; do not edit the project layer by hand outside that landing.
- `.work/` begins with a dot so that ripgrep and the agent harnesses skip thread history by default; reading it is deliberate — pass `rg --hidden`, or name the path.
```
