# ELF Dynamic Export and Dependency Inventory

**Date:** 2026-09-29  
**Repository:** `dannwold/Nacl-unstable`  
**Verified build:** GitHub Actions run #46, commit `3ee6099988a70f7a30fc1a899bcd9d080899937c`  
**Artifact:** `nacl-libs-arm64-v8a`, artifact ID `11046616747`  
**Method:** `nm -D --defined-only` for runtime dynamic exports; `readelf -d | grep NEEDED` for ELF dependencies.  
**Scope:** research only; no native implementation changes.

## VERIFIED — build artifact exists

The successful CI run produced an ARM64 native-library artifact containing 25 shared libraries plus 5 executables. The shared-library set includes the actual CMake targets relevant to the current loader/API investigation.

The artifact was built from commit `3ee6099988a70f7a30fc1a899bcd9d080899937c`. The subsequent commit `1dfb0a892be816a4f5b0aabf3e39488c69df8e26` only added research documentation, so the native sources represented by the artifact are unchanged by that documentation commit.

## VERIFIED — dynamic exports

| ELF library | Verified dynamic exports | Classification / note |
|---|---|---|
| `libandroid_core.so` | `nacl_core_initialize`, `nacl_core_shutdown`, `nacl_core_load_module`, `nacl_core_unload_module`, `nacl_core_get_symbol`, `nacl_core_is_module_loaded`, `nacl_core_get_last_error`, `nacl_core_set_error`, `nacl_core_get_version`, `nacl_core_get_android_sdk_level`, `nacl_core_is_api_supported`, `nacl_core_get_system_property`, `execute_hardware_command`, `get_client_library_version` | Core loader/API plus older/additional surface |
| `libadb_client.so` | 9 `adb_*` functions | Clean typed client surface |
| `libbluetooth_client.so` | `bt_start_le_scan`, `bt_stop_le_scan`, `bt_get_discovered_devices`, `bt_get_client_version` | Clean four-function capability ABI |
| `libcamera_subsystem.so` | 5 camera lifecycle/stream functions | Typed capability surface |
| `libconnectivity_automation.so` | `auto_ensure_bluetooth_enabled`, `auto_establish_wifi_p2p_connection`, `auto_pair_bluetooth_device` | Automation API; depends on ADB client |
| `libdisplay_core.so` | 4 `nacl_display_*` functions | Typed display surface |
| `libdisplay_jni_bridge.so` | 4 Java JNI entry symbols | JNI adapter, not generic C capability ABI |
| `libdisplay_media.so` | 5 media/decode functions | Typed media surface |
| `libipc_crypto.so` | 6 crypto/secure IPC functions | Typed IPC/crypto surface |
| `libmock_client_main.so` | broad QuickJS API plus `js_init_module_wifi` | **Anomalous/mixed surface**; not a clean capability library |
| `libnacl_audio.so` | 7 audio functions | Typed audio surface |
| `libnacl_input.so` | 6 input functions | Typed input surface |
| `libnacl_location.so` | 4 location functions | Typed location surface |
| `libnacl_storage.so` | 4 storage functions | Typed storage surface |
| `libnative_host_bridge.so` | `JNI_OnLoad`, 2 Java JNI entries, mangled `get_safe_jni_env` | Host/JNI adapter; not generic capability ABI |
| `libnfc_subsystem.so` | 4 NFC C functions + 1 Java JNI callback | Mixed C/JNI ABI |
| `libpower_battery.so` | 5 power/battery functions | Typed capability surface |
| `libprivilege_broker.so` | 8 privilege/backend functions | Security/backend broker API |
| `libquickjs_bindings.so` | broad QuickJS runtime API + 11 NACL/bridge initializers | Runtime binding library; should not be treated as a normal capability module |
| `librouting_core.so` | `JNI_OnLoad` + 4 routing functions | Mixed JNI/native routing surface |
| `libsensors_client.so` | `start_sensor_stream`, `stop_sensor_stream` | Small typed sensor surface |
| `libshm_client.so` | `main` | **Anomaly**; no normal client-function ABI |
| `libtelephony_client.so` | 3 telephony functions | Typed/data integration surface |
| `libusb_subsystem.so` | 5 USB functions | Typed FD/USB transfer surface |
| `libvulkan_renderer.so` | 7 `nacl_vulkan_*` functions | Typed renderer surface |

