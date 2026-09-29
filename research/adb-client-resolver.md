# ADB Client Resolver Research — 2026-09-29

## Status

**VERIFIED:** The current ARM64 CI artifact contains `libadb_client.so` and its dynamic export surface has been characterized.

## Build and artifact

- CMake target: `adb_client`
- Source: `sdk/src/adb_client.c`
- Header: `sdk/include/adb_client.h`
- Runtime artifact: `libadb_client.so`
- Artifact inspected: ARM64 `nacl-libs-arm64-v8a.zip`, CI artifact ID `11046608330` from the resolver audit build.

## Dynamic ABI

**VERIFIED:** Dynamic exports, obtained with `nm -D --defined-only`:

- `adb_initialize_session`
- `adb_connect_loopback`
- `adb_send_packet`
- `adb_read_packet`
- `adb_handle_handshake`
- `adb_open_shell_channel`
- `adb_write_shell_data`
- `adb_read_shell_data`
- `adb_close_session`

No additional NACL functions were present in the dynamic export set.

## ELF dependencies

**VERIFIED:** `DT_NEEDED`:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

SONAME:

- `libadb_client.so`

No RPATH/RUNPATH was observed.

**VERIFIED:** There is no `libcrypto.so` DT_NEEDED dependency. Crypto is loaded dynamically inside the ADB authentication helper.

## Header ABI

**VERIFIED:** The public header exposes:

- protocol constants;
- packed `AdbHeader`;
- `AdbSessionState`;
- public `AdbSession` containing socket/state/channel IDs and fixed key-path buffers;
- nine public C functions listed above.

**INFERENCE:** The function boundary is C-ABI compatible, but the public `AdbSession` structure embeds implementation/session state directly. That makes the structure part of the exposed ABI and creates future compatibility/lifetime constraints. It is therefore not equivalent to an opaque-handle ABI.

## Activation boundary

**VERIFIED:** `adb_initialize_session()` only initializes client state and copies optional key paths.

**VERIFIED:** `adb_connect_loopback()` creates an IPv4 TCP socket and attempts a connection to `127.0.0.1:<local_port>`.

**VERIFIED:** `adb_handle_handshake()` sends an ADB CNXN packet and processes CNXN/AUTH/CLSE responses.

**VERIFIED:** Shell use requires a successful connected state, followed by `adb_open_shell_channel()`.

**INFERENCE:** `dlopen()` of `libadb_client.so` does not activate ADB. A separate local endpoint must already be listening and accept the implemented protocol.

## Authentication/provider boundary

**VERIFIED:** Authentication attempts to dynamically load `libcrypto.so` and resolve ten provider functions:

- `BIO_new_mem_buf`
- `PEM_read_bio_PrivateKey`
- `BIO_free`
- `EVP_PKEY_free`
- `EVP_MD_CTX_new`
- `EVP_MD_CTX_free`
- `EVP_sha256`
- `EVP_SignInit_ex`
- `EVP_SignUpdate`
- `EVP_SignFinal`

**UNKNOWN:** The repository does not establish that this provider name, symbol set, or ABI is available to an ordinary application across supported Android/vendor environments.

**INFERENCE:** ADB therefore has a second external runtime dependency boundary in addition to its socket endpoint.

## IPC/device boundary

**VERIFIED:** The client uses a TCP loopback socket rather than a Unix-domain socket, Binder, HAL, or device node.

**UNKNOWN:** Whether a target Android environment exposes a compatible ADB endpoint on the requested loopback port is runtime/environment dependent and is not established by this repository.

## Lifetime

**VERIFIED:** `AdbSession` owns the active socket descriptor and protocol state. `adb_close_session()` is the terminal session operation.

**INFERENCE:** The library can remain loaded while a session exists, but an active `AdbSession` must not be treated as independent of its socket/lifecycle state.

## ABI classification

- `adb_initialize_session`: **STABLE-ABI CANDIDATE**
- `adb_connect_loopback`: **STABLE-ABI CANDIDATE**, subject to endpoint semantics
- `adb_send_packet`: **STABLE-ABI CANDIDATE**, subject to complete-write/error-contract review
- `adb_read_packet`: **STABLE-ABI CANDIDATE**, subject to framing/error-contract review
- `adb_handle_handshake`: **STABLE-ABI CANDIDATE**, subject to authentication/provider contract
- `adb_open_shell_channel`: **STABLE-ABI CANDIDATE**
- `adb_write_shell_data`: **STABLE-ABI CANDIDATE**
- `adb_read_shell_data`: **STABLE-ABI CANDIDATE**
- `adb_close_session`: **STABLE-ABI CANDIDATE**

The classification is deliberately provisional: dynamic export visibility does not by itself establish a finalized public ABI.

## Known implementation concerns

**VERIFIED:** `adb_send_packet()` uses single `write()` calls for header and payload and treats short writes as failure instead of completing the stream write.

**VERIFIED:** `adb_read_packet()` performs a single header `read()` and rejects a short header rather than looping to fill it.

**VERIFIED:** Authentication provider function pointers are resolved locally and the provider handle is closed before returning.

**UNKNOWN:** The compatibility of the assumed `libcrypto.so` provider API on supported Android targets remains unverified.

These are research findings only; native implementation has not been modified.

## Resolver implication

**INFERENCE:** `libadb_client.so` can participate in the generic module/symbol resolver at the library boundary. A higher-level ADB adapter is still needed for:

1. endpoint discovery/availability;
2. authentication/provider selection;
3. session lifecycle;
4. protocol capability/version handling;
5. security/permission/privilege reporting.

**Native implementation changes remain unauthorized.**

## Checkpoint

**PHASE C — `adb_client`: COMPLETE.**

Next simple-client slice: `privilege_broker`.
