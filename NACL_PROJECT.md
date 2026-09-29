# NACL-UNSTABLE — Project Working Record

> Persistent engineering/context file for continuing work on `dannwold/Nacl-unstable`.
> This file records verified repository state, architecture, implementation findings, uncertainties, decisions, and next moves.
> It deliberately records concise engineering reasoning rather than private chain-of-thought.

## 1. Audit Snapshot

- Repository: `dannwold/Nacl-unstable`
- Audited branch: `main`
- Audited baseline commit: `e033a2e6c70b89a2ed9e4346e15182603a70f86a`
- Current repository HEAD: `35f87c3db2abccf83a189965a8d13e295b72e19f`
- Current HEAD commit: **Add persistent NACL project working record**
- The current HEAD adds/updates this project record; the native implementation baseline remains the `e033a2e6` state audited below.
- Repository tree at audit time: **129 tracked blob files**
- Companion source material read for this audit:
  - `Continue Nacl Loading Implementation.PDF`
  - `GitHub Access Status.PDF`
- The two PDFs contain prior NACL/GitHub project history and were read through their complete extracted text, including the previous CI investigation and the agreed direction for lazy/function-level loading.

## 2. User's Actual NACL Objective

The central implementation goal is:

**NACL should load native capability libraries/subsystems on demand and resolve individual exported functions/symbols only when needed, rather than eagerly loading the complete native capability set.**

Important technical distinction:

- ELF/`dlopen()` loads a shared object as a unit.
- `dlsym()` resolves an individual exported symbol inside that already-loaded object.
- Therefore the practical design target is **lazy module loading + function-level symbol resolution + controlled initialization**, not physically loading a single function out of an ELF `.so`.

The existing repository already contains the beginning of this mechanism.

## 3. Current Core Loader

### Public core API

`sdk/include/android_core.h` defines:

- `NaclContext`
- `NaclModuleType`
- `NaclModuleEntry`
- `nacl_core_initialize()`
- `nacl_core_shutdown()`
- `nacl_core_load_module()`
- `nacl_core_unload_module()`
- `nacl_core_get_symbol()`
- `nacl_core_is_module_loaded()`
- error/version/API-level helpers

### Actual implementation

`sdk/src/android_core.c` maintains:

- a mutex
- last-error storage
- a fixed module registry
- Android SDK level

The registry currently has only seven module types:

1. core
2. bluetooth
3. wifi
4. sensors
5. location
6. ipc
7. system

For non-core modules, `nacl_core_load_module()` calls:

```c
dlopen(path, RTLD_NOW | RTLD_GLOBAL)
```

and records the resulting handle.

`nacl_core_get_symbol()` automatically loads an unloaded module and then calls:

```c
dlsym(handle, symbol_name)
```

This is already lazy module loading and lazy symbol lookup at the core-loader level.

### Important current limitations

The registry paths are not aligned with the current CMake targets. Examples in `android_core.c` include:

- `libbluetooth_client.so`
- `libwifi_client.so`
- `libsensors_client.so`
- `liblocation_client.so`
- `libipc_client.so`
- `libsystem_client.so`

Several of those are not corresponding current build targets in `sdk/CMakeLists.txt`.

The loader also uses `RTLD_NOW | RTLD_GLOBAL`, so once a module is requested the library's relocations are resolved immediately and its symbols enter the global namespace. Whether `RTLD_LOCAL`, `RTLD_LAZY`, reference counting, or a richer lifecycle is appropriate should be decided deliberately rather than changed blindly.

## 4. Major API Split That Must Be Reconciled

There are currently **two different public API models**.

### Legacy/core-loader model

`sdk/include/android_core.h`

- seven-module `NaclModuleType`
- `NaclResult`
- `NaclContext`
- `nacl_core_*` functions

### Unified public model

`sdk/include/nacl_unified_api.h`

Declares a **21-module** `NaclModuleId` model and a different status/event API, including:

- `nacl_init()`
- `nacl_shutdown()`
- `nacl_get_subsystem_meta()`
- `nacl_register_event_callback()`
- `nacl_set_subsystem_mock_mode()`
- `nacl_dispatch_command()`

The 21 declared modules include core, Bluetooth, Wi-Fi, NFC, USB, camera, location, sensors, audio, display, input, storage, network, process, IPC, system, power, battery, telephony, media, and security.

### Verified mismatch

A repository code search shows the unified `nacl_init()`/callback API is declared and documented, but the actual implementation inventory does not show a corresponding implementation source for those unified lifecycle functions.

Conversely, the implemented core loader exposes `nacl_core_initialize()`, `nacl_core_load_module()`, and `nacl_core_get_symbol()`.

This is a central architectural issue, not a cosmetic naming issue.

## 5. QuickJS Layer

`sdk/src/quickjs_core_binding.c` directly wraps the implemented core-loader API.

It exposes operations corresponding to:

- core initialization
- SDK-version lookup
- system-property lookup
- module loading
- loaded-state checking

Its module-name mapping covers the same limited set of six non-core modules currently represented by the core loader.

This means QuickJS currently follows the **seven-module core-loader architecture**, not the 21-module unified API.

`quickjs_final_subsystems_bindings.c` separately exposes location, audio, input, storage, and power/battery operations.

`quickjs_stub.c` supplies weak placeholder QuickJS symbols so the native build can link without a full QuickJS runtime implementation.

## 6. Native Host / JNI Boundary

`sdk/src/native_host_bridge.cpp` provides the JNI-facing bootstrap bridge.

Observed behavior:

1. caches `JavaVM*`
2. creates a thread-local cleanup key
3. supports attaching native worker threads to the JVM
4. caches the Android application context
5. constructs a core library path under the supplied private directory
6. calls `dlopen()` on `libandroid_core.so`
7. calls `dlsym()` for `initialize_core_registry`
8. invokes that symbol
9. keeps the core handle in a global runtime structure

### Critical mismatch

The current `android_core.c` implementation inspected in this audit does **not** define `initialize_core_registry`.

Therefore the JNI bootstrap bridge and the actual core-loader implementation are not currently aligned.

The host bridge also expects the core library to expose a bootstrap symbol that the current core source does not provide.

## 7. Host App Boundary

The host-side file named:

`host_app/app/src/main/java/com/your/app/NaclBridge.kt`

currently contains **Dart FFI code**, not Kotlin.

It imports:

- `dart:ffi`
- `dart:typed_data`
- `dart:async`
- `package:ffi/ffi.dart`

It attempts to open:

```
libandroid_core.so
```

and look up symbols named:

- `nacl_initialize`
- `nacl_set_subsystem_mock_mode`
- `nacl_register_event_listener`

These names do not match the current `android_core.h` core API or the 21-module unified header exactly.

This is another integration boundary that must be reconciled before a clean end-to-end API can be considered complete.

## 8. Current CMake / Native Build

The active `sdk/CMakeLists.txt` builds a substantially larger native set than the old core registry.

Current targets include, among others:

- `android_core`
- `sensors_client`
- `sensors_daemon`
- `telephony_client`
- `bluetooth_client`
- `bluetooth_svc`
- `ipc_crypto`
- `shm_client`
- `shm_daemon`
- `display_core`
- `vulkan_renderer`
- `display_jni_bridge`
- `display_media`
- `adb_client`
- `privilege_broker`
- `privilege_broker_daemon`
- `routing_core`
- `usb_subsystem`
- `camera_subsystem`
- `nfc_subsystem`
- `nacl_input`
- `nacl_audio`
- `nacl_location`
- `nacl_storage`
- `power_battery`
- `connectivity_automation`
- `native_host_bridge`
- `service_daemon`
- `mock_client_main`
- `quickjs_bindings`

