# NFC Subsystem Resolver Research — 2026-09-29

## Status

**VERIFIED:** The current ARM64 CI artifact contains `libnfc_subsystem.so`. Its exported C API and JNI callback boundary have been characterized.

## Build and artifact

- CMake target: `nfc_subsystem`
- Source: `sdk/src/nfc_subsystem.c`
- Header: `sdk/include/nfc_subsystem.h`
- Runtime artifact: `libnfc_subsystem.so`
- ARM64 artifact inspected: CI artifact ID `11046608330`, workflow run ID `36598137213`

## Dynamic ABI

**VERIFIED:** Five functions are dynamically exported:

- `nfc_initialize`
- `nfc_start_reader_mode`
- `nfc_stop_reader_mode`
- `nfc_transceive_apdu`
- `Java_com_nacl_native_NfcBridge_onTagDiscovered`

The first four are declared by the public header. The fifth is a JNI entry hook implemented in the source but not declared as part of the public C API.

SONAME: `libnfc_subsystem.so`.

No RPATH/RUNPATH was observed.

## ELF dependency boundary

**VERIFIED:** DT_NEEDED contains only:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

There is no NACL-internal DT_NEEDED dependency.

## Activation and Android boundary

**VERIFIED:** NFC activation is JNI/Android-framework based rather than a NACL Unix-socket or native-daemon protocol.

`nfc_initialize()` receives a `JavaVM *`, obtains a `JNIEnv *`, resolves `android.nfc.NfcAdapter`, and attempts to call `NfcAdapter.getDefaultAdapter(Context)`.

**VERIFIED:** The current implementation passes a NULL `Context` to `getDefaultAdapter()` rather than obtaining an actual application/activity context. Therefore successful real-device initialization is not established by repository evidence.

**VERIFIED:** `nfc_start_reader_mode()` resolves the `NfcAdapter.enableReaderMode()` method but does not actually invoke it. The function returns success after method resolution.

**INFERENCE:** The current NFC module is an incomplete framework/JNI integration rather than a verified working reader-mode implementation.

## Tag callback boundary

**VERIFIED:** The JNI hook `Java_com_nacl_native_NfcBridge_onTagDiscovered()` is dynamically exported and updates a process-global `NfcContext *`, callback pointer, and user-data pointer.

It caches the Android `Tag` as a global JNI reference and extracts up to 32 bytes from `Tag.getId()`.

**VERIFIED:** The JNI hook hard-codes `tag_type = 2` and does not derive the type from Android tag technology data.

**INFERENCE:** The JNI export is an integration hook/internal boundary, not a stable generic NACL capability function. It should not automatically enter the generic public resolver registry merely because it is dynamically exported.

## APDU activation/lifetime

**VERIFIED:** `nfc_transceive_apdu()` requires a current global `Tag` reference. It resolves `android.nfc.tech.IsoDep`, obtains an IsoDep instance, calls `connect()`, creates a Java byte array, and invokes `transceive()`.

**VERIFIED:** The implementation depends on a valid JVM, valid JNI references, an active Tag, and a tag compatible with IsoDep.

**UNKNOWN:** The repository does not establish the complete Java-side permission/activity lifecycle, NFC adapter state, tag-discovery wiring, or actual device behavior.

**INFERENCE:** Loading/resolving `libnfc_subsystem.so` does not activate NFC. Activation requires Android framework state and a correctly wired Java/JNI reader-mode lifecycle.

## Public ABI observations

**VERIFIED:** The public header exposes packed structures:

- `NfcTagInfo`
- `NfcContext`

and the callback type `NfcTagCallback`.

**VERIFIED:** `NfcContext` contains a `JavaVM *` and JNI object references. These are process/runtime handles, not portable serialized state.

**INFERENCE:** The packed struct layout and JNI-handle lifetime rules are part of the effective ABI contract. A future stable ABI should consider opaque handles rather than exposing JNI object pointers directly.

## Threading/lifetime concerns

**VERIFIED:** The module stores callback/context state in process-global static variables:
- `g_tag_cb`
- `g_cb_user_data`
- `g_nfc_ctx`

There is no synchronization around these variables.

**VERIFIED:** `nfc_stop_reader_mode()` clears the callback but does not call Android `disableReaderMode()` or delete the cached global references.

**INFERENCE:** Reader-mode/thread/context lifetime is not currently safe enough to treat as a finalized subsystem contract. Callback registration, JNI reference cleanup, thread attachment, and reader-mode disablement need explicit lifecycle semantics.

## ABI classification

- `nfc_initialize`: **UNKNOWN / INCOMPLETE**
- `nfc_start_reader_mode`: **UNKNOWN / INCOMPLETE**
- `nfc_stop_reader_mode`: **UNKNOWN / INCOMPLETE**
- `nfc_transceive_apdu`: **UNKNOWN / INCOMPLETE**
- `Java_com_nacl_native_NfcBridge_onTagDiscovered`: **INTERNAL JNI HOOK**, not a stable public C-ABI candidate

Dynamic export presence is therefore insufficient to classify the current NFC API as stable.

## Resolver implication

**INFERENCE:** The library can technically be loaded and its symbols resolved by the generic resolver, but NFC requires a specialized JNI/framework activation adapter.

The resolver registry should distinguish:
1. public C ABI functions;
2. JNI entry hooks;
3. framework activation state;
4. tag/session lifetime;
5. callback registration and teardown.

This is a concrete example where generic symbol resolution and capability activation must remain separate.

## Known implementation/research concerns

**VERIFIED:** The current source does not establish a usable Android `Context` for `getDefaultAdapter()`.

**VERIFIED:** `enableReaderMode()` is looked up but not invoked.

**VERIFIED:** `nfc_stop_reader_mode()` does not disable reader mode.

**VERIFIED:** JNI exception/error handling is not systematically checked after framework calls.

**VERIFIED:** `nfc_transceive_apdu()` does not validate all pointer/length combinations before JNI array operations.

These are findings only; native implementation has not been modified.

## Checkpoint

**PHASE C — `nfc_subsystem`: COMPLETE as an evidence characterization.**

Next simple-client slice: `nacl_location`.
