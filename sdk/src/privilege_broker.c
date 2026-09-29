#include "nacl_privilege_broker.h"

#include <unistd.h>

const char *nacl_privilege_backend_name(NaclPrivilegeBackend backend) {
    switch (backend) {
        case NACL_BACKEND_DIRECT: return "direct";
        case NACL_BACKEND_UID2000: return "uid2000";
        case NACL_BACKEND_SHIZUKU: return "shizuku";
        case NACL_BACKEND_ADB: return "adb";
        default: return "unknown";
    }
}

const char *nacl_privilege_capability_name(NaclCapability capability) {
    switch (capability) {
        case NACL_CAP_WIFI_SCAN: return "wifi_scan";
        case NACL_CAP_WIFI_STATE: return "wifi_state";
        case NACL_CAP_BT_SCAN: return "bt_scan";
        case NACL_CAP_BT_STATE: return "bt_state";
        case NACL_CAP_BT_PAIR: return "bt_pair";
        case NACL_CAP_LOCATION: return "location";
        case NACL_CAP_SENSOR_READ: return "sensor_read";
        case NACL_CAP_BATTERY_READ: return "battery_read";
        case NACL_CAP_SYSTEM_PROPERTY_READ: return "system_property_read";
        default: return "unknown";
    }
}

int nacl_privilege_backend_available(NaclPrivilegeBackend backend) {
    switch (backend) {
        case NACL_BACKEND_DIRECT:
            return 1;
        case NACL_BACKEND_UID2000:
        case NACL_BACKEND_SHIZUKU:
        case NACL_BACKEND_ADB:
            return 0;
        default:
            return 0;
    }
}

int nacl_privilege_capability_supported(NaclCapability capability) {
    switch (capability) {
        case NACL_CAP_WIFI_SCAN:
        case NACL_CAP_WIFI_STATE:
        case NACL_CAP_BT_SCAN:
        case NACL_CAP_BT_STATE:
        case NACL_CAP_BT_PAIR:
        case NACL_CAP_LOCATION:
        case NACL_CAP_SENSOR_READ:
        case NACL_CAP_BATTERY_READ:
        case NACL_CAP_SYSTEM_PROPERTY_READ:
            return 1;
        default:
            return 0;
    }
}

int nacl_privilege_broker_is_uid2000(void) {
    return geteuid() == 2000;
}
