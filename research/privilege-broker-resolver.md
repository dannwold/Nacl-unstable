# Privilege Broker Resolver Research — 2026-09-29

## Status

**VERIFIED:** The current ARM64 CI artifact contains `libprivilege_broker.so`. Its dynamic ABI and broker/daemon boundary have been characterized.

## Build and artifact

- CMake target: `privilege_broker`
- Source: `sdk/src/privilege_broker.c`
- Header: `sdk/include/nacl_privilege_broker.h`
- Runtime artifact: `libprivilege_broker.so`
- ARM64 artifact inspected: CI artifact ID `11046608330`

The CMake target links `liblog` only explicitly; the resulting ELF additionally records `libm.so`, `libdl.so`, and `libc.so`.

## Dynamic ABI

**VERIFIED:** Exactly eight dynamic exports:

- `nacl_privilege_backend_available`
- `nacl_privilege_backend_name`
- `nacl_privilege_broker_dispatch`
- `nacl_privilege_broker_get_backend`
- `nacl_privilege_broker_is_uid2000`
- `nacl_privilege_broker_ping`
- `nacl_privilege_capability_name`
- `nacl_privilege_capability_supported`

SONAME: `libprivilege_broker.so`.

No RPATH/RUNPATH was observed.

## ELF dependency boundary

**VERIFIED:** The shared client library has DT_NEEDED entries only for:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

There is no NACL-internal DT_NEEDED dependency in the shared library.

**INFERENCE:** The client library's connection to the privileged daemon is IPC/runtime behavior rather than ELF linking.

## Broker activation

**VERIFIED:** The client opens an AF_UNIX/SOCK_STREAM connection to:

`/data/local/tmp/sdk/sockets/privilege.sock`

It sends an `IpcHeader`, then a bounded broker envelope for dispatch operations, and reads an `IpcHeader` response plus bounded response payload.

**VERIFIED:** The transport implements full read/write loops and handles EINTR.

**INFERENCE:** Loading/resolving `libprivilege_broker.so` does not activate the broker. A compatible broker daemon must already be running and reachable at the socket path.

## Security/privilege boundary

**VERIFIED:** The daemon explicitly refuses startup unless its effective UID is 2000.

**VERIFIED:** The daemon independently checks `nacl_privilege_broker_is_uid2000()` before servicing broker operations.

**VERIFIED:** The client-side backend availability function reports:
- DIRECT: available
- UID2000: unavailable
- SHIZUKU: unavailable
- ADB: unavailable

This is a current implementation state, not proof that those backends are universally unavailable on Android.

**VERIFIED:** The daemon currently advertises only `BT_SCAN` and `WIFI_SCAN` through `nacl_privilege_capability_supported()`.

**VERIFIED:** Dispatch requires protocol version 1 and backend UID2000. Unsupported capability/backend combinations are rejected.

**INFERENCE:** This is a genuine privilege-boundary component, but the shared client itself does not grant UID 2000. The daemon must actually execute with that identity, and Android/SELinux/process policy can still constrain what the daemon can do.

## Protocol design

**VERIFIED:** The broker protocol uses fixed numeric capability/backend/command fields and bounded binary payloads.

**VERIFIED:** The dispatch path explicitly rejects caller-supplied shell text; capability handlers receive structured binary data.

**INFERENCE:** This is substantially closer to a capability IPC contract than a generic privileged command executor.

## ABI observations

**VERIFIED:** The public C functions form an explicit C ABI.

**VERIFIED:** Several public structs/enums are part of the header contract:
- `NaclPrivilegeBackend`
- `NaclCapability`
- `NaclBrokerCommand`
- `NaclBrokerRequest`
- `NaclBrokerResponse`
- `NaclBrokerDispatchEnvelope`

**INFERENCE:** The structs have no size/version fields of their own. The protocol has a version field in `NaclBrokerRequest`, but the public C ABI lacks a general struct-size compatibility mechanism.

## Lifecycle

**VERIFIED:** Each client request creates a new Unix socket connection, performs one request/response exchange, then closes it.

**INFERENCE:** The current client has request-scoped transport lifetime rather than a persistent broker session.

## ABI classification

All eight dynamic functions are **STABLE-ABI C CANDIDATES**, subject to eventual contract/version/error-status hardening.

In particular, `nacl_privilege_broker_dispatch()` is a generic protocol entry point and therefore needs a precisely versioned capability/command contract before being treated as finalized ABI.

## Known implementation/research concerns

**VERIFIED:** Backend availability is hard-coded in the current implementation and does not dynamically discover Shizuku/ADB/direct execution environments.

**VERIFIED:** Capability support is hard-coded to two capabilities in the current daemon.

**UNKNOWN:** Actual Android/SELinux policy permitting a UID-2000 daemon to create/listen on this path and access the downstream Bluetooth/Wi-Fi services is device/environment dependent and is not established by this repository alone.

**UNKNOWN:** The daemon's intended deployment/startup mechanism is not established by this resolver slice.

These are findings only; native implementation has not been modified.

## Resolver implication

**INFERENCE:** The generic loader can resolve the eight exported functions, but privilege broker use requires a separate capability-status/activation layer covering:
1. broker daemon presence;
2. socket accessibility;
3. daemon UID/privilege;
4. protocol compatibility;
5. requested backend/capability support;
6. downstream service availability/security policy.

**PROPOSAL:** Keep privilege-broker loading, broker activation, and privileged capability execution as separate states.

## Checkpoint

**PHASE C — `privilege_broker`: COMPLETE.**

Next simple-client slice: `usb_subsystem`.
