#include "nacl_privilege_broker.h"
#include "bluetooth_client.h"

#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/un.h>
#include <unistd.h>

static int ensure_socket_dir(void) {
    if (mkdir("/data/local/tmp/sdk", 0770) == -1 && errno != EEXIST) return -1;
    if (mkdir(IPC_SOCKET_DIR, 0770) == -1 && errno != EEXIST) return -1;
    return 0;
}

static int read_full(int fd, void *buffer, size_t length) {
    uint8_t *p = (uint8_t *)buffer;
    size_t done = 0;
    while (done < length) {
        ssize_t n = read(fd, p + done, length - done);
        if (n == 0) return -1;
        if (n < 0) { if (errno == EINTR) continue; return -1; }
        done += (size_t)n;
    }
    return 0;
}

static int write_full(int fd, const void *buffer, size_t length) {
    const uint8_t *p = (const uint8_t *)buffer;
    size_t done = 0;
    while (done < length) {
        ssize_t n = write(fd, p + done, length - done);
        if (n < 0) { if (errno == EINTR) continue; return -1; }
        if (n == 0) return -1;
        done += (size_t)n;
    }
    return 0;
}

/* Forward a fixed Wi-Fi capability operation to the existing Wi-Fi service. */
static int wifi_dispatch(uint32_t command, void *out, uint32_t *out_len) {
    uint16_t ipc_command;
    switch (command) {
        case NACL_WIFI_SCAN_START:
            ipc_command = CMD_WIFI_START_SCAN;
            break;
        case NACL_WIFI_SCAN_GET:
            ipc_command = CMD_WIFI_GET_RESULTS;
            break;
        default:
            return STATUS_UNSUPPORTED;
    }

    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return STATUS_ERROR;

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, IPC_SOCKET_WIFI, sizeof(addr.sun_path) - 1);

    if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        close(fd);
        return STATUS_ERROR;
    }

    IpcHeader req;
    memset(&req, 0, sizeof(req));
    req.magic = IPC_MAGIC_SIGNATURE;
    req.transaction_id = 1;
    req.subsystem = SUBSYSTEM_WIFI;
    req.command = ipc_command;
    req.status = STATUS_OK;
    req.payload_len = 0;

    if (write_full(fd, &req, sizeof(req)) < 0) {
        close(fd);
        return STATUS_ERROR;
    }

    IpcHeader resp;
    if (read_full(fd, &resp, sizeof(resp)) < 0 ||
        resp.payload_len > NACL_PRIVILEGE_BROKER_MAX_PAYLOAD) {
        close(fd);
        return STATUS_ERROR;
    }

    if (resp.payload_len > 0) {
        if (!out || !out_len || *out_len < resp.payload_len) {
            uint8_t discard[256];
            uint32_t remaining = resp.payload_len;
            while (remaining > 0) {
                uint32_t chunk = remaining < sizeof(discard) ? remaining : sizeof(discard);
                if (read_full(fd, discard, chunk) < 0) break;
                remaining -= chunk;
            }
            close(fd);
            return STATUS_ERROR;
        }
        *out_len = resp.payload_len;
        if (read_full(fd, out, resp.payload_len) < 0) {
            close(fd);
            return STATUS_ERROR;
        }
    } else if (out_len) {
        *out_len = 0;
    }

    int status = resp.status;
    close(fd);
    return status;
}

static int bt_dispatch(uint32_t command, void *out, uint32_t *out_len) {
    if (command == NACL_BT_SCAN_START) {
        return bt_start_le_scan();
    }
    if (command == NACL_BT_SCAN_STOP) {
        return bt_stop_le_scan();
    }
    if (command == NACL_BT_SCAN_GET) {
        if (!out || !out_len) return STATUS_ERROR;
        uint32_t capacity = *out_len / sizeof(BleScanResult);
        if (capacity == 0) return STATUS_ERROR;

        uint32_t count = 0;
        int rc = bt_get_discovered_devices((BleScanResult *)out, capacity, &count);
        if (rc == 0) {
            *out_len = count * sizeof(BleScanResult);
        }
        return rc;
    }
    return STATUS_UNSUPPORTED;
}

static int dispatch_capability(const NaclBrokerRequest *request,
                               const uint8_t *data, uint32_t data_len,
                               void *out, uint32_t *out_len) {
    (void)data;
    if (data_len != 0) return STATUS_UNSUPPORTED;
    if (!request || !out_len) return STATUS_ERROR;

    switch ((NaclCapability)request->capability) {
        case NACL_CAP_BT_SCAN:
            return bt_dispatch(request->command, out, out_len);
        case NACL_CAP_WIFI_SCAN:
            return wifi_dispatch(request->command, out, out_len);
        default:
            return STATUS_UNSUPPORTED;
    }
}

