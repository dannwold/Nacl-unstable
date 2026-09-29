# Loader and ABI Research

**Date:** 2026-09-29

## VERIFIED: current core loader

`sdk/src/android_core.c` maintains module state and provides:

- `nacl_core_initialize()`
- `nacl_core_shutdown()`
- `nacl_core_load_module()`
- `nacl_core_unload_module()`
- `nacl_core_get_symbol()`
- `nacl_core_is_module_loaded()`

For non-core modules, the current implementation uses:

```c
dlopen(path, RTLD_NOW | RTLD_GLOBAL)
```

Symbol lookup uses `dlsym()`.

The current loader therefore already supports lazy module acquisition followed by targeted symbol lookup.

## VERIFIED: important distinction

NACL lazy loading has three separate concepts:

1. **Library loading** — `dlopen()`.
2. **Function resolution** — `dlsym()`.
3. **Capability activation** — starting a daemon, opening a device, registering callbacks, allocating resources, or otherwise activating a subsystem.

Loading a library does not prove that its underlying capability is active.

## VERIFIED: dynamic export evidence

CI Run #36 arm64-v8a artifacts were checked using:

- `nm -D --defined-only`
- `readelf --dyn-syms`

These are the authoritative methods recorded for runtime dynamic-export verification in this project.

For Bluetooth, the dynamic ABI contains exactly:

- `bt_start_le_scan`
- `bt_stop_le_scan`
- `bt_get_discovered_devices`
- `bt_get_client_version`

The source-level `static connect_to_bt_daemon()` is not a dynamic export.

## VERIFIED: Bluetooth ELF dependencies

`libbluetooth_client.so` declares NEEDED dependencies on:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

It does not declare another NACL shared library as an ELF NEEDED dependency. Its daemon relationship is through the Unix-domain socket documented in `bluetooth_ipc_common.h`.

## INFERENCE

Bluetooth is a particularly clean first resolver slice because it has:

- one client shared library;
- four dynamic ABI functions;
- a separate daemon/service boundary;
- limited direct ELF dependencies.

## PROPOSAL

Before implementing a generalized resolver:

1. Assign a canonical module ID/name/path to Bluetooth.
2. Define typed descriptors for the four stable functions.
3. Define ownership/lifetime rules for resolved function pointers.
4. Test load → resolve → call/error behavior against a CI-built artifact.
5. Keep daemon activation separate from `dlopen()` and `dlsym()`.
6. Generalize only after this slice is proven.

## UNKNOWN

- Final public ABI for the entire project.
- Whether every current ELF-visible function is intended stable API.
- Safe unload policy for each subsystem.
- Final relationship between the seven-module and 21-module APIs.
- Runtime Android security/privilege requirements for each capability.
