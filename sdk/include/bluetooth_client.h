#ifndef NATIVE_BLUETOOTH_CLIENT_H
#define NATIVE_BLUETOOTH_CLIENT_H

#include <stdint.h>
#include "bluetooth_ipc_common.h"

#ifdef __cplusplus
extern "C" {
#endif

int bt_start_le_scan(void);
int bt_stop_le_scan(void);
int bt_get_discovered_devices(BleScanResult *out_buffer,
                              uint32_t max_count,
                              uint32_t *out_count);
const char *bt_get_client_version(void);

#ifdef __cplusplus
}
#endif

#endif /* NATIVE_BLUETOOTH_CLIENT_H */
