# Module and Build Inventory — Evidence Pass

**Date:** 2026-09-29  
**Repository:** `dannwold/Nacl-unstable`  
**Branch:** `main`

## VERIFIED — CMake targets

The current `sdk/CMakeLists.txt` defines these native targets.

### Shared libraries

| CMake target | Source | Primary role |
|---|---|---|
| `android_core` | `src/android_core.c`, `src/client_bridge.c` | Core runtime / loader |
| `sensors_client` | `src/sensors_client.c` | Sensor IPC client |
| `telephony_client` | `src/telephony_client.c` | Telephony client |
| `bluetooth_client` | `src/libbluetooth_client.c` | Bluetooth IPC client |
| `ipc_crypto` | `src/ipc_crypto.c` | IPC cryptographic support |
| `shm_client` | `src/shm_client.c` | Shared-memory client |
| `display_core` | `src/display.cpp` | Display core |
| `vulkan_renderer` | `src/vulkan_renderer.c` | Vulkan renderer |
| `display_jni_bridge` | `src/display_jni_bridge.cpp` | Display JNI bridge |
| `display_media` | `src/display_media.c` | Display/media support |
| `adb_client` | `src/adb_client.c` | ADB client |
| `privilege_broker` | `src/privilege_broker.c` | Privilege/backend broker client |
| `routing_core` | `src/routing_core.c` | Routing/dispatch core |
| `usb_subsystem` | `src/usb_subsystem.c` | USB capability |
| `camera_subsystem` | `src/camera_subsystem.c` | Camera capability |
| `nfc_subsystem` | `src/nfc_subsystem.c` | NFC capability |
| `nacl_input` | `src/input.c` | Input capability |
| `nacl_audio` | `src/audio.c` | Audio capability |
| `nacl_location` | `src/location.c` | Location capability |
| `nacl_storage` | `src/storage.c` | Storage capability |
| `power_battery` | `src/power_battery.c` | Power/battery capability |
| `connectivity_automation` | `src/connectivity_automation.c` | Connectivity/automation |
| `native_host_bridge` | `src/native_host_bridge.cpp` | Native host/JNI bridge |
| `mock_client_main` | `src/mock_client_main.c`, `src/quickjs_stub.c` | Mock/test host |
| `quickjs_bindings` | multiple QuickJS binding sources | QuickJS integration |

### Executables

| CMake target | Source | Primary role |
|---|---|---|
| `sensors_daemon` | `src/sensors_daemon.c` | Sensor service/IPC daemon |
| `bluetooth_svc` | `src/bluetooth_svc.cpp` | Bluetooth service/IPC daemon |
| `shm_daemon` | `src/shm_daemon.c` | Shared-memory daemon |
| `privilege_broker_daemon` | `src/privilege_broker_daemon.c` | Privileged broker daemon |
| `service_daemon` | `src/service_daemon.c` | General service daemon |

## VERIFIED — Current core registry does not match this inventory

`android_core.c` defines seven module slots:

- core
- bluetooth
- Wi-Fi
- sensors
- location
- IPC
- system

Several registry paths do not correspond to current CMake targets:

- `libwifi_client.so`
- `liblocation_client.so`
- `libipc_client.so`
- `libsystem_client.so`

Meanwhile, many actual CMake targets have no representation in the core registry.

This is strong evidence that the existing seven-entry registry cannot be the authoritative module registry for the current repository.

## VERIFIED — Bluetooth API slice

`bluetooth_client.h` declares four public client functions:

- `bt_start_le_scan()`
- `bt_stop_le_scan()`
- `bt_get_discovered_devices()`
- `bt_get_client_version()`

Prior ELF verification established that these four functions are the intended dynamic exports of `libbluetooth_client.so`.

The internal `connect_to_bt_daemon()` function is static and therefore is not part of the public dynamic ABI.

The Bluetooth client communicates through the Unix socket defined by `bluetooth_ipc_common.h`.

## VERIFIED — Bluetooth backend maturity

The Bluetooth daemon contains code/comments describing a direct Binder route, but the implemented scan path currently launches `generate_mock_le_telemetry()`.

Therefore the currently implemented scan backend is **mock/synthetic**, not verified hardware BLE operation.

The distinction must remain explicit in the future capability registry.

## VERIFIED — Existing function-level loading behavior

The current core implementation already supports:

1. module loading through `dlopen()`;
2. individual symbol resolution through `dlsym()`;
3. automatic module loading when `nacl_core_get_symbol()` is called for an unloaded module.

This means the requested architectural capability — resolving only the functions needed — is already partially present. The missing piece is a correct authoritative registry/metadata model and lifecycle semantics, not the fundamental `dlopen()`/`dlsym()` mechanism.

## VERIFIED — Evidence still required

The following are not yet fully established for every target:

- complete dynamic-export inventory;
- stable/public versus internal symbol classification;
- exact NEEDED dependency graph from built ELF artifacts;
- activation requirements;
- Android permission/UID/SELinux constraints;
- module ownership and unload safety;
- mapping from current CMake targets to the 21-module unified API;
- production versus mock maturity for every capability.

These remain explicit research tasks rather than assumptions.

## INFERENCE

The authoritative inventory should be **target/function based**, not simply module-name based. A single capability may legitimately contain:

- a public client shared library;
- one or more helper libraries;
- a daemon;
- IPC;
- a privileged backend;
- mock/test backend;
- host-language bindings.

The registry therefore needs to distinguish the capability from its implementation components.

## PROPOSAL

The eventual registry should have at least these conceptual layers:

`capability → implementation/module → public function → activation/backend requirements`

This preserves the distinction between loading a library, resolving a function, and activating the underlying capability.

## Next evidence pass

Continue by mapping public headers and source-defined APIs against the CMake targets, then reconcile those APIs with the previously verified ELF dynamic exports. Only after that should the generic resolver ABI be designed.