static void handle_client(int fd) {
    IpcHeader request_header;
    uint8_t *payload = NULL;
    IpcHeader response_header;
    memset(&response_header, 0, sizeof(response_header));

    if (read_full(fd, &request_header, sizeof(request_header)) < 0) return;

    if (request_header.payload_len > NACL_PRIVILEGE_BROKER_MAX_PAYLOAD) {
        response_header = request_header;
        response_header.status = STATUS_ERROR;
        response_header.payload_len = 0;
        write_full(fd, &response_header, sizeof(response_header));
        return;
    }

    if (request_header.payload_len > 0) {
        payload = (uint8_t *)malloc(request_header.payload_len);
        if (!payload || read_full(fd, payload, request_header.payload_len) < 0) {
            free(payload);
            return;
        }
    }

    response_header = request_header;
    response_header.status = STATUS_OK;
    response_header.payload_len = 0;

    uint8_t *response_payload = NULL;
    uint32_t response_len = 0;

    if (request_header.magic != IPC_MAGIC_SIGNATURE) {
        response_header.status = STATUS_ERROR;
    } else if (request_header.subsystem != SUBSYSTEM_PRIVILEGE_BROKER) {
        response_header.status = STATUS_UNSUPPORTED;
    } else if (!nacl_privilege_broker_is_uid2000()) {
        response_header.status = STATUS_PERMISSION_DENIED;
    } else if (request_header.command == NACL_BROKER_PING) {
        response_header.status = STATUS_OK;
    } else if (request_header.command == NACL_BROKER_GET_BACKEND) {
        if (request_header.payload_len != 0) {
            response_header.status = STATUS_ERROR;
        } else {
            NaclBrokerResponse response;
            memset(&response, 0, sizeof(response));
            response.status = STATUS_OK;
            response.backend = NACL_BACKEND_UID2000;
            response_header.payload_len = sizeof(response);
            write_full(fd, &response_header, sizeof(response_header));
            write_full(fd, &response, sizeof(response));
            free(payload);
            return;
        }
    } else if (request_header.command == NACL_BROKER_DISPATCH) {
        if (request_header.payload_len < sizeof(NaclBrokerRequest) + sizeof(uint32_t)) {
            response_header.status = STATUS_ERROR;
        } else {
            const NaclBrokerRequest *request = (const NaclBrokerRequest *)payload;
            uint32_t data_len = 0;
            memcpy(&data_len, payload + sizeof(*request), sizeof(data_len));

            if (request->protocol_version != NACL_PRIVILEGE_BROKER_PROTOCOL_VERSION ||
                !nacl_privilege_capability_supported((NaclCapability)request->capability) ||
                request->backend != NACL_BACKEND_UID2000 ||
                data_len != request_header.payload_len - sizeof(*request) - sizeof(data_len)) {
                response_header.status = STATUS_UNSUPPORTED;
            } else {
                /*
                 * Allocate the maximum bounded response. Capability handlers
                 * write only structured binary data; they never execute a
                 * caller-supplied command string.
                 */
                response_payload = (uint8_t *)malloc(NACL_PRIVILEGE_BROKER_MAX_PAYLOAD);
                if (!response_payload) {
                    response_header.status = STATUS_ERROR;
                } else {
                    response_len = NACL_PRIVILEGE_BROKER_MAX_PAYLOAD;
                    response_header.status = dispatch_capability(
                        request,
                        payload + sizeof(*request) + sizeof(data_len),
                        data_len,
                        response_payload,
                        &response_len);
                    if (response_header.status == STATUS_OK) {
                        response_header.payload_len = response_len;
                    } else {
                        free(response_payload);
                        response_payload = NULL;
                        response_len = 0;
                    }
                }
            }
        }
    } else {
        response_header.status = STATUS_UNSUPPORTED;
    }

    write_full(fd, &response_header, sizeof(response_header));
    if (response_payload && response_header.payload_len > 0)
        write_full(fd, response_payload, response_header.payload_len);

    free(response_payload);
    free(payload);
}

int main(void) {
    if (!nacl_privilege_broker_is_uid2000()) {
        fprintf(stderr, "[PrivilegeBroker] refusing to start: effective UID is %d, expected 2000\n", (int)geteuid());
        return EXIT_FAILURE;
    }

    if (ensure_socket_dir() < 0) {
        perror("[PrivilegeBroker] socket directory");
        return EXIT_FAILURE;
    }

    unlink(NACL_PRIVILEGE_BROKER_SOCKET);

    int server_fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (server_fd < 0) {
        perror("[PrivilegeBroker] socket");
        return EXIT_FAILURE;
    }

    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, NACL_PRIVILEGE_BROKER_SOCKET, sizeof(addr.sun_path) - 1);

    if (bind(server_fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        perror("[PrivilegeBroker] bind");
        close(server_fd);
        return EXIT_FAILURE;
    }

    chmod(NACL_PRIVILEGE_BROKER_SOCKET, 0660);

    if (listen(server_fd, 16) < 0) {
        perror("[PrivilegeBroker] listen");
        close(server_fd);
        unlink(NACL_PRIVILEGE_BROKER_SOCKET);
        return EXIT_FAILURE;
    }

    printf("[PrivilegeBroker] running as UID %d on %s\n",
           (int)geteuid(), NACL_PRIVILEGE_BROKER_SOCKET);

    for (;;) {
        int client_fd = accept(server_fd, NULL, NULL);
        if (client_fd < 0) {
            if (errno == EINTR) continue;
            perror("[PrivilegeBroker] accept");
            break;
        }
        handle_client(client_fd);
        close(client_fd);
    }

    close(server_fd);
    unlink(NACL_PRIVILEGE_BROKER_SOCKET);
    return EXIT_FAILURE;
}
