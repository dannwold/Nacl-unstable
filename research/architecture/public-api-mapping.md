# Public API Mapping — Evidence Pass

**Date:** 2026-09-29  
**Repository:** `dannwold/Nacl-unstable`  
**Scope:** public headers and source/API relationships; no native implementation changes.

## VERIFIED

The repository has multiple categories of public native interfaces.

### Capability APIs with explicit C headers

**USB — `usb_subsystem.h`**

Public functions:
- `usb_claim_interface`
- `usb_release_interface`
- `usb_control_transfer`
- `usb_bulk_write`
- `usb_bulk_read`

The API accepts a device file descriptor supplied by the host and exposes Linux USB transfer semantics. This is a concrete example where the capability API is lower-level than an Android framework abstraction.

**Camera — `camera_subsystem.h`**

Public functions:
- `camera_initialize`
- `camera_open_device`
- `camera_start_streaming`
- `camera_stop_streaming`
- `camera_close_device`

The public structures contain NDK camera/image-reader handles and a raw YUV-frame callback.

**NFC — `nfc_subsystem.h`**

Public functions:
- `nfc_initialize`
- `nfc_start_reader_mode`
- `nfc_stop_reader_mode`
- `nfc_transceive_apdu`

The interface depends on `JavaVM`/JNI objects, so its ABI and lifetime requirements differ from a pure POSIX/device API.

**IPC crypto — `ipc_crypto.h`**

Public functions:
- `ipc_crypto_init`
- `ipc_crypto_shutdown`
- `ipc_crypto_encrypt`
- `ipc_crypto_decrypt`
- `ipc_secure_send`
- `ipc_secure_recv`

The implementation dynamically resolves cryptographic-library functions through a `LibCryptoBridge` function-pointer table. This is itself a second-order example of lazy function resolution.

**Privilege broker — `nacl_privilege_broker.h`**

Public functions include:
- backend availability/query functions;
- capability support/name functions;
- UID-2000 detection;
- ping;
- backend discovery;
- capability dispatch.

The broker explicitly models Direct, UID 2000, Shizuku, and ADB backends.

### Data/protocol-only headers

**Telephony — `telephony_common.h`**

Defines cellular technology/state enums and packed telemetry structures. The current inspected evidence does not yet establish the complete public function ABI for `telephony_client`.

**Shared memory — `shm_ring_buffer.h`**

Defines the shared-memory ring-buffer ABI and BLE packet layout, but contains no exported function declarations. This should therefore be treated as a data/IPC ABI component rather than automatically as a function module.

**Bluetooth — `bluetooth_client.h`**

Declares four functions and is already matched to the previously verified four dynamic exports:
- `bt_start_le_scan`
- `bt_stop_le_scan`
- `bt_get_discovered_devices`
- `bt_get_client_version`

## VERIFIED — ABI implications

The public interfaces are heterogeneous:

- opaque/context handles;
- Android NDK object pointers;
- JNI/JavaVM references;
- file descriptors;
- callbacks;
- packed wire structures;
- dynamically resolved function-pointer tables;
- asynchronous IPC.

Therefore a generic NACL resolver should not attempt to erase these distinctions into one universal function signature.

The stable generic layer should identify a function and expose metadata about its ABI/ownership/activation requirements, while the capability-specific header remains authoritative for the actual C type.

## VERIFIED — export status distinction

A declaration in a public header is not sufficient evidence that a function is a runtime dynamic export.

The repository's earlier ELF validation established this distinction. Future inventory entries therefore need separate fields for:

- header declaration;
- source definition;
- dynamic ELF export;
- implementation maturity.

## INFERENCE

The correct registry is likely a metadata/dispatch layer around existing typed APIs, rather than a replacement for those APIs.

For example, USB should continue exposing a typed `usb_bulk_read()`, while the generic resolver identifies that function as belonging to the USB capability and resolves its address only when requested.

## UNKNOWN / NEXT

Still required:

1. Complete function-definition inventory for all shared-library targets.
2. Dynamic-export verification for every shared library.
3. Exact ELF NEEDED dependency graph.
4. Activation/lifetime requirements per function.
5. Classification of production, limited, mock, and unavailable implementations.
6. Reconciliation with the 21-module declaration without assuming that every CMake target is a capability.

## Checkpoint significance

This pass confirms that NACL's existing code already contains several legitimate low-level C ABIs. The future loader must preserve them rather than replacing them with a generic untyped API.