The build is therefore ahead of the core module registry.

## 9. IPC / Privilege Broker

The privilege-broker layer is implemented separately from the core dynamic loader.

`nacl_privilege_broker.h` defines:

- direct
- UID 2000
- Shizuku
- ADB

backend identifiers

and capability identifiers for Wi-Fi, Bluetooth, location, sensors, battery, and system properties.

The current broker capability implementation explicitly advertises only:

- Bluetooth scan
- Wi-Fi scan

The broker uses a fixed binary IPC envelope. The current code deliberately does not accept caller-supplied shell command strings.

The latest commit `e033a2e6` changed `nacl_privilege_broker_get_backend()` so the GET_BACKEND request sends no payload. This matches the daemon's current protocol branch, which expects zero payload for that command.

### Current implementation status

The broker has meaningful protocol validation and bounded payload handling, but backend availability currently reports only direct mode as available; UID 2000, Shizuku, and ADB are currently returned unavailable by the client-side availability function.

## 10. Bluetooth

`libbluetooth_client.c` exports:

- `bt_start_le_scan()`
- `bt_stop_le_scan()`
- `bt_get_discovered_devices()`
- `bt_get_client_version()`

The client communicates through the Bluetooth Unix-domain socket.

This is a good concrete candidate for the eventual function-level lazy-resolution design because it has a small, explicit exported C surface.

The client and daemon architecture is separate from the core loader: loading the client `.so` does not itself mean the Bluetooth service is necessarily operational.

## 11. Service Daemon / IPC Observations

`service_daemon.c` implements a Unix-domain socket server with epoll.

It currently contains mock/placeholder responses for Wi-Fi and Bluetooth commands rather than a complete hardware implementation.

The socket layout uses:

`/data/local/tmp/sdk/sockets/`

The code assumes shell/UID-2000 style access in several places.

The repository therefore contains both:

- a conceptual modular native SDK
- partially implemented privileged/service plumbing

and these should not be treated as equivalent maturity levels.

## 12. Android/Treble Strategy Documented by the Project

`docs/linking-journey.md` describes a strategy of relocating packaged native libraries into an application-private writable/executable location before dynamic loading.

The documented architecture is intended to avoid arbitrary loading from problematic writable system locations and to keep the native runtime within the application's usable namespace.

The document also describes an AES-256-GCM IPC boundary and Android Keystore/TEE-backed key material.

These security claims should be treated as design documentation until verified against the actual current implementation and Android runtime behavior.

## 13. CI State

The previous project discussion established that the GitHub Actions visibility problem was a **tooling/API filtering problem**, not a missing workflow trigger.

The active workflow is:

`.github/workflows/ndk-build.yml`

It:

- runs on pushes to main/master/dev/develop
- runs on pull requests to main/master
- supports manual dispatch
- pins Android NDK 25.2.9519653
- uses CMake 3.22.1
- builds four ABIs:
  - arm64-v8a
  - armeabi-v7a
  - x86_64
  - x86
- stages `.so` libraries and daemon binaries
- packages a combined SDK artifact

The prior chat verified:

- Run **#33**
- commit `e033a2e6`
- event: push
- status: completed
- conclusion: success

The live Actions API now also verifies:

- Run **#34**
- commit `35f87c3d`
- event: push
- status: completed
- conclusion: success
- workflow: Android NDK Multi-ABI Compiler

When checking future push-triggered runs, use the direct Actions API route rather than the known commit-workflow-runs wrapper that filters to pull-request-triggered runs.

## 14. Documentation Drift

The repository documentation is not fully synchronized with the current tree.

For example, `docs/directory-map.md` describes an older **81-file** workspace while the current Git tree contains **129 blob files**.

It also references files/layouts that do not exactly match the current tree.

Therefore documentation should be treated as historical/project documentation until reconciled with the current source tree.

## 15. Function-Level Lazy Loading — Intended Direction

The preferred architecture should preserve the existing working idea rather than invent an unrelated loader.

Conceptually:

```
caller
  |
  v
resolve(module, symbol)
  |
  +--> module already loaded?
  |       |
  |       +-- no --> dlopen(module)
  |
  v
dlsym(handle, symbol)
  |
  v
typed function pointer
```

The next design should likely introduce a **generic function-resolution layer** that:

1. identifies the owning module;
2. loads only that module when required;
3. resolves the requested exported symbol;
4. returns a correctly typed/validated function pointer to the caller;
5. keeps module lifetime safe while the function is in use;
6. provides consistent error reporting;
7. avoids forcing every subsystem to load at initialization.

Before changing the public API, the exported symbols of the actual subsystem libraries need to be inventoried and mapped to their owning modules.

## 16. Important Unknowns To Resolve Before Refactoring

- Which native functions are intended to be public/stable?
- Which current CMake target owns each function?
- Which library paths are correct for packaged/private-directory deployment?
- Which modules actually exist versus which are only declared in the unified API?
- Which libraries have initialization side effects?
- Which libraries depend on other libraries?
- Which libraries can safely be unloaded?
- Whether `RTLD_NOW | RTLD_GLOBAL` is intentional for all modules.
- Whether the unified 21-module API is the intended future public ABI or whether the seven-module core API is the real foundation.
- How the Dart FFI bridge is intended to coexist with the C/C++ JNI bridge.
- Which QuickJS ABI/runtime is ultimately expected.
- Which privileged backends are intended to be operational in the target Android environment.

## 17. Working Thoughts / Ideas

### Current engineering view

The repository is not missing the basic mechanism for lazy loading. The main problem is **architectural convergence**: several generations of API, loader, host bridge, documentation, and build targets exist simultaneously.

The most valuable next step is therefore not to immediately add another loader abstraction. First establish one authoritative module/function registry from the code that actually builds and exports symbols.

### Candidate design

A registry could conceptually associate:

- module ID
- canonical module name
- actual `.so` filename/path
- exported function name
- function signature/type identifier
- dependencies
- initialization requirements
- unload policy
- capability/availability metadata

Then the generic resolver can become the single path used by C, QuickJS, JNI/FFI adapters, and eventually other host integrations.

### Why

This would make the user's desired behavior the normal architecture rather than a special helper layered on top of an inconsistent module registry.

### Caution

Do not assume that every function should be dynamically looked up by arbitrary string from application code. A typed/generated registry is safer and easier to validate.

### Another important distinction

"Lazy loading" has at least three levels in this project:

1. **library loading** — `dlopen()`
2. **symbol resolution** — `dlsym()`
3. **subsystem initialization/activation** — starting daemons, opening devices, registering callbacks, allocating resources

The project currently mixes these concepts. They should be separated.

## 18. Approval / Change Discipline

For future work:

- Inspect first.
- Explain the intended change.
- Distinguish verified facts from design proposals.
- Do not silently rewrite architecture because a cleaner design is possible.
- Keep CI green.
- Prefer small, testable changes.
- Update this file when a meaningful architectural decision or implementation state changes.

## 19. Initial Priority Order

1. **Establish authoritative module/function inventory.**
2. **Reconcile `android_core.h` vs `nacl_unified_api.h`.**
3. **Reconcile loader registry vs actual CMake targets/output names.**
4. **Reconcile JNI/native-host symbol expectations with actual exported symbols.**
5. **Reconcile host FFI symbol names and signatures with the authoritative ABI.**
6. **Design the typed function-resolution layer around real exported functions.**
7. **Add focused tests for load/resolve/error/unload behavior.**
8. **Then expand subsystem-by-subsystem lazy loading.**
9. **Keep documentation/status synchronized with the actual tree.**

