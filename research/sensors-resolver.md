# NACL Sensors Resolver Slice

Date: 2026-09-29
Repository: dannwold/Nacl-unstable
Branch: main

## Status

**PARTIAL — source/runtime characterization complete; built-ELF dynamic export verification remains UNKNOWN.**

## VERIFIED

### Build target

sdk/CMakeLists.txt defines:
- sensors_client as a shared library built from src/sensors_client.c.
- sensors_daemon as an executable built from src/sensors_daemon.c.
- sensors_client links only the log library in the current CMake configuration.

### Client public symbols visible in source

sdk/src/sensors_client.c marks these two functions with visibility("default"):
- start_sensor_stream(SensorCallback callback)
- stop_sensor_stream(SensorClientSession *session)

The callback type is a function pointer taking const SensorDataEvent *.
SensorClientSession is an internal struct in the source and is not exposed through a public header declaration.

This establishes intended public source-level exports, but does not yet prove the final dynamic ELF export set.

### IPC boundary

sdk/include/sensor_ipc_common.h defines:
- socket directory: /data/local/tmp/sdk/sockets
- sensor socket: /data/local/tmp/sdk/sockets/sensors.sock
- subsystem: SUBSYSTEM_SENSORS = 3
- commands: start 400, stop 401, get capabilities 402
- packed IpcHeader
- packed SensorDataEvent

The client connects to the Unix-domain socket, sends a start request, waits for an ACK, then starts a pthread listener.

### Activation boundary

Loading/resolving sensors_client does not itself activate the sensor hardware. start_sensor_stream() connects to the daemon and sends CMD_SENSORS_START_STREAM.

The daemon then enables the accelerometer through Android native sensor APIs and sets a 50 Hz rate. The daemon multiplexes the Unix socket server and sensor event queue using epoll.

### Lifetime

The client allocates a SensorClientSession, owns a socket and pthread, and retains the callback pointer. stop_sensor_stream() sends the stop command, closes the socket, joins the listener thread, and frees the session.

Therefore a generic resolver must not treat the function pointer alone as the lifetime of the capability. A higher-level sensor session owns resources beyond symbol resolution.

### Runtime dependencies

The daemon directly uses Android sensor/looper APIs and dynamically opens libandroid.so to resolve ASensorEventQueue_getFd.

The client source itself uses POSIX socket/pthread/memory APIs. Current CMake links only log for the client target.

## INFERENCE

1. Sensors should be represented as module loading + separate capability activation/session lifecycle, not as a simple dlopen/dlsym operation.
2. The generic resolver can likely resolve the two intended client functions, but a sensor-specific lifecycle adapter is needed if the public NACL API is expected to manage sessions safely.
3. The daemon is a separate activation boundary and security/availability boundary; its existence does not imply that an ordinary application can start it or access its socket.

## UNKNOWN

1. Exact dynamic export table of the current CI-built libsensors_client.so.
2. Exact ELF NEEDED list of the current built client artifact.
3. Whether the current daemon is actually deployable/runnable under the intended Android UID/SELinux context.
4. Whether the hard-coded /data/local/tmp/sdk/sockets endpoint is accessible to the intended application/daemon arrangement on a real target.
5. Whether the packed wire structures are sufficiently versioned/portable for the long-term public IPC ABI.
6. Whether partial socket reads/writes are correctly handled under all conditions; current source assumes full struct reads/writes in several places.

## Resolver consequence

**Do not mark Sensors complete yet.** The missing artifact verification is specifically the dynamic export table and NEEDED dependencies. Once those are verified, proceed to Telephony.

## Evidence

- sdk/CMakeLists.txt
- sdk/src/sensors_client.c
- sdk/src/sensors_daemon.c
- sdk/include/sensor_ipc_common.h
