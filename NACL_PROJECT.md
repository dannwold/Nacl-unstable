# NACL-UNSTABLE — Project Working Record

> Persistent engineering/context file for continuing work on `dannwold/Nacl-unstable`.
> This file records verified repository state, architecture, implementation findings, uncertainties, decisions, and next moves.
> It deliberately records concise engineering reasoning rather than private chain-of-thought.

## 1. Audit Snapshot

- Repository: `dannwold/Nacl-unstable`
- Audited branch: `main`
- Audited commit: `e033a2e6c70b89a2ed9e4346e15182603a70f86a`
- Commit message: **Align broker backend query protocol**
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

---
**Last audited commit:** `e033a2e6c70b89a2ed9e4346e15182603a70f86a`