## 20. Repository File Inventory

The current Git tree contains 129 blob files.

### Root / build / web shell

- `.env.example`
- `.gitignore`
- `CMakeLists.txt`
- `index.html`
- `metadata.json`
- `package.json`
- `postcss.config.js`
- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`

### GitHub Actions

- `.github/workflows/ndk-build.yml`

### Documentation

- `docs/README.md`
- `docs/_sidebar.md`
- `docs/directory-map.md`
- `docs/index.html`
- `docs/linking-journey.md`
- `docs/maintenance.md`
- `docs/subsystem-adb.md`
- `docs/subsystem-build.md`
- `docs/subsystem-connectivity.md`
- `docs/subsystem-core.md`
- `docs/subsystem-crypto.md`
- `docs/subsystem-eventfd.md`
- `docs/subsystem-graphics.md`
- `docs/subsystem-hardware.md`
- `docs/subsystem-routing.md`
- `docs/subsystem-sensors.md`
- `docs/subsystem-shm.md`
- `docs/troubleshooting.md`
- `docs/unified-api.md`

### Host app

- `host_app/app/build.gradle`
- `host_app/app/src/main/java/com/your/app/AudioWaveformWidget.kt`
- `host_app/app/src/main/java/com/your/app/CellTowerMetricDecoder.kt`
- `host_app/app/src/main/java/com/your/app/NaclAudioBridge.kt`
- `host_app/app/src/main/java/com/your/app/NaclBridge.kt`
- `host_app/app/src/main/java/com/your/app/NaclOverlayService.kt`
- `host_app/app/src/main/java/com/your/app/NaclUsbBridge.kt`
- `host_app/app/src/main/java/com/your/app/SignalGaugeWidget.kt`
- `host_app/app/src/main/java/com/your/app/bootstrap/HostAppBootstrapper.java`
- `host_app/app/src/main/java/com/your/app/bootstrap/MainActivity.java`

### SDK configuration

- `sdk/CMakeLists.txt`
- `sdk/config/build_and_deploy.sh`
- `sdk/config/deploy_abi_target.sh`
- `sdk/config/multi_process_debug.sh`

### SDK headers

- `sdk/include/adb_client.h`
- `sdk/include/android_core.h`
- `sdk/include/audio.h`
- `sdk/include/audio_waveform_common.h`
- `sdk/include/automation_common.h`
- `sdk/include/bluetooth_client.h`
- `sdk/include/bluetooth_ipc_common.h`
- `sdk/include/camera_subsystem.h`
- `sdk/include/display_media.h`
- `sdk/include/input.h`
- `sdk/include/ipc_common.h`
- `sdk/include/ipc_crypto.h`
- `sdk/include/location.h`
- `sdk/include/nacl_display.h`
- `sdk/include/nacl_privilege_broker.h`
- `sdk/include/nacl_unified_api.h`
- `sdk/include/nfc_subsystem.h`
- `sdk/include/power_battery.h`
- `sdk/include/quickjs.h`
- `sdk/include/quickjs_eventfd_bridge.h`
- `sdk/include/routing_core.h`
- `sdk/include/sensor_ipc_common.h`
- `sdk/include/shm_common.h`
- `sdk/include/shm_ring_buffer.h`
- `sdk/include/storage.h`
- `sdk/include/telephony_common.h`
- `sdk/include/usb_subsystem.h`
- `sdk/include/vulkan/vulkan_android.h`
- `sdk/include/vulkan_renderer.h`

### SDK native sources

- `sdk/src/adb_client.c`
- `sdk/src/android_core.c`
- `sdk/src/audio.c`
- `sdk/src/bluetooth_svc.cpp`
- `sdk/src/camera_subsystem.c`
- `sdk/src/client_bridge.c`
- `sdk/src/connectivity_automation.c`
- `sdk/src/display.cpp`
- `sdk/src/display_jni_bridge.cpp`
- `sdk/src/display_media.c`
- `sdk/src/input.c`
- `sdk/src/ipc_crypto.c`
- `sdk/src/libbluetooth_client.c`
- `sdk/src/location.c`
- `sdk/src/mock_client_main.c`
- `sdk/src/native_host_bridge.cpp`
- `sdk/src/nfc_subsystem.c`
- `sdk/src/power_battery.c`
- `sdk/src/privilege_broker.c`
- `sdk/src/privilege_broker_daemon.c`
- `sdk/src/quickjs_adb_binding.c`
- `sdk/src/quickjs_automation_binding.c`
- `sdk/src/quickjs_bluetooth_binding.c`
- `sdk/src/quickjs_core_binding.c`
- `sdk/src/quickjs_crypto_binding.c`
- `sdk/src/quickjs_eventfd_bridge.c`
- `sdk/src/quickjs_eventfd_bridge_binding.c`
- `sdk/src/quickjs_final_subsystems_bindings.c`
- `sdk/src/quickjs_routing_binding.c`
- `sdk/src/quickjs_sensors_binding.c`
- `sdk/src/quickjs_shm_binding.c`
- `sdk/src/quickjs_stub.c`
- `sdk/src/quickjs_telephony_binding.c`
- `sdk/src/routing_core.c`
- `sdk/src/sensors_client.c`
- `sdk/src/sensors_daemon.c`
- `sdk/src/service_daemon.c`
- `sdk/src/shm_client.c`
- `sdk/src/shm_daemon.c`
- `sdk/src/storage.c`
- `sdk/src/telephony_client.c`
- `sdk/src/usb_subsystem.c`
- `sdk/src/vulkan_renderer.c`

### Web/UI sources

- `src/App.tsx`
- `src/components/AdbTerminal.tsx`
- `src/components/AudioWaveformWidget.tsx`
- `src/components/DocsViewer.tsx`
- `src/components/QuickJsSandbox.tsx`
- `src/components/SignalGaugeWidget.tsx`
- `src/components/SubsystemInspector.tsx`
- `src/components/TrebleRelocator.tsx`
- `src/data/docs.ts`
- `src/data/subsystems.ts`
- `src/index.css`
- `src/main.tsx`
- `src/types.ts`

## 21. Audit Conclusion

The repository has a real, buildable native subsystem foundation and already contains the core primitive required for the requested behavior: lazy `dlopen()` followed by targeted `dlsym()`.

The primary blocker is not the absence of dynamic loading. It is **inconsistent generations of the public API and runtime integration surrounding that loader**.

The next implementation phase should therefore begin with a verified symbol/module map and ABI reconciliation, followed by a typed generic resolver. This keeps the project aligned with the actual code rather than layering another abstraction over mismatched interfaces.


## 21. Deep Audit Findings — 2026-09-29

### Loader finding
The requested lazy/function-level behavior is already partially implemented in sdk/src/android_core.c: nacl_core_get_symbol() automatically loads an unloaded module and then calls dlsym(). The missing piece is not basic dynamic lookup; it is a coherent ABI and registry around that mechanism.

### Build/registry finding
The current sdk/CMakeLists.txt builds substantially more targets than the seven-module NaclModuleType registry. Several registry paths point to libraries that are not current CMake targets, while current targets such as nacl_audio, nacl_input, nacl_storage, power_battery, camera_subsystem, nfc_subsystem, and usb_subsystem have no corresponding entries in the core registry.

### Unified-API finding
nacl_unified_api.h declares a 21-module public ABI, but the inspected native source inventory does not provide the declared unified lifecycle/orchestration implementation (nacl_init, nacl_shutdown, metadata, event registration, mock-mode control, command dispatch). The seven-module core API is the implemented loader path.

### JNI bootstrap finding
native_host_bridge.cpp dynamically loads libandroid_core.so and looks for initialize_core_registry. The inspected android_core.c does not export that symbol. This makes the current native-host bootstrap path inconsistent with the actual core implementation.

### Host-bridge finding
host_app/app/src/main/java/com/your/app/NaclBridge.kt is named like Kotlin but contains Dart FFI syntax/imports (dart:ffi, package:ffi/ffi.dart). It looks up nacl_initialize, nacl_set_subsystem_mock_mode, and nacl_register_event_listener, which are not the symbols exported by the inspected core header/source. This host integration cannot currently be treated as a verified ABI consumer.

### Dynamic-loading pattern outside the core
The repository independently uses dlopen/dlsym in multiple places, notably ADB crypto, IPC crypto, sensor daemon compatibility lookup, Bluetooth runtime setup, and routing. These are separate local dynamic-loading mechanisms, not yet unified under the NACL core loader.

### Runtime maturity finding
Several subsystem implementations are explicitly simulation-oriented or incomplete: audio/input/location/power use synthetic telemetry or placeholder operations; the Bluetooth daemon generates mock BLE telemetry; the generic service daemon returns mock Wi-Fi/Bluetooth acknowledgements; the routing layer returns simulated Binder/JNI success strings. These implementations should be classified as mocks/stubs versus production hardware paths in the eventual module/function registry.

### IPC finding
The privilege broker is more concrete than several subsystem mocks: it validates a fixed binary protocol, bounds payloads, requires UID 2000 on the daemon side, and currently dispatches Bluetooth scan and Wi-Fi scan. The latest backend-query protocol change is internally consistent, and the live CI result confirms the change builds.

### Documentation finding
The repository contains generated/historical documentation that describes older file counts and older CMake layouts. docs/directory-map.md still describes an 81-file workspace, while the current Git tree contains 129 blob files. Documentation is therefore evidence of intended architecture/history, not automatically proof of current implementation.

### CI finding
The push-triggered workflow is functioning. The previous visibility issue was caused by the GitHub connector's commit-run wrapper filtering to pull-request-triggered runs. Direct Actions API inspection now sees push runs. Current Run #34 is green on the project-record commit.

## 22. Deep Audit Working Thoughts

**Current thought:** Do not add another generic loader blindly. First make the existing seven-module loader authoritative for one concrete slice, preferably Bluetooth, because its client library has a small explicit exported C ABI and a separate daemon boundary.

**Proposed sequence:**
1. Inventory every intended exported function and its owning CMake target.
2. Define canonical module IDs/names/paths from actual build outputs, not stale documentation.
3. Add typed function descriptors/signatures rather than exposing arbitrary string casts throughout callers.
4. Separate module lifetime from subsystem activation. dlopen/dlsym should not be conflated with starting a daemon, opening a device, or registering callbacks.
5. Reconcile the seven-module API and 21-module unified API before making either one the public long-term ABI.
6. Reconcile native-host/JNI and Dart/FFI consumers against that same ABI.
7. Add focused loader tests before expanding the architecture.

**Important safety concern:** unloading a module while a cached function pointer, callback, worker thread, or subsystem object still depends on it is unsafe. Any future resolver should make lifetime ownership explicit.

**Important ABI concern:** function-pointer casts from void* returned by dlsym() need a controlled, documented ABI boundary. The registry should own signatures rather than making each caller invent its own cast.

## 23. Current Project State

- Branch: main
- Current HEAD: 89e54328f22220d896d46635a3c29b97d3d7bc39
- Native baseline under active architectural analysis: e033a2e6c70b89a2ed9e4346e15182603a70f86a
- Repository tree: 129 blob files
- Latest CI: Run #35, push, completed/success
- No loader implementation changes have been made during this audit.
- Persistent project record: NACL_PROJECT.md

## 24. Next Engineering Target

The next implementation task should be authoritative module/function inventory and loader-ABI design, not yet a broad refactor.

The first concrete deliverable should answer, from current source/build evidence:
- Which .so owns each public function?
- What is the canonical load path for each .so?
- What dependencies must be loaded with it?
- What initialization/activation does the function require after symbol resolution?
- What function-pointer signature does the resolver guarantee?
- When is unloading forbidden because active work still references the module?

Only after that map is stable should the generic function-level lazy resolver be implemented.

## 25. Audit Conclusion

The repository has a real native subsystem foundation and already contains the core primitive required for lazy loading: lazy dlopen followed by targeted dlsym. The dominant problem is architectural convergence across the loader registry, unified API, build outputs, host bridges, runtime activation, and documentation.

---
**Last audited repository HEAD:** 35f87c3db2abccf83a189965a8d13e295b72e19f


## 26. Authoritative Preliminary Module / Function Inventory — 2026-09-29

This inventory is derived from the current `sdk/CMakeLists.txt`, public subsystem headers, and matching native source definitions. It is a source/build inventory, **not yet an ELF-level export verification**.

### Actual CMake shared-library targets

| Target / output | Primary source | Current public/native function surface inspected |
|---|---|---|
| `android_core` | `android_core.c`, `client_bridge.c` | `nacl_core_initialize`, `nacl_core_shutdown`, version/API/property functions, `nacl_core_load_module`, `nacl_core_unload_module`, `nacl_core_get_symbol`, `nacl_core_is_module_loaded`, error functions |
| `sensors_client` | `sensors_client.c` | `start_sensor_stream`, `stop_sensor_stream` |
| `telephony_client` | `telephony_client.c` | `telephony_binder_get_imsi`, `telephony_jni_populate_state`, `telephony_parse_registry_dumpsys` |
| `bluetooth_client` | `libbluetooth_client.c` | `bt_start_le_scan`, `bt_stop_le_scan`, `bt_get_discovered_devices`, `bt_get_client_version` |
| `ipc_crypto` | `ipc_crypto.c` | `ipc_crypto_init`, `ipc_crypto_shutdown`, `ipc_secure_send`, `ipc_secure_recv` |
| `shm_client` | `shm_client.c` | shared-memory client surface; header inventory still needs explicit public-function reconciliation |
| `display_core` | `display.cpp` | `nacl_display_create`, `nacl_display_update_waveform_data`, `nacl_display_render_frame`, `nacl_display_destroy` |
| `vulkan_renderer` | `vulkan_renderer.c` | `nacl_vulkan_alloc`, `nacl_vulkan_init`, `nacl_vulkan_update_vertices`, `nacl_vulkan_draw_frame`, `nacl_vulkan_recreate_swapchain`, `nacl_vulkan_shutdown`, `nacl_vulkan_free` |
| `display_jni_bridge` | `display_jni_bridge.cpp` | JNI bridge entry points; not the same ABI as display-core functions |
| `display_media` | `display_media.c` | `media_codec_init`, `media_codec_configure_decoder`, `media_codec_decode_packet`, `media_codec_shutdown`, `display_render_frame` |
| `adb_client` | `adb_client.c` | `adb_initialize_session`, `adb_connect_loopback`, `adb_send_packet`, `adb_read_packet`, `adb_handle_handshake`, `adb_open_shell_channel`, `adb_write_shell_data`, `adb_read_shell_data`, `adb_close_session` |
| `privilege_broker` | `privilege_broker.c` | `nacl_privilege_backend_available`, `nacl_privilege_capability_supported`, backend/capability naming, UID check, ping, backend query |
| `routing_core` | `routing_core.c` | `initialize_routing_engine`, `resolve_capability_pathway`, `dispatch_hardware_command`, `routing_core_set_jvm` |
| `usb_subsystem` | `usb_subsystem.c` | `usb_claim_interface`, `usb_release_interface` |
| `camera_subsystem` | `camera_subsystem.c` | `camera_initialize`, `camera_open_device`, `camera_start_streaming`, `camera_stop_streaming`, `camera_close_device` |
| `nfc_subsystem` | `nfc_subsystem.c` | `nfc_initialize`, `nfc_start_reader_mode`, `nfc_stop_reader_mode` plus JNI callback entry |
| `nacl_input` | `input.c` | `input_init`, `input_inject_tap_adb`, `input_inject_swipe_adb`, `input_start_monitoring`, `input_stop_monitoring`, `input_shutdown` |
| `nacl_audio` | `audio.c` | `audio_init`, playback/capture/write/stop/shutdown functions |
| `nacl_location` | `location.c` | `location_init`, `location_start_updates`, `location_stop_updates`, `location_shutdown` |
| `nacl_storage` | `storage.c` | `storage_init`, `storage_mmap_file`, `storage_munmap_file`, `storage_get_encryption_type` |
| `power_battery` | `power_battery.c` | `power_init`, `power_get_battery_stats`, wakelock acquire/release, `power_shutdown` |
| `connectivity_automation` | `connectivity_automation.c` | automation API; full public-function inventory still needs explicit header/source reconciliation |
| `native_host_bridge` | `native_host_bridge.cpp` | native-host bootstrap/bridge surface; current lookup of `initialize_core_registry` is inconsistent with `android_core.c` |
| `quickjs_bindings` | QuickJS binding sources | binding entry points, not a single subsystem ABI |

Executables currently built by CMake: `sensors_daemon`, `bluetooth_svc`, `shm_daemon`, `privilege_broker_daemon`, and `service_daemon`.

### Core seven-module registry versus actual build

The implemented `NaclModuleType` registry currently contains:

- CORE → `libandroid_core.so`
- BLUETOOTH → `libbluetooth_client.so`
- WIFI → `libwifi_client.so`
- SENSORS → `libsensors_client.so`
- LOCATION → `liblocation_client.so`
- IPC → `libipc_client.so`
- SYSTEM → `libsystem_client.so`

The current CMake inventory directly confirms `android_core`, `bluetooth_client`, `sensors_client`, and `telephony_client`, but does **not** define `wifi_client`, `location_client`, `ipc_client`, or `system_client) under those names. Instead, it contains separate targets such as `nacl_location`, `ipc_crypto`, `shm_client`, and `connectivity_automation`.

