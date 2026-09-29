# USB Subsystem Resolver Research — 2026-09-29

## Status

**VERIFIED:** The current ARM64 CI artifact contains `libusb_subsystem.so`. Its dynamic ABI, direct USB ioctl boundary, and activation/lifetime implications have been characterized.

## Build and artifact

- CMake target: `usb_subsystem`
- Source: `sdk/src/usb_subsystem.c`
- Header: `sdk/include/usb_subsystem.h`
- Runtime artifact: `libusb_subsystem.so`
- ARM64 artifact inspected: CI artifact ID `11046608330`, workflow run ID `36598137213`

## Dynamic ABI

**VERIFIED:** Exactly five dynamic exports:

- `usb_claim_interface`
- `usb_release_interface`
- `usb_control_transfer`
- `usb_bulk_write`
- `usb_bulk_read`

SONAME: `libusb_subsystem.so`.

No RPATH/RUNPATH was observed.

## ELF dependency boundary

**VERIFIED:** The shared library has DT_NEEDED entries only for:

- `liblog.so`
- `libm.so`
- `libdl.so`
- `libc.so`

There is no NACL-internal DT_NEEDED dependency.

## Activation boundary

**VERIFIED:** The library does not open or enumerate USB devices. `UsbDeviceContext.device_fd` is supplied by the caller and is used directly for Linux `usbdevfs` ioctls.

The implementation performs:

- `USBDEVFS_DISCONNECT` followed by `USBDEVFS_CLAIMINTERFACE` in `usb_claim_interface()`
- `USBDEVFS_RELEASEINTERFACE` in `usb_release_interface()`
- `USBDEVFS_CONTROL` for control transfers
- `USBDEVFS_BULK` for bulk reads/writes

**INFERENCE:** Loading/resolving the library is independent of USB device access. Capability activation begins only when the host supplies a valid, accessible device fd and the caller invokes the USB operations.

## Android/device security boundary

**VERIFIED:** The header explicitly describes the fd as one passed from Android `UsbDeviceConnection`.

**VERIFIED:** The native module does not request Android USB permission, enumerate Android USB devices, or construct the Java-side `UsbDeviceConnection`.

**UNKNOWN:** The repository does not establish the complete host-side permission/enumeration path or the exact Android/kernel policy for every target environment.

**INFERENCE:** USB availability is host-, permission-, device-, descriptor-, kernel-, and hardware-dependent. Native loading does not grant USB permission or bypass Android/kernel access controls.

## Public ABI observations

**VERIFIED:** The header exposes two packed structures:

- `UsbControlSetup`
- `UsbDeviceContext`

The packing directive makes their field layout part of the public ABI contract.

**VERIFIED:** `UsbDeviceContext` contains a process-local file descriptor and endpoint/interface fields. It is therefore runtime state, not a portable serialized representation.

**INFERENCE:** The eventual stable ABI should explicitly define:
1. structure packing/alignment expectations;
2. valid ranges and initialization rules;
3. fd ownership (the current code does not close the fd);
4. interface-claim ownership;
5. endpoint configuration;
6. whether a context may be reused after release;
7. error-code semantics.

## Error/lifetime observations

**VERIFIED:** `usb_release_interface()` invalidates the context's fd field by setting it to `-1`, but does not close the caller-owned fd.

**VERIFIED:** Transfer functions report `USB_ERR_TRANSFER` for ioctl failure and do not expose the underlying `errno` through their return value.

**VERIFIED:** The implementation does not allocate persistent threads, callbacks, or daemon sessions.

**INFERENCE:** The module has a comparatively simple lifetime model: the caller owns the fd, the NACL context records the fd/interface/endpoints, and interface claim/release brackets the kernel interface ownership. The fd itself must remain valid for the context's active use.

## ABI classification

All five dynamic functions are **STABLE-ABI C CANDIDATES**, subject to the public struct, fd ownership, endpoint configuration, and error-contract issues above.

Dynamic export presence alone is not treated as final ABI proof.

## Resolver implication

**INFERENCE:** `libusb_subsystem.so` fits the generic module/symbol resolver at the library boundary.

A separate USB activation/host adapter is still required to manage:

1. Android USB device discovery/selection;
2. permission acquisition;
3. `UsbDeviceConnection` lifecycle;
4. extraction/validation of the native fd;
5. interface and endpoint selection;
6. transfer/session lifetime.

Unlike the broker/sensor slices, the current USB implementation has no NACL Unix socket or daemon dependency.

## Known implementation/research concerns

**VERIFIED:** `USBDEVFS_DISCONNECT` failure is ignored before the claim attempt. This may be intentional for interfaces without a detachable kernel driver, but the current API does not expose that distinction.

**VERIFIED:** The public API collapses ioctl failures into `USB_ERR_TRANSFER` (or a generic `-1` for some invalid arguments), limiting diagnosis.

These are research findings only; native implementation has not been modified.

## Checkpoint

**PHASE C — `usb_subsystem`: COMPLETE.**

Next simple-client slice: `nfc_subsystem`.
