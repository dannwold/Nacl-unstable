# ELF Dynamic Export Verification

**Date:** 2026-09-29

## VERIFIED

The project previously used `readelf -Ws` during an export inspection. That includes the regular ELF symbol table and can expose local/static implementation symbols.

For runtime `dlsym()` ABI verification, the authoritative project method is now:

```text
nm -D --defined-only
readelf --dyn-syms
```

These inspect the dynamic symbol table relevant to runtime dynamic linking.

## Corrected findings

- `libbluetooth_client.so`: four intended dynamic exports.
- `libsensors_client.so`: `start_sensor_stream`, `stop_sensor_stream`.
- `libconnectivity_automation.so`: three observed `auto_*` dynamic exports.
- `libnative_host_bridge.so`: `JNI_OnLoad`, two `NativeInterface` JNI entries, `get_safe_jni_env`.
- `libshm_client.so`: dynamically exports `main`; this remains an anomaly.
- `libandroid_core.so`: core loader/lifecycle/error/version/property exports plus additional named native functions.

## Engineering consequence

Do not automatically treat every ELF dynamic export as stable public NACL ABI.

The future registry must classify exports explicitly as:

- stable public API;
- internal/helper;
- compatibility;
- JNI entry point;
- unexpected/stale/anomalous.

## UNKNOWN

The stable ABI classification for the full native library set is not yet complete.