Therefore the seven-module registry cannot yet be treated as an authoritative map of the current build outputs.

### First concrete lazy-loading slice

Bluetooth remains the cleanest first implementation target:

- owning CMake target: `bluetooth_client`
- output: `libbluetooth_client.so`
- public C surface: four functions
- daemon/service boundary exists separately as `bluetooth_svc`
- loading the client library does not itself imply that Bluetooth service activation is complete

The intended next step is to make this mapping explicit and testable before generalizing it.

### Loader design constraint recorded

A resolved function pointer must not outlive its owning module. Any future unload behavior must account for active callbacks, worker threads, subsystem state, and cached function pointers. Module lifetime and subsystem activation remain separate concepts.

### Remaining inventory work

1. Verify exact ELF dynamic exports from CI-built artifacts rather than relying only on source declarations.
2. Complete public-function inventory for SHM, automation, QuickJS, and JNI bridge surfaces.
3. Map every function to its exact CMake target and runtime dependency set.
4. Determine which current functions are intended stable ABI versus internal implementation helpers.
5. Define canonical module IDs/paths only after the above evidence is complete.


## 27. CI ELF Export Verification — 2026-09-29

CI Run #36 for commit `4d4ef836bb2f37879b08bb6a944fb4948fcac9a8` completed successfully.

