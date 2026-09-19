import { DocArticle } from '../types';

export const DOC_ARTICLES: DocArticle[] = [
  {
    id: 'readme',
    title: '🏆 Master Developer Bible',
    filename: 'docs/README.md',
    category: 'Overview',
    content: `# 🏆 The Android Native Capability Library (NACL): Master Developer Bible

## Introduction: The NACL Philosophy
The **Android Native Capability Library (NACL)** is a state-of-the-art modular library framework that interfaces directly with physical hardware, system properties, IPC channels, and graphics composition queues on Android at bare-metal speeds. By shifting critical execution branches from the Java Virtual Machine (JVM) down to the native C/C++ runtime layer (Bionic/AOSP), NACL bypasses JVM runtime lags, runtime memory stalls, and garbage collection freezes.

### Key Architectural Pillars
- **Direct Hardware & Baseband Interop**: Interfacing directly with baseband modems, Linux \`usbfs\`, \`ashmem\`/\`memfd\` rings, and audio streams.
- **Project Treble Dynamic Linker Relocation**: Systematic bypass of AOSP dynamic linker namespace policies by dynamically copying precompiled \`.so\` modules into app-private execution sandboxes.
- **Embedded QuickJS Engine**: Exposing high-performance C-native hardware APIs to Javascript runtime environments with near-zero latency.
- **AES-256-GCM Hardware Crypto**: Hardware-backed KeyStore isolation (StrongBox / TEE) for zero-trust inter-process communication.
`
  },
  {
    id: 'directory-map',
    title: '📂 Master Workspace Directory Map',
    filename: 'docs/directory-map.md',
    category: 'Architecture',
    content: `# Master Workspace Directory Map
Below is the flat workspace map showing how all files are organized into nested directories:

\`\`\`
[nacl-repository]/
├── .github/workflows/ndk-build.yml       # Automates ARM64 & x86_64 cloud builds
├── host_app/app/                          # Android Host Application
│   ├── build.gradle                       # Host app build configuration
│   └── src/main/java/com/your/app/        # Kotlin & Java UI / JNI Bridges
│       ├── bootstrap/
│       │   ├── HostAppBootstrapper.java   # Key storage & Treble relocator
│       │   └── MainActivity.java          # Android launcher and diagnostic hub
│       ├── AudioWaveformWidget.kt         # Compose UI Audio wave visualizer
│       ├── CellTowerMetricDecoder.kt      # Cellular signal diagnostic interpreter
│       ├── NaclAudioBridge.kt             # Native-to-Kotlin audio routing bridge
│       ├── NaclBridge.kt                  # Global native reactive flow JNI gate
│       ├── NaclOverlayService.kt          # Vulkan overlay dynamic render service
│       ├── NaclUsbBridge.kt               # USB direct data interop hook
│       └── SignalGaugeWidget.kt           # Compose UI Cellular metric UI gauge
└── sdk/                                   # Native C SDK Subsystems
    ├── CMakeLists.txt                     # Master multi-ABI dynamic compilation scheme
    ├── include/                           # Public & central subsystem C headers
    └── src/                               # Core C dynamic implementations & QuickJS bindings
\`\`\`
`
  },
  {
    id: 'unified-api',
    title: '⚡ Public C API Catalog (nacl_unified_api.h)',
    filename: 'docs/unified-api.md',
    category: 'API Catalog',
    content: `# Public C API Catalog (nacl_unified_api.h)

Below is the function-by-function reference of the exported public native API interface. Every external framework (such as JNI, Dart FFI, or direct C/C++ clients) interacts exclusively via this stable binary interface.

| Function Prototype | Parameter List | Return Value | Functional Description |
| :--- | :--- | :--- | :--- |
| \`nacl_init\` | \`const char* secure_lib_path\` | \`int32_t\` (0 = Success) | Dynamically indexes and resolves all secondary modules (\`.so\`) in the relocations directory. |
| \`nacl_register_callback\` | \`uint32_t module_id, void (*cb)(const NaclEventFrame*)\` | \`int32_t\` (0 = Registered) | Binds a raw C-style callback function to receive telemetry packets from the target hardware loop. |
| \`nacl_dispatch_event\` | \`const NaclEventFrame* frame\` | \`int32_t\` (0 = Success) | Dispatches a command payload down the active modular router to change hardware telemetry states. |
| \`nacl_shutdown\` | *None* | \`int32_t\` (0 = Terminated) | Unmaps and closes all open shared memory maps, socket channels, and background worker loops safely. |
`
  },
  {
    id: 'subsystem-adb',
    title: '📶 Wireless ADB & Loopback Client',
    filename: 'docs/subsystem-adb.md',
    category: 'Subsystems',
    content: `# Subsystem 8: ADB Privilege Escalation & Loopback Client

An automated cryptographic ADB client performing RSA handshakes over loopback, gaining stable access to UID 2000 diagnostic privileges without root exploit instabilities.

### Key Capabilities
- **Loopback Discovery**: Discovers local mDNS/NSD service descriptors (\`_adb-tls-connect._tcp.\`).
- **6-Digit Pairing**: Authenticates via TLS pairing handshake and local RSA keys.
- **Shell Channel Multiplexing**: Open zero-copy binary shell streams directly into Android \`adbd\`.
`
  },
  {
    id: 'subsystem-crypto',
    title: '🔐 Hardware IPC Cryptography & KeyStore',
    filename: 'docs/subsystem-crypto.md',
    category: 'Subsystems',
    content: `# Hardware IPC Cryptography & KeyStore Vault

Secures inter-process communication using hardware-isolated keys in Android's TEE / StrongBox.

### Technical Highlights
- **AES-256-GCM**: Hardware-backed AES keys generated inside TEE.
- **Non-Exportable Secret Key**: Keys never touch standard RAM in unencrypted state.
- **Frame Validation**: Automatic HMAC & GCM tag verification on every IPC frame.
`
  },
  {
    id: 'linking-journey',
    title: '🔗 Project Treble Relocation Guide',
    filename: 'docs/linking-journey.md',
    category: 'Deep Dives',
    content: `# Project Treble Dynamic Linker Relocation Guide

In Android 8.0+ (Project Treble), dynamic linker namespace isolation prevents untrusted apps from direct \`dlopen\` access to vendor dynamic libraries.

### NACL Solution
1. Pack precompiled binary shared libraries (\`.so\`) inside application assets.
2. At boot time, \`HostAppBootstrapper\` copies these binary files into the app's secure executable directory (\`/data/data/<package>/files/lib/\`).
3. Explicitly set \`r-xr-xr-x\` execution permissions via \`chmod\`.
4. Boot the embedded QuickJS and C runtime contexts targeting the relocated path.
`
  }
];
