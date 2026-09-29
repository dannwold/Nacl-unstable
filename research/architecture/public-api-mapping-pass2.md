# Public API Mapping — Pass 2

**Date:** 2026-09-29  
**Repository:** `dannwold/Nacl-unstable`  
**Scope:** source/header inventory cross-check using repository search results. No native implementation changes.

## VERIFIED

The existing repository state documents the following target-to-function relationships in `NACL_PROJECT.md` and corresponding source files:

| CMake target | Source | Documented public/native functions |
|---|---|---|
| `sensors_client` | `sensors_client.c` | `start_sensor_stream`, `stop_sensor_stream` |
| `telephony_client` | `telephony_client.c` | `telephony_binder_get_imsi`, `telephony_jni_populate_state`, `telephony_parse_registry_dumpsys` |
| `nacl_input` | `input.c` | `input_init`, ADB tap/swipe injection, monitoring start/stop, shutdown |
| `nacl_audio` | `audio.c` | audio init, playback/capture/write/stop/shutdown functions |
| `nacl_location` | `location.c` | `location_init`, `location_start_updates`, `location_stop_updates`, `location_shutdown` |
| `nacl_storage` | `storage.c` | `storage_init`, `storage_mmap_file`, `storage_munmap_file`, `storage_get_encryption_type` |
| `power_battery` | `power_battery.c` | `power_init`, battery statistics, wakelock acquire/release, shutdown |
| `display_core` | `display.cpp` | `nacl_display_create`, `nacl_display_update_waveform_data`, `nacl_display_render_frame`, `nacl_display_destroy` |
| `vulkan_renderer` | `vulkan_renderer.c` | `nacl_vulkan_alloc`, `nacl_vulkan_init`, vertex update, draw, swapchain recreation, shutdown/free |
| `display_media` | `display_media.c` | `media_codec_init`, decoder configuration/decode/shutdown, `display_render_frame` |
| `adb_client` | `adb_client.c` | ADB session/connect/packet/handshake/shell channel operations |
| `routing_core` | `routing_core.c` | `initialize_routing_engine`, `resolve_capability_pathway`, `dispatch_hardware_command`, `routing_core_set_jvm` |
| `privilege_broker` | `privilege_broker.c` | backend/capability queries, UID check, ping, backend query, dispatch |
| `nfc_subsystem` | `nfc_subsystem.c` | NFC lifecycle, reader mode, APDU transceive, JNI callback |
| `usb_subsystem` | `usb_subsystem.c` | USB claim/release/control/bulk transfer |
| `camera_subsystem` | `camera_subsystem.c` | camera initialization/open/stream/stop/close |
| `ipc_crypto` | `ipc_crypto.c` | crypto bridge init/shutdown, encrypt/decrypt, secure send/receive |

This strengthens the earlier conclusion that the project contains many real typed API surfaces rather than only the seven-module core registry.

## VERIFIED — important ABI categories

The target set naturally separates into:

1. **Capability client APIs** — USB, camera, NFC, sensors, audio, location, storage, power.
2. **System/service integration** — telephony, ADB, privilege broker, routing.
3. **Infrastructure APIs** — IPC crypto, shared memory, display/Vulkan.
4. **Host/runtime integration** — JNI/native bridge and QuickJS bindings.

These categories should not necessarily become one-to-one module IDs.

## VERIFIED — unresolved header issue

Several public headers are not named after their CMake target:

- sensor API is associated with `sensor_ipc_common.h`;
- location/audio/input/storage/power headers have names distinct from the target prefix;
- display has multiple related headers/targets;
- telephony uses `telephony_common.h`;
- shared memory uses `shm_ring_buffer.h`.

Therefore target-name → header-name inference is unsafe.

## INFERENCE

The inventory model should use explicit relationships:

`capability → target → source → public header(s) → exported function(s) → dependencies → activation/backend`

rather than deriving API identity from filenames.

## UNKNOWN

The repository search evidence above does **not** establish that every documented function is a dynamic ELF export. That remains a separate verification step.

It also does not yet establish whether some functions are implementation helpers, JNI entries, compatibility symbols, or mock-only APIs.

## Next pass

The next evidence step is to reconcile these documented function definitions against actual dynamic-symbol evidence and, where possible, built-artifact dependency information. No resolver implementation should be designed from the function list alone.