The arm64-v8a workflow artifact `nacl-libs-arm64-v8a` was downloaded and inspected directly with ELF tooling. It contains 26 shared libraries plus daemon executables; the staged JNI library set includes 25 `.so` files.

This is the first verification layer based on actual built ELF artifacts rather than source declarations alone.

### Verified export findings

- `libandroid_core.so` exports the expected `nacl_core_*` loader/lifecycle/error/version/property symbols. It also exports `execute_hardware_command` and `get_client_library_version`.
- `libbluetooth_client.so` exports the four intended client functions and additionally exports `connect_to_bt_daemon`.
- `libsensors_client.so` exports `start_sensor_stream`, `stop_sensor_stream`, and additionally `sensor_listener_thread`.
- `libshm_client.so` unexpectedly exports `main`; no clearly named public SHM client API appeared in the first export pass.
- `libnative_host_bridge.so` exports `JNI_OnLoad` and the two `NativeInterface` JNI entry points, but does **not** export `initialize_core_registry`.
- `libconnectivity_automation.so` exports the four observed automation functions.
- `libquickjs_bindings.so` exports the QuickJS runtime surface plus many binding functions, so it is not a simple single-subsystem ABI.
- `libnfc_subsystem.so` exports the NFC lifecycle/transceive surface plus its JNI callback.
- `libusb_subsystem.so` exports interface functions plus bulk read/write helpers.
- `libvulkan_renderer.so` exports the expected `nacl_vulkan_*` API plus helper symbols `create_shader_module` and `find_memory_type`.

### Export-verification conclusion

The source/build inventory is directionally correct but cannot by itself define the stable ABI. The actual ELF output shows three categories that must remain distinct:

1. intended public functions;
2. additional implementation/helper exports;
3. unexpected or stale exports.

The future lazy-resolution registry therefore needs an explicit **stable ABI classification**, rather than automatically treating every ELF-visible function as public.

## 28. Revised Lazy-Loader Priority

1. Make `libbluetooth_client.so` the first canonical lazy-loading module.
2. Define typed descriptors for its four intended client functions.
3. Keep `connect_to_bt_daemon` outside the stable registry until its ABI purpose is confirmed.
4. Establish module-lifetime ownership before introducing unload-based cached function pointers.
5. Verify the resolver against the actual arm64 ELF artifact.
6. Generalize only after the Bluetooth slice is proven.
7. Separately investigate `libshm_client.so:main` and the stale `initialize_core_registry` expectation.

### Current no-code-change status

No native loader implementation was changed during this ELF verification pass. Work remains in inventory/design until the resolver ABI is defined.

---
**Last verified CI build:** Run #36, commit `4d4ef836bb2f37879b08bb6a944fb4948fcac9a8`, conclusion: success.


## 29. ELF Export Verification Correction — 2026-09-29

**Method correction:** the first export pass used `readelf -Ws`, which includes the regular ELF symbol table and can therefore show local/static implementation symbols. That output was not sufficient to claim dynamic exports.

The authoritative export check for this pass is now `nm -D --defined-only` / `readelf --dyn-syms`, which inspects the dynamic symbol table used for runtime symbol lookup.

### Corrected dynamic exports

- `libbluetooth_client.so` dynamically exports exactly the four header/API functions:
  - `bt_start_le_scan`
  - `bt_stop_le_scan`
  - `bt_get_discovered_devices`
  - `bt_get_client_version`
