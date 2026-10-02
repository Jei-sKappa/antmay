---
type: edit
hash: 6d4729be1e76afda9a4455da0494f6fc7c4506d9
---

## replace
```
| **delta document** | One file in a thread's delta naming one project-layer file as its target and one of three types: `create`, whose body is the whole new file; `edit`, whose body is literal `add`, `replace` and `remove` operations against the target's recorded blob hash; or `delete`, which names the target and its hash and nothing else. [suite/shared/references/formats/delta-document.md](../suite/shared/references/formats/delta-document.md) |
```
```
| **delta document** | One file in a thread's delta naming one project-layer file as its target and one of three types: `create`, the whole new file written literally at the target's mirrored path; `edit`, a JSON document of ordered exact-text edits, each an `old_string` unique in the target, a `new_string` and an optional `replace_all`; or `delete`, a JSON document carrying its type alone. [suite/shared/references/formats/delta-document.md](../suite/shared/references/formats/delta-document.md) |
```

## replace
```
| **shared reference** | Passive canonical material under `suite/shared/references/` — the formats, the instructions, and tracker material — declared in `suite/shared/manifest.yaml` and mirrored into each declaring skill by the sync script. The mirrored copies are generated, never hand-edited. [suite/authoring/shared-references.md](../suite/authoring/shared-references.md) |
```
```
| **shared reference** | Canonical material under `suite/shared/references/` — the formats, the instructions, tracker material, and the scripts a skill runs — declared in `suite/shared/manifest.yaml` and mirrored into each declaring skill by the sync script. The mirrored copies are generated, never hand-edited. [suite/authoring/shared-references.md](../suite/authoring/shared-references.md) |
```
