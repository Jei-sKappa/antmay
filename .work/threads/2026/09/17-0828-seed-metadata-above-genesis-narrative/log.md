# Thread log
- (decision) remove Supersedes from seed metadata, because threads are historical units of work rather than authoritative versions and every meaningful form of supersession already belongs to the log, spec, or ADR layer
- (decision) represent applicable seed metadata as YAML frontmatter before the title, because it gives structural relationships a recognizable boundary from the genesis narrative and makes those fields straightforward to query
- (decision) seed frontmatter uses lowercase external and roadmap keys, with roadmap.path and roadmap.entry nested together, because the path and entry slug form one inseparable relationship and should expose stable query paths
- (constraint) YAML frontmatter applies only to seeds created after the format changes, because existing seeds are written-once historical thread artifacts and must not be migrated