- The source-level `static connect_to_bt_daemon()` is **not** a dynamic export.
- `libsensors_client.so` dynamically exports exactly `start_sensor_stream` and `stop_sensor_stream`.
- `libconnectivity_automation.so` dynamically exports the three observed `auto_*` functions; `execute_adb_shell_cmd` was a regular-symbol-table result, not a dynamic export.
- `libnative_host_bridge.so` dynamically exports `JNI_OnLoad`, the two `NativeInterface` JNI entry points, and `get_safe_jni_env`.
- `libshm_client.so` dynamically exports `main`, which remains an actual anomaly requiring source/build investigation.
- `libandroid_core.so` dynamically exports the core loader/lifecycle/error/version/property surface plus `execute_hardware_command` and `get_client_library_version`.

### Bluetooth dependency evidence

The built `libbluetooth_client.so` has these ELF NEEDED dependencies:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

It does not declare another NACL shared library as an ELF NEEDED dependency. Its runtime daemon dependency is instead established by the Unix-domain socket path in `bluetooth_ipc_common.h`:

`/data/local/tmp/sdk/sockets/bluetooth.sock`

This reinforces Bluetooth as a clean first lazy-loader slice: one client module, four dynamic ABI functions, standard Android runtime dependencies, and a separate daemon activation boundary.

### Corrected conclusion

The previous section's claims about incidental helper exports should be interpreted as **regular symbol-table observations**, not dynamic ABI exports. The actual dynamic-export evidence strengthens the case for using the four Bluetooth client functions as the first canonical resolver registry.

---
**Export verification method:** `nm -D --defined-only` / `readelf --dyn-syms` against CI Run #36 arm64-v8a artifact.
## 30. Information-Preservation Checkpoint Protocol — 2026-09-29

This repository is also the continuity/checkpoint mechanism for long investigations, including work that may be interrupted by Free-tier context or session limits.

### Mandatory checkpoint check

Before continuing a substantial investigation, implementation-planning batch, or tool-heavy sequence, check whether the newly accumulated information is already persisted in the repository.

A checkpoint is required when **any** of these conditions is met:

1. **Information influx:** several new verified findings, source files, symbols, test results, or architectural decisions have accumulated.
2. **Context risk:** the conversation is becoming large enough that a session/context interruption could cause loss of working state.
3. **Phase transition:** the work is moving from one research/analysis phase to another.
4. **Before implementation:** verified findings and the proposed change must be persisted before source changes begin.
5. **Before a potentially fragile tool sequence:** preserve the current evidence before continuing if failure could otherwise lose the working state.
6. **User requests a checkpoint:** persist immediately.

### What to checkpoint

The checkpoint does not need to contain every conversational detail. It must preserve the information required to resume accurately:

- verified facts/evidence
- important discoveries and corrections
- current repository HEAD/branch
- files/artifacts inspected
- decisions and their status
- unresolved questions/unknowns
- current task/phase
- next intended action
- explicit no-code-change or authorized-change boundary

Use `VERIFIED`, `INFERENCE`, `PROPOSAL`, and `UNKNOWN` labels where appropriate.

### Checkpoint rule

**Never allow a large influx of new project information to exist only in the conversation when it can be persisted to the repository.**

When a checkpoint is triggered, update `NACL_PROJECT.md` and/or the appropriate `research/` document before continuing with more context-heavy work.

### Interruption recovery

After an interruption or new conversation:

1. Read `NACL_PROJECT.md`.
2. Read the relevant `research/` files.
3. Verify the repository HEAD against GitHub/source state.
4. Continue from the persisted checkpoint rather than relying on remembered conversation state.

`NACL_PROJECT.md` remains project-state/context, **not implementation proof**. Actual repository contents and verified artifacts outrank it.

### Loop protection

If persisted state and the current task appear to be causing repetitive work, stop and report:

LOOP DETECTED:
- What appears to be repeating
- What has already been verified
- What would change if we continue
- Recommended next action

Then ask whether to break the loop:

**Break the loop and proceed with the new evidence? YES / NO**

Do not silently repeat an already-verified investigation.

### Current checkpoint

- Repository HEAD at this checkpoint: `1f34b7b1a747ffd2dc9ef74887d220a3a787c4bc`
- Current phase: repository architecture/evidence consolidation
- Native source changes authorized: **NO**
- Documentation/research updates authorized: **YES**
- Immediate technical focus: authoritative module/function inventory and loader-ABI design

## 31. Research checkpoint — 2026-09-29

The research tree is now established as the durable detailed-evidence layer.

Created:
- `research/README.md`
- `research/architecture/current-audit.md`
- `research/architecture/loader-and-abi.md`
- `research/validation/elf-exports.md`

These records preserve the current architecture audit, loader/ABI findings, corrected ELF-export methodology, and interruption-recovery context.

**Current repository HEAD:** `6d745b642ff5c042b80fa294b991c23f9df965b3`

The next checkpoint should occur after the next substantial evidence influx, not after every individual observation.


## 32. Exact Continuation Protocol — 2026-09-29

This section is an execution map for the next NACL investigation pass. It exists specifically to prevent the investigation from resetting to an already-completed phase after a context interruption.

### Current position — DO NOT RESTART

**Completed:** Bluetooth is the first fully characterized resolver slice.

Bluetooth evidence already established:
- owning target: `bluetooth_client`
- runtime library: `libbluetooth_client.so`
- dynamic ABI: exactly four intended public functions
  - `bt_start_le_scan`
  - `bt_stop_le_scan`
  - `bt_get_discovered_devices`
  - `bt_get_client_version`
- ELF NEEDED dependencies: `liblog.so`, `libm.so`, `libdl.so`, `libc.so`
- runtime service dependency: `/data/local/tmp/sdk/sockets/bluetooth.sock`
- loading the client library is distinct from activating/using the Bluetooth service
- no native implementation change has been authorized

**Do not repeat:** repository-wide export inspection, Bluetooth export inspection, or the basic Bluetooth resolver characterization unless new evidence contradicts it.

### Exact next sequence

Execute these phases in order. Finish a phase before advancing unless a dependency is discovered that requires branching.

**PHASE A — Sensors resolver slice**
1. Inspect the current `sensors_client` public header/source and its CMake target.
2. Verify its actual dynamic exports from a current CI-built ELF artifact. Do not substitute regular ELF symbols for dynamic exports.
3. Record exact ELF NEEDED dependencies.
4. Trace its runtime IPC endpoint and identify what starts/activates the sensor stream.
5. Identify callback/thread/session lifetime requirements.
6. Classify each observed function as STABLE-ABI CANDIDATE, INTERNAL, or UNKNOWN.
7. Compare the evidence against the existing project/research records; correct stale claims instead of duplicating them.

**PHASE B — Telephony resolver slice**
Only after Sensors is complete, repeat the same evidence sequence for `telephony_client`.

**PHASE C — Remaining simple client libraries**
Then process the remaining comparatively small C ABIs in this order unless evidence gives a concrete reason to change it:
1. `ipc_crypto`
2. `adb_client`
3. `privilege_broker`
4. `usb_subsystem`
5. `nfc_subsystem`
6. `nacl_location`
7. `power_battery`
8. `nacl_storage`

**PHASE D — Complex/dependency-heavy modules**
After the simple slices, investigate:
- `display_core`
- `vulkan_renderer`
- `display_media`
- `camera_subsystem`
- `nacl_audio`
- `nacl_input`
- `routing_core`
- `connectivity_automation`
- QuickJS bindings
- JNI/native-host bridge
- SHM client/daemon

These must not automatically be treated as ordinary leaf resolver modules because their dependency, runtime, callback, JNI, or process boundaries may require different lifetime/activation rules.

### Required evidence record for EVERY resolver slice

Do not mark a slice complete until all of these are answered:

