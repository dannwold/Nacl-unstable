# IPC Crypto Resolver Research — 2026-09-29

## Status

**VERIFIED:** ELF characterization of the current ARM64 CI artifact is complete.

## Build and artifact

- CMake target: `ipc_crypto`
- Source: `sdk/src/ipc_crypto.c`
- Header: `sdk/include/ipc_crypto.h`
- Runtime library: `libipc_crypto.so`
- Artifact: ARM64 `nacl-libs-arm64-v8a`

## Dynamic ABI

Verified from the built ELF dynamic symbol table:

- `ipc_crypto_init`
- `ipc_crypto_shutdown`
- `ipc_crypto_encrypt`
- `ipc_crypto_decrypt`
- `ipc_secure_send`
- `ipc_secure_recv`

No EVP implementation symbols are exposed as NACL dynamic exports.

**Finding:** Dynamic export presence establishes runtime visibility, not automatically a stable public ABI. The six NACL exports are currently **STABLE-ABI CANDIDATES**, pending contract/lifecycle/provider review.

## ELF dependencies

`DT_NEEDED`:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

SONAME:

- `libipc_crypto.so`

No RPATH/RUNPATH observed.

There is no `libcrypto.so` DT_NEEDED entry.

## Crypto provider loading

**VERIFIED:** The implementation uses `dlopen()` and `dlsym()` to obtain the crypto provider and individually resolve provider functions.

This is architecturally consistent with NACL's distinction between:

1. library loading,
2. symbol resolution,
3. capability activation.

The NACL library itself therefore does not require libcrypto as a link-time dependency.

## Lifecycle finding

**VERIFIED:** `ipc_crypto_shutdown()` closes the dynamically loaded crypto-provider handle while the cached provider function pointers remain stored.

**INFERENCE:** Provider function pointers must not be called after provider shutdown. A future implementation may need explicit lifetime ownership/reference rules, but no native implementation change is authorized during this research phase.

## Runtime compatibility question

**UNKNOWN:** The provider side requires eleven dynamically resolved symbols. Their availability and ABI compatibility across supported Android/vendor environments still need evidence.

Next investigation should establish:

- exact provider symbol set;
- Android API/vendor availability;
- whether the assumed `libcrypto.so` locations are valid on target Android releases;
- failure/degradation behavior when provider loading or symbol resolution fails;
- whether provider activation is separate from NACL library initialization.

## Resolver implication

**INFERENCE:** `libipc_crypto.so` itself is suitable for the generic module/symbol resolver model. Its external crypto provider and crypto-session lifecycle require a separate compatibility/activation layer.

## Implementation boundary

**Native implementation changes remain unauthorized.**


## Provider Compatibility Analysis — 2026-09-29

**VERIFIED:** The current implementation resolves eleven external crypto-provider symbols at runtime:
- EVP_CIPHER_CTX_new
- EVP_CIPHER_CTX_free
- EVP_aes_256_gcm
- EVP_EncryptInit_ex
- EVP_EncryptUpdate
- EVP_EncryptFinal_ex
- EVP_DecryptInit_ex
- EVP_DecryptUpdate
- EVP_DecryptFinal_ex
- EVP_CIPHER_CTX_ctrl
- RAND_bytes

**VERIFIED:** The implementation attempts provider loading in this order:
1. `libcrypto.so`
2. `/system/lib64/libcrypto.so`
3. `/system/lib/libcrypto.so`

**INFERENCE:** These paths/names are implementation assumptions, not evidence that an ordinary application on every supported Android release can access a compatible provider. The repository contains no provider compatibility matrix, bundled provider, or NACL adapter establishing that assumption.

**UNKNOWN:** Provider symbol availability and ABI compatibility across the supported Android/vendor population have not been established by repository evidence.

**VERIFIED:** Provider loading and symbol resolution failure return errors from `ipc_crypto_init()`; there is currently no explicit NACL capability-status classification in this interface for distinguishing missing provider, inaccessible provider, incompatible provider, or individual missing symbol.

**VERIFIED:** The public NACL library has no DT_NEEDED dependency on `libcrypto.so`; the provider is intentionally a runtime dependency.

**VERIFIED:** Current source contains a documentation mismatch: `docs/subsystem-crypto.md` contains a stale copied implementation with `bridge->EVP_EVP_EncryptUpdate`, while the actual current `sdk/src/ipc_crypto.c` uses `bridge->EVP_EncryptUpdate`. Repository source/build configuration outranks the stale documentation copy.

**VERIFIED:** `ipc_secure_send()` uses one `send()` call for each frame and ciphertext payload. On a stream socket, a short write is possible; the current function reports an error rather than completing the write.

**INFERENCE:** The eventual NACL crypto capability should separate:
- module loading;
- provider/backend selection and compatibility;
- provider lifetime;
- cryptographic session activation;
- socket framing/transport.

**PROPOSAL:** Treat provider compatibility as a backend/availability layer rather than making a particular Android `libcrypto.so` path part of the generic resolver contract.

**Native implementation changes remain unauthorized.**

## PHASE C Checkpoint

**PHASE C — IPC Crypto: COMPLETE.**

ELF characterization and provider/dependency compatibility review are complete to the level supported by current repository evidence.

**Next:** `adb_client`, followed by `privilege_broker`, `usb_subsystem`, `nfc_subsystem`, `nacl_location`, `power_battery`, and `nacl_storage`.

