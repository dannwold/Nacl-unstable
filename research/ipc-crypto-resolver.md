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