1. **Build owner:** exact CMake target and source file(s).
2. **Runtime artifact:** exact `.so` name.
3. **Dynamic ABI:** exact dynamically exported symbols, verified from the built artifact.
4. **Header ABI:** exact public declarations and signatures.
5. **Dependency set:** ELF NEEDED libraries and NACL-internal dependencies.
6. **Activation boundary:** what must happen after `dlopen/dlsym` for the capability to actually work.
7. **IPC/device boundary:** socket, Binder, HAL, ioctl, device, daemon, etc., where applicable.
8. **Lifetime:** objects, callbacks, threads, file descriptors, and conditions that prohibit safe unload.
9. **Availability/security:** ordinary-app, permission-dependent, privilege-dependent, hardware-dependent, backend-dependent, or unavailable where evidence supports it.
10. **ABI classification:** stable candidate / internal / unknown, with evidence.
11. **Resolver implication:** whether the module can use the same generic resolver model or needs a special activation/lifetime adapter.
12. **Contradictions:** anything in existing documentation/project state that disagrees with current repository/artifact evidence.

### Evidence hierarchy

When sources disagree, use this order unless there is a specific reason not to:

1. current repository source/build configuration
2. current CI-built ELF artifact
3. tests/runtime observations
4. current research evidence
5. `NACL_PROJECT.md` historical/project-state claims
6. older PDFs/documentation

A project document is a checkpoint, **not proof**. Never force new evidence to agree with the MD.

### Classification discipline

Use these labels explicitly:
- **VERIFIED** — directly established from source, build, artifact, test, or runtime evidence.
- **INFERENCE** — reasoned consequence of verified evidence.
- **PROPOSAL** — design choice not yet implemented/verified.
- **UNKNOWN** — requires evidence.

Never silently convert an INFERENCE or PROPOSAL into VERIFIED.

### Information-influx checkpoint

After completing a resolver slice, or sooner if a large amount of evidence accumulates:
1. persist the findings in the appropriate `research/` file;
2. update this MD with only the durable state needed to resume;
3. record current HEAD and the exact phase completed;
4. record the next phase explicitly;
5. only then continue to additional evidence gathering.

If a context interruption occurs, resume from the last persisted **CURRENT POSITION** rather than starting the audit over.

### Loop-break rule

Before starting any investigation step, ask internally: **Has this exact evidence already been verified and persisted?**

- If YES: do not repeat it. Advance to the next uncompleted item.
- If NO: investigate it.
- If contradictory new evidence appears: reopen the item and record the correction.

If the state appears to demand repeating an already-completed phase, stop and present:

**LOOP DETECTED** — completed evidence, attempted repeat, new information (if any), and proposed next step.

Ask the user whether to break the loop with **YES / NO** before proceeding.

### Implementation gate

Until all planned resolver slices have been characterized and the cross-module ABI map is stable:

**Native implementation changes remain unauthorized.**

Research/documentation updates are authorized for continuity. Implementation may begin only after the resolver ABI design is explicitly presented and approved.

### Immediate next action

**Continue at PHASE A: Sensors.** Do not return to Bluetooth, general ELF export discovery, or repository-wide inventory unless new contradictory evidence requires reopening them.


## 33. Sensors Resolver Slice Completed — 2026-09-29

**VERIFIED:** Sensors PHASE A is complete.

Current evidence:
- CMake owner: `sensors_client` from `sdk/src/sensors_client.c`
- Runtime artifact: `libsensors_client.so`
- CI artifact: Run #53 / ID `36598137213`, arm64-v8a artifact ID `11046608330`
- Dynamic exports: exactly `start_sensor_stream` and `stop_sensor_stream`
- ELF NEEDED: `liblog.so`, `libm.so`, `libdl.so`, `libc.so`
- No NACL-internal ELF NEEDED dependency
- Activation: Unix socket request to `/data/local/tmp/sdk/sockets/sensors.sock`; daemon then activates the Android accelerometer stream
- Client lifetime: socket + pthread + callback + session allocation
- Sensor daemon/IPC availability and security remain runtime-dependent/UNKNOWN where not directly verified

Research record:
- `research/sensors-resolver.md` updated with the complete evidence set.

**INFERENCE:** Sensors can use the generic module/symbol resolver for its two client exports, but capability activation/session lifetime requires a higher-level sensor-specific adapter.

**Native implementation changes remain unauthorized.**

### Current position

**PHASE A — Sensors: COMPLETE.**

**Next: PHASE B — Telephony.**

Do not repeat Sensors or Bluetooth evidence unless contradictory new evidence appears.


## 34. Telephony Resolver Slice Completed — 2026-09-29

**VERIFIED:** Telephony PHASE B is complete.

Evidence:
- CMake owner: `telephony_client` from `sdk/src/telephony_client.c`
- Runtime artifact: `libtelephony_client.so`
- CI artifact: Run #53 / ID `36598137213`, arm64-v8a artifact ID `11046608330`
- Dynamic exports: exactly `telephony_binder_get_imsi`, `telephony_jni_populate_state`, and `telephony_parse_registry_dumpsys`
- ELF NEEDED: `liblog.so`, `libm.so`, `libdl.so`, `libc.so`
- No NACL-internal ELF NEEDED dependency

Important ABI findings:
- `telephony_binder_get_imsi` is currently a placeholder that copies a hard-coded IMSI-like string; it does not perform Binder access.
- `telephony_jni_populate_state` depends on cached JNI state that this library does not expose an initialization function for; its real telephony access is therefore incomplete from this module alone.
- `telephony_parse_registry_dumpsys` is a local parser and is the clearest current stable-ABI candidate, subject to a proper public prototype/contract.
- Dynamic export presence must not automatically imply stable public ABI.

Research record:
- `research/telephony-resolver.md` created with the complete evidence and ABI classifications.

**INFERENCE:** The eventual resolver registry needs explicit ABI classification so placeholders/incomplete integrations cannot become stable API merely because they are dynamically exported.

**Native implementation changes remain unauthorized.**

### Current position

**PHASE B — Telephony: COMPLETE.**

**Next: PHASE C — simple client libraries, beginning with `ipc_crypto`.**

Do not repeat Sensors, Bluetooth, or Telephony evidence unless contradictory new evidence appears.


## 35. IPC Crypto Resolver Slice — 2026-09-29

**VERIFIED:** IPC Crypto PHASE C ELF verification is complete for the current CI ARM64 artifact.

Evidence:
- CMake owner: `ipc_crypto` from `sdk/src/ipc_crypto.c`
- Public header: `sdk/include/ipc_crypto.h`
- Runtime artifact: `libipc_crypto.so`
- CI artifact: ARM64 `nacl-libs-arm64-v8a`, from the successful NACL NDK build used for this investigation
- Dynamic exports, verified with `readelf --dyn-syms`:
  - `ipc_crypto_init`
  - `ipc_crypto_shutdown`
  - `ipc_crypto_encrypt`
  - `ipc_crypto_decrypt`
  - `ipc_secure_send`
  - `ipc_secure_recv`
- ELF NEEDED:
  - `liblog.so`
  - `libm.so`
  - `libdl.so`
  - `libc.so`
- No `libcrypto.so` ELF NEEDED dependency.
- SONAME: `libipc_crypto.so`
- No RPATH/RUNPATH observed.

**VERIFIED:** The implementation obtains crypto functionality dynamically with `dlopen()`/`dlsym()`, rather than linking libcrypto at ELF link time. This keeps the crypto provider outside the library's DT_NEEDED dependency set.

