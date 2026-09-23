---
type: edit
hash: 22b7e9a09d23f96ec6b82f1e1930870a7e5f5bb7
---

## replace
```
- A thread's design of one change is its change document, which holds only what is thread-only and cites the thread's delta documents for every standing behavior or structure the change adds, replaces or removes.
```
```
- A thread's design of one change is its spec, which holds only what is thread-only and cites the thread's delta documents for every standing behavior or structure the change adds, replaces or removes.
```

## replace
```
- A thread stays where it is once its work is delivered, as the record of how the work was understood while it was being done.
```
```
- A thread stays where it is once its work is delivered, as the record of how the work was understood while it was being done.
- Every skill that reads a thread treats any other thread as history and reads it only when the user or the thread's seed names it.
```

## replace
```
- A design that has settled is written down by `change`, which leaves the change document, the thread's delta documents under `delta/`, and one event line in the log.
- A change document and its delta are judged as a downstream handoff by `review-change`, before anyone plans from them.
```
```
- A design that has settled is written down by `spec`, which leaves the spec, the thread's delta documents under `delta/`, and one event line in the log.
- A spec and its delta are judged as a downstream handoff by `review-spec`, before anyone plans from them.
```

## replace
```
- A plan that must be made to match the change document before anyone builds from it goes to `check-plan`, which corrects that plan folder in place.
```
```
- A plan that must be made to match the spec before anyone builds from it goes to `check-plan`, which corrects that plan folder in place.
```

## replace
```
- The implementation report is the one home of traceability: its acceptance table carries one row per criterion of the change document, with the method and the evidence for each.
```
```
- The implementation report is the one home of traceability: its acceptance table carries one row per criterion of the spec, with the method and the evidence for each.
```