## VERIFIED — important corrections

### Dynamic export evidence now exists for the entire shared-library artifact

Earlier research correctly separated header declarations from ELF exports. This artifact now permits a stronger statement: the listed functions above are actual runtime-visible dynamic exports in the ARM64 CI build.

That means the resolver design can be grounded in **real runtime symbols**, rather than only source declarations.

### `libshm_client.so` is anomalous

Its only verified dynamic export is `main`. It should not currently be presented as a normal dynamically callable capability API.

### Binding/adapter libraries must be classified separately

The following are not ordinary capability libraries:

- `libdisplay_jni_bridge.so`
- `libnative_host_bridge.so`
- `libquickjs_bindings.so`
- `libmock_client_main.so`

Their exported surfaces include JNI/runtime integration symbols and/or large runtime APIs.

### JNI exports are not generic C ABI

JNI entry points are legitimate dynamic exports, but they have Java/JNI naming and lifetime conventions. They should be tagged as `JNI_ENTRY`, not exposed as ordinary NACL capability functions.

## VERIFIED — NEEDED dependency graph

Relevant NACL-to-NACL dependencies found in the ARM64 ELF files:

- `libconnectivity_automation.so` → `libadb_client.so`
- `libdisplay_jni_bridge.so` → `libdisplay_core.so`
- `libvulkan_renderer.so` → `libdisplay_core.so`
- `libquickjs_bindings.so` → `libandroid_core.so`
- `libquickjs_bindings.so` → `libsensors_client.so`
- `libquickjs_bindings.so` → `libtelephony_client.so`
- `libquickjs_bindings.so` → `libbluetooth_client.so`
- `libquickjs_bindings.so` → `libipc_crypto.so`
- `libquickjs_bindings.so` → `libshm_client.so`
- `libquickjs_bindings.so` → `librouting_core.so`
- `libquickjs_bindings.so` → `libusb_subsystem.so`
- `libquickjs_bindings.so` → `libcamera_subsystem.so`
- `libquickjs_bindings.so` → `libnfc_subsystem.so`
- `libquickjs_bindings.so` → `libnacl_input.so`
- `libquickjs_bindings.so` → `libnacl_audio.so`
- `libquickjs_bindings.so` → `libnacl_location.so`
- `libquickjs_bindings.so` → `libnacl_storage.so`
- `libquickjs_bindings.so` → `libpower_battery.so`
- `libquickjs_bindings.so` → `libconnectivity_automation.so`
- `libquickjs_bindings.so` → `libadb_client.so`

Most ordinary capability libraries otherwise depend only on Android/system libraries such as `libc.so`, `libm.so`, `libdl.so`, `liblog.so`, and where applicable Android media/graphics libraries.

## VERIFIED — implications for lazy loading

The dependency graph exposes an important distinction:

- **Bluetooth client** is unusually isolated: no NACL shared-library dependency.
- **Display JNI bridge** requires display core.
- **Vulkan renderer** requires display core.
- **Connectivity automation** requires ADB client.
- **QuickJS bindings** pull in a large portion of the native capability graph.

Therefore a future resolver can genuinely load an individual capability library without loading the entire NACL graph, but loading a binding/runtime adapter can intentionally cause many transitive dependencies to load.

This supports keeping:
1. library loading,
2. function resolution,
3. capability activation,
4. runtime/binding adapters

as separate concepts.

## UNKNOWN

This artifact establishes ARM64 dynamic exports and NEEDED dependencies, but not yet:

- whether every exported function is intended stable public ABI;
- exact activation requirements for every capability;
- safe unload rules;
- thread/callback lifetime requirements;
- Android permission/SELinux requirements for every capability;
- whether all four CI ABIs expose exactly the same symbol sets;
- whether runtime behavior is production-backed versus mock/stub for every capability.

## NEXT

The next evidence pass should map the verified ELF functions to:

`function → header declaration → source definition → ABI/lifetime → activation requirements → security constraints → maturity`

The resolver should then be designed around this authoritative classification rather than around the existing seven-module registry.
