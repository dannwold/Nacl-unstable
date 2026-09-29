# NACL Current Architecture Audit

**Date:** 2026-09-29  
**Repository:** `dannwold/Nacl-unstable`  
**HEAD verified during checkpoint:** `1f34b7b1a747ffd2dc9ef74887d220a3a787c4bc`

## VERIFIED

The repository contains a substantial native subsystem/build foundation and already implements the basic lazy dynamic-loading primitives:

- `dlopen()` for loading shared libraries.
- `dlsym()` for resolving individual exported symbols.
- A core loader API in `sdk/include/android_core.h` / `sdk/src/android_core.c`.
- Numerous independent subsystem shared libraries and daemon executables.

The current core loader has a seven-module registry, while the build contains substantially more native targets.

A separate `sdk/include/nacl_unified_api.h` declares a 21-module API, but the inspected source inventory does not establish a corresponding implementation of its lifecycle/orchestration API.

The native host bridge expects `initialize_core_registry`, while the inspected core implementation does not export that symbol.

The host-side `NaclBridge.kt` contains Dart FFI code and expects symbol names that do not align with the current core-loader ABI.

## VERIFIED: architectural layers currently coexist

1. Native subsystem implementations.
2. Individual shared libraries.
3. Seven-module core loader.
4. Twenty-one-module unified API declaration.
5. Native/JNI and Dart/FFI host integrations.
6. QuickJS bindings.
7. Separate daemon/IPC and privilege-broker paths.

These layers are not yet one authoritative ABI.

## INFERENCE

The dominant engineering problem is architectural convergence rather than absence of dynamic loading.

Adding another independent loader without reconciling the existing layers would increase duplication and make continuity harder.

## PROPOSAL

Build the eventual generic resolver around a verified registry derived from:

- actual CMake targets;
- actual ELF dynamic exports;
- public headers;
- runtime dependency/activation requirements;
- explicit stable-ABI classification.

Keep library loading, symbol resolution, and capability activation as separate lifecycle stages.

## Current non-code-change boundary

No native loader implementation change is authorized by the current project state. Documentation/research consolidation is authorized.