**VERIFIED:** The six dynamically exported functions form a small, explicit C ABI surface. No EVP implementation functions were dynamically exported by NACL.

**INFERENCE:** IPC Crypto fits the generic module/symbol-resolution model at the library boundary, but crypto-provider availability/version compatibility is a separate runtime concern.

**KNOWN LIFETIME ISSUE:** `ipc_crypto_shutdown()` closes the dynamically loaded crypto provider while cached provider function pointers remain populated. Those pointers must not be used after provider shutdown. This is currently an implementation/lifetime finding, not a justification to change native code during the research phase.

**UNKNOWN / NEXT:** Determine the Android/vendor compatibility of the eleven `dlsym()` provider symbols, including symbol availability and provider ABI assumptions across supported Android environments. Also verify the exact current CI artifact provenance if a later build supersedes the artifact used here.

**Classification:** The six NACL exports are **STABLE-ABI CANDIDATES**, subject to header contract, lifecycle, error semantics, and provider-compatibility review. The dynamically resolved EVP symbols are **external runtime dependencies**, not NACL public ABI.

**Native implementation changes remain unauthorized.**

### Current position

**PHASE C — IPC Crypto ELF characterization: COMPLETE.**

**Next:** IPC Crypto provider/dependency compatibility analysis, then continue to the next simple client library in the persisted sequence.

Do not repeat Bluetooth, Sensors, or Telephony evidence unless contradictory new evidence appears.


### 36. IPC Crypto Provider Compatibility Checkpoint — 2026-09-29

**VERIFIED:** IPC Crypto provider/dependency review is complete to the level supported by current repository evidence.

Current source resolves eleven external crypto-provider symbols dynamically and attempts `libcrypto.so`, then `/system/lib64/libcrypto.so`, then `/system/lib/libcrypto.so`.

**UNKNOWN:** The repository does not establish that these provider paths/names and all eleven symbols are available and ABI-compatible across supported Android/vendor environments. No provider compatibility matrix or bundled compatibility backend currently establishes that assumption.

**VERIFIED:** Provider load/symbol failures return errors from `ipc_crypto_init()`, but the current public interface does not distinguish missing provider, inaccessible provider, incompatible provider, and missing individual symbol as separate capability-status classes.

**VERIFIED:** `libipc_crypto.so` has no `libcrypto.so` DT_NEEDED dependency; the provider is runtime-loaded.

**VERIFIED:** `docs/subsystem-crypto.md` contains a stale copied source fragment (`EVP_EVP_EncryptUpdate`) that disagrees with current `sdk/src/ipc_crypto.c`. Repository source/build evidence remains authoritative.

**VERIFIED:** `ipc_secure_send()` performs single `send()` operations and therefore does not implement a complete-write loop for stream sockets. This is a future implementation issue, not changed during research.

**INFERENCE:** The eventual capability architecture should keep provider/backend selection and compatibility separate from generic module loading and from crypto-session/socket activation.

Research record:
- `research/ipc-crypto-resolver.md` updated with the provider compatibility findings.

**Native implementation changes remain unauthorized.**

### Current position

**PHASE C — IPC Crypto: COMPLETE.**

**Next:** PHASE C simple client sequence continues with `adb_client`, then `privilege_broker`, `usb_subsystem`, `nfc_subsystem`, `nacl_location`, `power_battery`, and `nacl_storage`.

Do not repeat IPC Crypto ELF/provider evidence unless contradictory new evidence appears.


### 37. ADB Client Resolver Slice Completed — 2026-09-29

**VERIFIED:** `adb_client` has been characterized from current repository source/header and the ARM64 CI artifact.

Evidence:
- CMake owner: `adb_client` from `sdk/src/adb_client.c`
- Runtime artifact: `libadb_client.so`
- Artifact inspected: ARM64 artifact ID `11046608330`
- Dynamic exports: exactly nine:
  - `adb_initialize_session`
  - `adb_connect_loopback`
  - `adb_send_packet`
  - `adb_read_packet`
  - `adb_handle_handshake`
  - `adb_open_shell_channel`
  - `adb_write_shell_data`
  - `adb_read_shell_data`
  - `adb_close_session`
- ELF NEEDED: `liblog.so`, `libm.so`, `libdl.so`, `libc.so`
- SONAME: `libadb_client.so`
- No RPATH/RUNPATH.
- No `libcrypto.so` DT_NEEDED dependency.

**VERIFIED:** ADB activation is separate from library loading. The client initializes an `AdbSession`, connects to `127.0.0.1:<port>`, performs an ADB handshake, and then opens a shell channel.

**VERIFIED:** ADB authentication dynamically loads `libcrypto.so` and resolves ten provider functions. Provider compatibility remains **UNKNOWN** across supported Android/vendor environments.

**INFERENCE:** The nine NACL functions are stable-ABI candidates, but the exposed `AdbSession` structure makes session state part of the public ABI rather than providing an opaque handle.

**VERIFIED:** The current transport implementation treats short header/payload `write()` operations as errors and does not complete partial writes. `adb_read_packet()` similarly rejects a short header read rather than filling it.

**INFERENCE:** The generic module/symbol resolver can load and resolve `libadb_client.so`, but a higher-level adapter is needed for endpoint availability, authentication/provider compatibility, session lifetime, and capability/security status.

Research record:
- `research/adb-client-resolver.md`

**Native implementation changes remain unauthorized.**

### Current position

**PHASE C — `adb_client`: COMPLETE.**

**Next:** `privilege_broker`.

Do not repeat IPC Crypto or ADB evidence unless contradictory new evidence appears.


### 38. Privilege Broker Resolver Slice Completed — 2026-09-29

**VERIFIED:** `libprivilege_broker.so` was characterized from current source/header and the ARM64 CI artifact.

- CMake target: `privilege_broker`
- Dynamic exports: exactly eight:
  - `nacl_privilege_backend_available`
  - `nacl_privilege_backend_name`
  - `nacl_privilege_broker_dispatch`
  - `nacl_privilege_broker_get_backend`
  - `nacl_privilege_broker_is_uid2000`
  - `nacl_privilege_broker_ping`
  - `nacl_privilege_capability_name`
  - `nacl_privilege_capability_supported`
- ELF NEEDED: `liblog.so`, `libm.so`, `libdl.so`, `libc.so`
- SONAME: `libprivilege_broker.so`
- No RPATH/RUNPATH.
- No NACL-internal DT_NEEDED dependency.

**VERIFIED:** The client uses a Unix stream socket at `/data/local/tmp/sdk/sockets/privilege.sock`, with bounded binary protocol messages and full read/write loops.

**VERIFIED:** The daemon refuses startup unless effective UID is 2000 and independently checks that identity before dispatch. The broker currently supports only Bluetooth scan and Wi-Fi scan capability dispatch, and dispatch requires backend UID2000 and protocol version 1.

**INFERENCE:** Loading the shared library does not activate the privileged broker. The daemon, socket accessibility, UID/security policy, protocol compatibility, and downstream services are separate runtime requirements. Native code does not grant UID 2000.

**VERIFIED:** Eight exported functions are C-ABI candidates. The protocol has a version field, but the public structs do not have a general size/version mechanism.

**UNKNOWN:** Actual Android/SELinux deployment permissions and daemon startup mechanism remain environment/deployment dependent.

Research record:
- `research/privilege-broker-resolver.md`

**Native implementation changes remain unauthorized.**

### Current position

**PHASE C — `privilege_broker`: COMPLETE.**

**Next:** `usb_subsystem`.

Do not repeat prior completed resolver slices unless contradictory evidence appears.
