| Term | Meaning |
| --- | --- |
| **thread log** | `log.md`, the thread's append-only memory: `discussion` and `resolve-pending-decisions` record settled points, `spec` records authoring events, and `close-thread` records successful closure; later entries supersede earlier ones on the same point while history remains intact. |
| **closing** | The operation that ends a thread by checking it, landing its delta into the project layer, writing the closing line beneath its roadmap entry when one exists, and appending the closing event to its thread log; the folder stays where it is. |
