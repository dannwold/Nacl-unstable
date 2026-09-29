# NACL Telephony Resolver Slice

Date: 2026-09-29
Repository: dannwold/Nacl-unstable
Branch: main

## Status

**COMPLETE for the planned resolver characterization, with important ABI-quality findings.**

The current CI-built `libtelephony_client.so` has a small dynamic C surface, but the three exported functions do not all qualify equally as stable ABI candidates. One function is explicitly a placeholder/fallback and another depends on JNI state that has no exported initialization path in this library.

## VERIFIED

### Build owner

`sdk/CMakeLists.txt` defines:
- target: `telephony_client`
- source: `sdk/src/telephony_client.c`
- output: `libtelephony_client.so`
- direct CMake link dependency: `log`

### Header ABI

`sdk/include/telephony_common.h` provides the shared data model:
- `CellularRadioTech`
- `CellConnStatus`
- packed `CellTowerMetric`
- packed `TelephonyState`

The header does not provide prototypes for the three exported functions. The exported function declarations therefore need to be treated as source/ELF ABI evidence rather than a clean public-header contract.

### Actual CI-built dynamic ABI

Artifact inspected:
- Workflow: Android NDK Multi-ABI Compiler
- Run #53
- Run ID: `36598137213`
- Commit: `edfb8013595f0c64a2cd80c9e080dfbea452a9`
- Artifact: `nacl-libs-arm64-v8a`
- Artifact ID: `11046608330`
- Runtime library: `jniLibs/arm64-v8a/libtelephony_client.so`

Dynamic-symbol inspection used `nm -D --defined-only` and `readelf --dyn-syms`.

Exactly three functions are dynamically exported:
- `telephony_binder_get_imsi`
- `telephony_jni_populate_state`
- `telephony_parse_registry_dumpsys`

No additional defined dynamic exports were found.

### ELF NEEDED dependencies

The current arm64-v8a library declares:
- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

No NACL-internal shared library is declared as an ELF NEEDED dependency.

The dynamic undefined-symbol set is resolved through the standard C runtime; no separate JNI symbols are dynamically imported because the implementation calls JNI through the `JavaVM`/JNI environment function tables.

### Function behavior and ABI classification

#### `telephony_binder_get_imsi`

**VERIFIED:** The function currently does not perform a Binder transaction.

Its source contains comments describing an intended low-level `iphonesubinfo` Binder route, but the implementation instead copies the literal string `310260123456789` into the caller buffer and returns success.

Classification: **INTERNAL/PLACEHOLDER — NOT a stable telephony data ABI candidate.**

This must not be treated as verified real-device IMSI retrieval.

#### `telephony_jni_populate_state`

**VERIFIED:** The function attempts to populate:
- SIM state
- data state
- subscriber IMSI

through a cached `TelephonyManager` JNI object.

However, the library's static JNI route state is initialized to null and this file exposes no exported function that initializes `g_jni_route.jvm`, `g_jni_route.telephony_manager_obj`, or `g_jni_route.has_jni`.

Consequently, from the inspected library alone, the function has no demonstrated activation/initialization path and returns `-1` when that state is absent.

The IMSI access also carries Android permission/runtime-policy implications; the source comment identifies `READ_PHONE_STATE` as required for that operation, but current platform enforcement was not independently runtime-tested here.

Classification: **UNKNOWN / incomplete integration ABI**, not yet a stable candidate.

#### `telephony_parse_registry_dumpsys`

**VERIFIED:** This is a local parser. It accepts a dumpsys text buffer and writes parsed `CellTowerMetric` records.

It scans for `CellIdentityLte` and extracts MCC, MNC, CI, PCI, TAC and EARFCN when present. It then assigns fixed default signal values (`dbm=-95`, `rsrp=-105`, `rsrq=-12`, `rssnr=15`) rather than deriving those values from the input in the current implementation.

It has no Android Binder/socket/device activation requirement itself.

Classification: **STABLE-ABI CANDIDATE** as a pure C parsing utility, subject to adding/confirming a public prototype and documenting its current parsing/default-value semantics.

### Activation boundary

There is no verified telephony hardware/service activation performed by `dlopen()` or by the library's three exports.

- `telephony_binder_get_imsi` is currently a placeholder and does not activate Binder.
- `telephony_jni_populate_state` requires pre-existing JNI state that is not initialized by an exported function in this module.
- `telephony_parse_registry_dumpsys` only parses caller-supplied text.

Therefore the current library is better characterized as a small collection of telephony-related helpers than as a complete telephony capability client.

### IPC/device boundary

**VERIFIED:** The intended Binder route is only present as comments; no actual Binder API invocation exists in the current implementation.

The JNI route is through a caller-supplied/cached `TelephonyManager` Java object.

The parser has no device boundary.

### Lifetime

- `telephony_parse_registry_dumpsys` has caller-owned input/output buffers and no persistent internal state.
- `telephony_jni_populate_state` depends on global cached `JavaVM*` and `jobject` state. Lifetime/ownership of that object is not established by this library.
- No worker thread, callback, socket, or persistent telephony session is created by these functions.

Safe module unload for the parser is straightforward in isolation. JNI-state lifetime makes the JNI helper unsuitable for treating symbol resolution as equivalent to capability readiness.

### Availability/security

- Real telephony access is Android-policy/permission dependent.
- The current IMSI Binder function does not actually access telephony and therefore cannot be classified as real capability availability.
- The JNI helper is permission/platform-policy dependent and currently lacks a demonstrated initialization path.
- The parser is locally available and does not itself require telephony privileges.

No claim is made here that an ordinary application can access IMSI, cell information, or privileged telephony Binder interfaces on a current stock Android release.

## INFERENCE

1. `telephony_client` should not yet be treated as a single clean stable capability ABI.
2. The generic resolver can technically resolve all three dynamic symbols, but ABI classification must prevent placeholder/internal functions from automatically becoming public stable API.
3. The parser is the clearest current stable-ABI candidate within this library, while actual telephony access requires a separate, explicitly designed Android/JNI/Binder integration path.
4. A future resolver registry should carry ABI classification/visibility metadata rather than equating every dynamic export with stable API.

## UNKNOWN

1. Whether a different branch/commit contains an initialization path for the JNI cache that is intentionally external to this library.
2. Whether the intended Binder implementation was deliberately stubbed for research/mock use or is unfinished.
3. Exact current Android permission behavior for each desired TelephonyManager operation on the project's target Android 16 device; this was not runtime-tested in this slice.
4. Whether `CellTowerMetric` and `TelephonyState` packed layouts are intended as long-term cross-module/public ABI.

## Resolver conclusion

**Telephony PHASE B is complete for the current repository evidence.**

The important finding is not merely the three exported symbols; it is that dynamic visibility alone is insufficient to define stable NACL ABI. The resolver registry must distinguish public/stable candidates from placeholders, incomplete integrations, and internal helpers.

Proceed to **PHASE C — simple client libraries**, beginning with `ipc_crypto`.

## Evidence

- `sdk/CMakeLists.txt`
- `sdk/src/telephony_client.c`
- `sdk/include/telephony_common.h`
- CI Run #53 / arm64-v8a artifact `nacl-libs-arm64-v8a`
