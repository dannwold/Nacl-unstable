# NACL Sensors Resolver Slice

Date: 2026-09-29
Repository: dannwold/Nacl-unstable
Branch: main

## Status

**COMPLETE for the planned resolver evidence slice.** Source/runtime characterization and current CI-built ELF dynamic export/dependency verification are now established.

## VERIFIED

### Build target

`sdk/CMakeLists.txt` defines:
- `sensors_client` as a shared library built from `src/sensors_client.c`.
- `sensors_daemon` as an executable built from `src/sensors_daemon.c`.
- `sensors_client` links the log library in the current CMake configuration.

### Client public source ABI

`sdk/src/sensors_client.c` marks these two functions with `visibility("default")`:
- `start_sensor_stream(SensorCallback callback)`
- `stop_sensor_stream(SensorClientSession *session)`

The callback type takes `const SensorDataEvent *`.

`SensorClientSession` is an internal struct and is not exposed as a public struct declaration.

### Actual CI-built dynamic ABI

Artifact inspected:
- Workflow: Android NDK Multi-ABI Compiler
- Run: #53
- Run ID: `36598137213`
- Commit: `edfb8013595f0c64a2cd80c9e080dfbea4529b59`
- Artifact: `nacl-libs-arm64-v8a`
- Artifact ID: `11046608330`
- Runtime library: `jniLibs/arm64-v8a/libsensors_client.so`

Dynamic-symbol inspection used `nm -D --defined-only` / `readelf -Ws` cross-check.

The actual dynamic exports are exactly:
- `start_sensor_stream`
- `stop_sensor_stream`

No additional regular/static symbol is being mistaken for a runtime dynamic export.

### ELF NEEDED dependencies

The current arm64-v8a `libsensors_client.so` declares:
- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

No NACL-internal shared library is declared as an ELF NEEDED dependency.

### IPC boundary

`sdk/include/sensor_ipc_common.h` defines:
- socket directory: `/data/local/tmp/sdk/sockets`
- sensor socket: `/data/local/tmp/sdk/sockets/sensors.sock`
- subsystem: `SUBSYSTEM_SENSORS = 3`
- commands: start 400, stop 401, get capabilities 402
- packed `IpcHeader`
- packed `SensorDataEvent`

The client connects to the Unix-domain socket, sends a start request, waits for an ACK, then starts a pthread listener.

### Activation boundary

Loading/resolving `libsensors_client.so` does **not** itself activate sensor hardware.

`start_sensor_stream()` activates the client-side session by connecting to the daemon and sending `CMD_SENSORS_START_STREAM`.

The daemon then:
- obtains the Android sensor manager;
- selects the default accelerometer;
- creates an Android looper/event queue;
- resolves `ASensorEventQueue_getFd` from `libandroid.so`;
- enables the accelerometer;
- requests a 20,000 microsecond event period (50 Hz);
- multiplexes client sockets and the sensor event queue with epoll;
- broadcasts sensor events to registered streaming clients.

### Lifetime

The client session owns:
- Unix socket;
- listener pthread;
- callback pointer;
- session allocation.

`stop_sensor_stream()` sends the stop request, closes the socket, joins the listener thread, and frees the session.

Therefore a resolved function pointer must not be treated as equivalent to a live sensor capability session. A resolver/lifecycle integration layer must keep module lifetime and capability-session lifetime distinct.

### Availability/security boundary

The daemon and its Unix socket are a separate activation/security boundary. Source evidence does not establish that an ordinary application UID can create/run the daemon or access `/data/local/tmp/sdk/sockets/sensors.sock` on a stock Android device.

The Android sensor APIs are reached by the daemon process, not directly by `libsensors_client.so`.

### ABI classification

- `start_sensor_stream`: **STABLE-ABI CANDIDATE**, because it is explicitly exported, has an explicit C declaration, and is part of the current built client ABI. Long-term stability is not yet contractually established.
- `stop_sensor_stream`: **STABLE-ABI CANDIDATE**, for the same evidence.
- `SensorClientSession`: **INTERNAL/OPAQUE**, because its structure is private to the implementation.
- Sensor IPC wire structures: **UNKNOWN for long-term stable ABI** because they are packed and currently lack a demonstrated version-negotiation scheme.

### Resolver implication

Sensors can use the same generic module/symbol resolution mechanism for its two exported client functions.

However, the capability still requires a sensor-specific activation/lifetime adapter because:
- activation occurs through a daemon;
- a session owns a socket and pthread;
- callback lifetime matters;
- hardware streaming is separate from library loading.

The resolver should therefore resolve functions, while a higher-level capability/session layer manages activation and teardown.

## INFERENCE

1. Sensors are a good example of why NACL must keep library loading, symbol resolution, and capability activation as separate states.
2. The absence of NACL-internal ELF NEEDED dependencies makes the client library itself a relatively simple leaf resolver target.
3. The daemon boundary may impose availability/security restrictions independent of whether the client library successfully loads and resolves.
4. Safe unload cannot be inferred merely from successful symbol resolution; active sessions and callback/listener state must be considered.

## UNKNOWN

1. Whether the daemon is deployable/runnable under the intended Android UID/SELinux context.
2. Whether the hard-coded socket path is accessible to the intended application/daemon arrangement on a real target.
3. Whether partial socket reads/writes are robust under all conditions; several source paths assume complete struct transfers.
4. Whether the packed IPC structures are suitable as a long-term cross-version public protocol.
5. Whether the two exported functions are intended as a permanent stable ABI contract rather than the current implementation surface.

## Resolver conclusion

**Sensors is complete for the current planned resolver characterization.**

The artifact evidence now proves the two dynamic exports and exact ELF NEEDED set. Proceed to **PHASE B — Telephony**.

## Evidence

- `sdk/CMakeLists.txt`
- `sdk/src/sensors_client.c`
- `sdk/src/sensors_daemon.c`
- `sdk/include/sensor_ipc_common.h`
- CI Run #53 / arm64-v8a artifact `nacl-libs-arm64-v8a`
