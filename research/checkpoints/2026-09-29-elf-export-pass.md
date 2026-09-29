# Research Checkpoint — ELF Export / Dependency Pass

**Date:** 2026-09-29

## VERIFIED

- Repository: `dannwold/Nacl-unstable`
- Branch: `main`
- Latest research commit: `19d1095f637acfef4604cd85dbea09f5a0804198`
- Native implementation changes: **NONE**
- Research/documentation changes: **AUTHORIZED**
- Successful CI Run #46 built the ARM64 artifact from commit `3ee6099988a70f7a30fc1a899bcd9d080899937c`.
- The artifact was downloaded and inspected directly with:
  - `nm -D --defined-only`
  - `readelf -d` / NEEDED entries
- The artifact contains the actual shared libraries produced by the current native build.

## Key findings

1. The project now has **actual ELF-level proof** for the exported API of the ARM64 build; source declarations are no longer the only evidence.
2. Bluetooth dynamically exports exactly four intended functions:
   - `bt_start_le_scan`
   - `bt_stop_le_scan`
   - `bt_get_discovered_devices`
   - `bt_get_client_version`
3. Bluetooth has no NACL shared-library NEEDED dependency; only Android/system libraries. Its daemon relationship is through the Bluetooth Unix socket.
4. `libshm_client.so` dynamically exports only `main`, making it an anomaly rather than a normal capability ABI.
5. JNI/runtime adapter libraries have to be classified separately from normal C capability libraries:
   - `libdisplay_jni_bridge.so`
   - `libnative_host_bridge.so`
   - `libquickjs_bindings.so`
   - `libmock_client_main.so`
6. Significant NACL-to-NACL dependency edges are now verified:
   - automation → ADB
   - display JNI → display core
   - Vulkan → display core
   - QuickJS bindings → most capability libraries
7. Therefore lazy loading can be genuinely selective, but runtime/binding libraries may intentionally pull in large dependency sets.

## Durable research record

Full evidence is in:
- `research/architecture/public-api-mapping-pass2.md`
- `research/validation/elf-export-and-dependency-inventory.md`
- earlier loader/ABI and export-method research under `research/architecture/` and `research/validation/`

## UNKNOWN

Still unresolved:
- stable/public versus incidental ELF exports for every library
- exact activation requirements
- callback/thread/object lifetime rules
- safe unload policy
- Android permissions/SELinux/UID requirements per capability
- whether all four ABIs expose identical stable symbols
- production versus mock/stub maturity for every capability

## Current phase

**Authoritative module/function inventory and loader-ABI design.**

## Next action

Map each verified dynamic export to:
`header → source definition → signature → owning target → NEEDED dependencies → activation → security → lifetime → maturity`.

Do not implement the generalized resolver yet.

## Authorization boundary

**No native source/CMake/workflow implementation changes are authorized.** Research and project-state documentation updates are authorized.
