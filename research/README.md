# NACL Research

This tree contains detailed technical research supporting NACL architecture and implementation.

## Evidence labels

- **VERIFIED** — directly established from repository source, build configuration, CI artifacts, or other recorded evidence.
- **INFERENCE** — reasoned interpretation based on verified evidence.
- **PROPOSAL** — suggested engineering design not yet implemented or proven.
- **UNKNOWN** — requires additional investigation or runtime/device evidence.

## Source-of-truth order

1. Current task and explicit user authorization.
2. Actual repository source/build/artifacts and verified CI results.
3. Current research with evidence labels.
4. `NACL_PROJECT.md` as persistent project-state/context.
5. Older documentation/history as historical evidence.

No project-state document is proof that an implementation exists.

## Continuity

Research is also a persistence mechanism for long investigations. When information influx becomes substantial or interruption risk rises, checkpoint the new evidence here and/or in `NACL_PROJECT.md` before continuing.

If an interruption occurs, read `NACL_PROJECT.md`, then the relevant research files, and verify repository HEAD before resuming.

## Current research areas

- `architecture/` — capability model, loader, ABI, lifecycle, security boundaries.
- `hardware/` — subsystem-specific research.
- `native/` — Android/Linux native interfaces and ELF/linker behavior.
- `ipc/` — IPC protocols and daemon boundaries.
- `validation/` — build, export, runtime, and compatibility verification.
- `decisions/` — durable architectural decisions and rationale.

Current priority: establish an authoritative module/function inventory and loader ABI from actual build/export evidence before implementing a generalized resolver.
