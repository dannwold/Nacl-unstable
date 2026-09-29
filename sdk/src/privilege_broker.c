#include "nacl_privilege_broker.h"

#include <unistd.h>
#include <stdlib.h>

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

#include <errno.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/un.h>

static int broker_connect(void) {
    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return STATUS_ERROR;

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, NACL_PRIVILEGE_BROKER_SOCKET, sizeof(addr.sun_path) - 1);

    if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        close(fd);
        return STATUS_ERROR;
    }
    return fd;
}

static int broker_write_full(int fd, const void *buffer, size_t length) {
    const uint8_t *p = (const uint8_t *)buffer;
    size_t done = 0;
    while (done < length) {
        ssize_t n = write(fd, p + done, length - done);
        if (n < 0) {
            if (errno == EINTR) continue;
            return STATUS_ERROR;
        }
        if (n == 0) return STATUS_ERROR;
        done += (size_t)n;
    }
    return STATUS_OK;
}

static int broker_read_full(int fd, void *buffer, size_t length) {
    uint8_t *p = (uint8_t *)buffer;
    size_t done = 0;
    while (done < length) {
        ssize_t n = read(fd, p + done, length - done);
        if (n < 0) {
            if (errno == EINTR) continue;
            return STATUS_ERROR;
        }
        if (n == 0) return STATUS_ERROR;
        done += (size_t)n;
    }
    return STATUS_OK;
}

static int broker_request(uint16_t command,
                          const void *payload,
                          uint32_t payload_len,
                          void *response,
                          uint32_t *response_len) {
    if (payload_len > NACL_PRIVILEGE_BROKER_MAX_PAYLOAD) return STATUS_ERROR;

    int fd = broker_connect();
    if (fd < 0) return fd;

    IpcHeader request;
    memset(&request, 0, sizeof(request));
    request.magic = IPC_MAGIC_SIGNATURE;
    request.transaction_id = 1;
    request.subsystem = SUBSYSTEM_PRIVILEGE_BROKER;
    request.command = command;
    request.status = STATUS_OK;
    request.payload_len = payload_len;

    int rc = broker_write_full(fd, &request, sizeof(request));
    if (rc == STATUS_OK && payload_len > 0)
        rc = broker_write_full(fd, payload, payload_len);

    IpcHeader reply;
    if (rc == STATUS_OK)
        rc = broker_read_full(fd, &reply, sizeof(reply));

    if (rc == STATUS_OK && reply.payload_len > NACL_PRIVILEGE_BROKER_MAX_PAYLOAD)
        rc = STATUS_ERROR;

    if (rc == STATUS_OK && reply.payload_len > 0) {
        if (!response || !response_len || *response_len < reply.payload_len) {
            uint8_t discard[256];
            uint32_t remaining = reply.payload_len;
            while (remaining > 0) {
                uint32_t chunk = remaining < sizeof(discard) ? remaining : sizeof(discard);
                if (broker_read_full(fd, discard, chunk) != STATUS_OK) break;
                remaining -= chunk;
            }
            rc = STATUS_ERROR;
        } else {
            *response_len = reply.payload_len;
            rc = broker_read_full(fd, response, reply.payload_len);
        }
    } else if (response_len) {
        *response_len = 0;
    }

    close(fd);
    if (rc != STATUS_OK) return rc;
    return reply.status;
}

int nacl_privilege_broker_ping(void) {
    return broker_request(NACL_BROKER_PING, NULL, 0, NULL, NULL);
}

int nacl_privilege_broker_get_backend(NaclPrivilegeBackend *backend) {
    if (!backend) return STATUS_ERROR;

    NaclBrokerRequest request;
    memset(&request, 0, sizeof(request));
    request.protocol_version = NACL_PRIVILEGE_BROKER_PROTOCOL_VERSION;

    NaclBrokerResponse response;
    uint32_t response_len = sizeof(response);
    int rc = broker_request(NACL_BROKER_GET_BACKEND,
                            &request, sizeof(request),
                            &response, &response_len);
    if (rc == STATUS_OK && response_len == sizeof(response))
        *backend = (NaclPrivilegeBackend)response.backend;
    return rc;
}

int nacl_privilege_broker_dispatch(NaclCapability capability,
                                   NaclPrivilegeBackend backend,
                                   uint32_t command,
                                   const void *payload,
                                   uint32_t payload_len,
                                   void *response,
                                   uint32_t *response_len) {
    NaclBrokerRequest request;
    memset(&request, 0, sizeof(request));
    request.protocol_version = NACL_PRIVILEGE_BROKER_PROTOCOL_VERSION;
    request.capability = (uint32_t)capability;
    request.backend = (uint32_t)backend;
    request.command = command;

    if (payload_len > NACL_PRIVILEGE_BROKER_MAX_PAYLOAD - sizeof(request) - sizeof(uint32_t)) {
        return STATUS_ERROR;
    }

    /*
     * The envelope carries a fixed capability request followed by
     * capability-specific binary data. The broker never accepts shell text
     * or an executable command string from the caller.
     */
    uint32_t envelope_len = (uint32_t)sizeof(request) + sizeof(uint32_t) + payload_len;
    uint8_t *envelope = (uint8_t *)malloc(envelope_len);
    if (!envelope) return STATUS_ERROR;

    memcpy(envelope, &request, sizeof(request));
    memcpy(envelope + sizeof(request), &payload_len, sizeof(payload_len));
    if (payload_len > 0 && payload) {
        memcpy(envelope + sizeof(request) + sizeof(payload_len), payload, payload_len);
    } else if (payload_len > 0) {
        free(envelope);
        return STATUS_ERROR;
    }

    int rc = broker_request(NACL_BROKER_DISPATCH,
                            envelope, envelope_len,
                            response, response_len);
    free(envelope);
    return rc;
}
