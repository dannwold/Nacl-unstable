#ifndef NACL_PRIVILEGE_BROKER_H
#define NACL_PRIVILEGE_BROKER_H

#include <stdint.h>
#include "ipc_common.h"

#ifdef __cplusplus
extern "C" {
#endif

#define NACL_PRIVILEGE_BROKER_SOCKET "/data/local/tmp/sdk/sockets/privilege.sock"
#define NACL_PRIVILEGE_BROKER_PROTOCOL_VERSION 1u
#define NACL_PRIVILEGE_BROKER_MAX_PAYLOAD 65536u

typedef enum {
    NACL_BACKEND_DIRECT = 0,
    NACL_BACKEND_UID2000 = 1,
    NACL_BACKEND_SHIZUKU = 2,
    NACL_BACKEND_ADB = 3
} NaclPrivilegeBackend;

typedef enum {
    NACL_CAP_WIFI_SCAN = 0x1001,
    NACL_CAP_WIFI_STATE = 0x1002,
    NACL_CAP_BT_SCAN = 0x1101,
    NACL_CAP_BT_STATE = 0x1102,
    NACL_CAP_BT_PAIR = 0x1103,
    NACL_CAP_LOCATION = 0x1201,
    NACL_CAP_SENSOR_READ = 0x1301,
    NACL_CAP_BATTERY_READ = 0x1401,
    NACL_CAP_SYSTEM_PROPERTY_READ = 0x1501
} NaclCapability;

typedef enum {
    NACL_BROKER_PING = 0x0001,
    NACL_BROKER_GET_BACKEND = 0x0002,
    NACL_BROKER_DISPATCH = 0x0003
} NaclBrokerCommand;

typedef struct {
    uint32_t protocol_version;
    uint32_t capability;
    uint32_t backend;
    uint32_t command;
} NaclBrokerRequest;

typedef struct {
    int32_t status;
    uint32_t backend;
    uint32_t payload_len;
} NaclBrokerResponse;

int nacl_privilege_backend_available(NaclPrivilegeBackend backend);
int nacl_privilege_capability_supported(NaclCapability capability);
const char *nacl_privilege_backend_name(NaclPrivilegeBackend backend);
const char *nacl_privilege_capability_name(NaclCapability capability);
int nacl_privilege_broker_is_uid2000(void);

#ifdef __cplusplus
}
#endif

#endif
