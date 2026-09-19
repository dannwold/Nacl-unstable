import { Subsystem } from '../types';

export const NACL_SUBSYSTEMS: Subsystem[] = [
  {
    id: 'telephony',
    name: 'Cellular Telephony & Modem Diagnostic',
    category: 'telephony',
    headerFile: 'sdk/include/telephony_common.h',
    sourceFile: 'sdk/src/telephony_client.c',
    description: 'Interfaces with Baseband Modems, decoding RSRP, RSRQ, RSSNR, PCI and cell tower metrics at Bionic speeds.',
    status: 'active',
    functions: [
      'telephony_init()',
      'telephony_get_cell_tower_metrics()',
      'telephony_register_carrier_listener()',
      'telephony_decode_rsrp_vector()'
    ],
    notes: 'Bypasses Android TelephonyManager IPC delay.'
  },
  {
    id: 'audio',
    name: 'Native Audio Waveform Engine',
    category: 'hardware',
    headerFile: 'sdk/include/audio.h',
    sourceFile: 'sdk/src/audio.c',
    description: 'AAudio / OpenSL ES native audio stream processor with Direct ByteBuffer envelope downsampling for Compose UI widgets.',
    status: 'active',
    functions: [
      'audio_stream_init()',
      'audio_compute_waveform_frame()',
      'audio_register_direct_buffer()',
      'audio_stop_stream()'
    ]
  },
  {
    id: 'adb',
    name: 'Wireless ADB Bridge & NSD',
    category: 'automation',
    headerFile: 'sdk/include/adb_client.h',
    sourceFile: 'sdk/src/adb_client.c',
    description: 'Local loopback mDNS/NSD port discovery & 6-digit TLS pairing handshake for UID 2000 shell execution.',
    status: 'active',
    functions: [
      'adb_client_init()',
      'adb_discover_nsd_ports()',
      'adb_authenticate_tls_pairing()',
      'adb_exec_shell_command()'
    ]
  },
  {
    id: 'crypto',
    name: 'IPC Hardware Crypto & KeyStore Vault',
    category: 'ipc',
    headerFile: 'sdk/include/ipc_crypto.h',
    sourceFile: 'sdk/src/ipc_crypto.c',
    description: 'StrongBox / TEE AES-256-GCM hardware key integration and secure payload frame cipher for inter-process communication.',
    status: 'active',
    functions: [
      'nacl_crypto_init_keystore()',
      'nacl_crypto_encrypt_payload()',
      'nacl_crypto_decrypt_payload()',
      'nacl_crypto_verify_hmac()'
    ]
  },
  {
    id: 'quickjs',
    name: 'QuickJS Engine & C-Bindings',
    category: 'core',
    headerFile: 'sdk/include/quickjs.h',
    sourceFile: 'sdk/src/quickjs_core_binding.c',
    description: 'Embedded lightweight JavaScript engine binding C-native APIs into reactive dynamic scripts.',
    status: 'active',
    functions: [
      'JS_NewRuntime()',
      'JS_NewContext()',
      'nacl_quickjs_bind_subsystems()',
      'JS_Eval()'
    ]
  },
  {
    id: 'shm',
    name: 'Shared Memory Ring Buffer (ashmem/memfd)',
    category: 'ipc',
    headerFile: 'sdk/include/shm_ring_buffer.h',
    sourceFile: 'sdk/src/shm_client.c',
    description: 'Zero-copy lockless circular buffer implementation across Android process boundaries using Linux memfd_create.',
    status: 'active',
    functions: [
      'shm_ring_buffer_create()',
      'shm_ring_buffer_push()',
      'shm_ring_buffer_pop()',
      'shm_ring_buffer_destroy()'
    ]
  },
  {
    id: 'sensors',
    name: 'Sensors Daemon & IPC Stream',
    category: 'hardware',
    headerFile: 'sdk/include/sensor_ipc_common.h',
    sourceFile: 'sdk/src/sensors_client.c',
    description: 'Direct NDK Sensor Manager listener for high-frequency accelerometer, gyroscope and magnetometer telemetry.',
    status: 'active',
    functions: [
      'sensors_client_connect()',
      'sensors_read_accelerometer()',
      'sensors_set_sample_rate()'
    ]
  },
  {
    id: 'vulkan',
    name: 'Vulkan Graphic Overlay Renderer',
    category: 'graphics',
    headerFile: 'sdk/include/vulkan_renderer.h',
    sourceFile: 'sdk/src/vulkan_renderer.c',
    description: 'Hardware-accelerated Vulkan overlay layer for low-latency diagnostic overlays over system windows.',
    status: 'active',
    functions: [
      'vulkan_renderer_init()',
      'vulkan_render_overlay_frame()',
      'vulkan_destroy_surface()'
    ]
  },
  {
    id: 'bluetooth',
    name: 'Bluetooth LE IPC Controller',
    category: 'hardware',
    headerFile: 'sdk/include/bluetooth_ipc_common.h',
    sourceFile: 'sdk/src/libbluetooth_client.c',
    description: 'Direct HCI / BlueDroid socket controller for BLE advertisement scanning and peripheral bonding.',
    status: 'active',
    functions: [
      'bluetooth_client_init()',
      'bluetooth_start_ble_scan()',
      'bluetooth_connect_gatt()'
    ]
  },
  {
    id: 'usb',
    name: 'USB Host Direct Interop',
    category: 'hardware',
    headerFile: 'sdk/include/usb_subsystem.h',
    sourceFile: 'sdk/src/usb_subsystem.c',
    description: 'Linux usbfs file-descriptor passthrough for raw USB bulk transfer communication without root.',
    status: 'active',
    functions: [
      'usb_subsystem_init()',
      'usb_claim_interface()',
      'usb_bulk_transfer()'
    ]
  },
  {
    id: 'nfc',
    name: 'NFC Subsystem Driver',
    category: 'hardware',
    headerFile: 'sdk/include/nfc_subsystem.h',
    sourceFile: 'sdk/src/nfc_subsystem.c',
    description: 'Near-Field Communication NCI reader and ISO-DEP APDU exchange bridge.',
    status: 'active',
    functions: [
      'nfc_subsystem_init()',
      'nfc_transceive_apdu()',
      'nfc_stop_poll()'
    ]
  },
  {
    id: 'power',
    name: 'Power & Battery Manager',
    category: 'hardware',
    headerFile: 'sdk/include/power_battery.h',
    sourceFile: 'sdk/src/power_battery.c',
    description: 'Sysfs power_supply reader for battery voltage, current draw (uA), temperature and charge cycle diagnostics.',
    status: 'active',
    functions: [
      'power_battery_get_metrics()',
      'power_battery_read_sysfs()'
    ]
  }
];
