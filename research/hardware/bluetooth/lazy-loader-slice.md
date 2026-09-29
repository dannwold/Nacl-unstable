# Bluetooth Canonical Lazy-Loading Slice

**Date:** 2026-09-29  
**Repository:** `dannwold/Nacl-unstable`  
**Status:** research/design only — no native implementation changes

## VERIFIED — ownership and ABI

Canonical build target:

- CMake target: `bluetooth_client`
- Source: `sdk/src/libbluetooth_client.c`
- Header: `sdk/include/bluetooth_client.h`
- Output: `libbluetooth_client.so`

The header declares exactly four client functions, and the ARM64 CI ELF artifact verifies those same four as dynamic exports:

- `int bt_start_le_scan(void)`
- `int bt_stop_le_scan(void)`
- `int bt_get_discovered_devices(BleScanResult *out_buffer, uint32_t max_count, uint32_t *out_count)`
- `const char *bt_get_client_version(void)`

The client implementation marks these four functions with default ELF visibility. Its daemon-connect helper is `static`, so it is not part of the dynamic ABI.

## VERIFIED — module dependencies

The client library's ARM64 ELF NEEDED set contains only Android/system libraries:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

It does not have an ELF NEEDED edge to another NACL shared library.

However, the client has a **runtime IPC dependency** on:

`/data/local/tmp/sdk/sockets/bluetooth.sock`

This is deliberately separate from ELF loading.

The CMake graph also shows a different dependency direction:

- `privilege_broker_daemon` links against `bluetooth_client`
- `quickjs_bindings` links against `bluetooth_client`

Thus the Bluetooth client is independently loadable, while higher-level components may link/load it as a dependency.

## VERIFIED — activation boundary

Loading `libbluetooth_client.so` does not start scanning.

A scan operation calls the exported function, which then:

1. creates a Unix-domain socket;
2. connects to the Bluetooth daemon;
3. sends a packed `BtIpcHeader`;
4. waits for the daemon response;
5. closes the socket.

Therefore the conceptual lifecycle is:

`load library → resolve function → call function → IPC activation`

not:

`load library → Bluetooth scan automatically active`

This is exactly the distinction NACL's loader architecture needs to preserve.

## VERIFIED — ABI data types

The Bluetooth ABI crosses the module boundary using:

- fixed-width integer types;
- a packed `BleScanResult`;
- caller-owned output buffer;
- caller-owned output count;
- a static string returned by `bt_get_client_version()`.

The resolver must therefore preserve the header's actual function signatures. It should not reduce every symbol to an untyped generic invocation API.

## VERIFIED — daemon/backend maturity

The current daemon does **not** establish real hardware BLE scanning.

`bluetooth_svc.cpp` contains comments describing intended direct Binder access, but `start_le_scan_via_binder()` currently starts a thread that calls `generate_mock_le_telemetry()`.

That function synthesizes BLE addresses, RSSI values, device class, and advertisement payloads.

Therefore:

- client ABI: VERIFIED
- client/daemon IPC path: VERIFIED in source
- daemon scan activation path: VERIFIED as implemented
- actual Android Bluetooth hardware scan: **NOT VERIFIED**
- current scan telemetry: **mock/synthetic**

## VERIFIED — IPC protocol shape

The shared header defines:

- magic: `0x4E414342`
- transaction ID
- command
- status
- payload length

Commands currently handled by the daemon include:

- start LE scan
- stop LE scan
- get devices

The header also defines future GATT command IDs, but the current daemon switch does not implement them.

## UNKNOWN / ENGINEERING RISKS

These are not reasons to redesign the loader, but they matter to activation/lifetime classification:

1. The daemon accepts a nonblocking/edge-triggered client socket but performs a single `read()` for the fixed IPC header. Stream sockets do not guarantee that one read returns the complete header.
2. The daemon similarly performs single `write()` calls for responses/payloads, so full-write handling is not established.
3. The client allocates `resp.payload_len` bytes before applying its output-buffer limit. A malicious or corrupted daemon response could therefore request a very large allocation.
4. The client uses separate function-local static transaction counters for start/stop/get operations rather than a shared synchronized counter.
5. Daemon scan state and device-list lifetime need to be considered before any unload/reload design.
6. The daemon's JNI initialization path attempts to dynamically resolve `JNI_CreateJavaVM`; Android runtime assumptions for creating/attaching a JVM in this daemon context are not yet verified.
7. The daemon's current Binder path is descriptive/mock rather than a verified direct `IBluetoothGatt` implementation.
8. Socket permissions/SELinux/UID requirements for an ordinary Android app versus privileged execution remain to be established experimentally.

## PROPOSED — resolver descriptor

Bluetooth is now sufficiently characterized to serve as the first typed resolver descriptor.

Conceptually, its metadata should identify:

- canonical module ID: Bluetooth client
- output name: `libbluetooth_client.so`
- four stable function names
- exact C signatures from `bluetooth_client.h`
- NEEDED dependencies
- runtime activation dependency: Bluetooth daemon IPC
- activation state: separate from module-loaded state
- current backend maturity: mock/synthetic
- unload restriction: unresolved until active calls/callback/daemon ownership is defined

The descriptor should be metadata for the existing typed API, not a replacement for `bluetooth_client.h`.

## PROPOSED — first resolver test matrix

A future implementation test should establish:

1. initialize core
2. verify Bluetooth module initially unloaded
3. resolve `bt_get_client_version`
4. verify Bluetooth module becomes loaded
5. call the typed function
6. resolve each remaining intended symbol
7. request a nonexistent symbol and verify deterministic failure
8. invoke scan only if the daemon/activation environment is available
9. verify error reporting when the daemon is unavailable
10. test module lifetime before permitting unload

The test should explicitly distinguish **symbol resolution success** from **capability activation success**.

## Conclusion

Bluetooth is now the strongest evidence-backed candidate for the first resolver slice because its module ownership, four-function C ABI, ELF exports, ELF dependencies, IPC activation boundary, and current mock maturity are all clearly separable.

The remaining general inventory work should reuse this classification model rather than invent another abstraction.
