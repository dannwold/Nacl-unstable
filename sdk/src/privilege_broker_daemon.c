#include "nacl_privilege_broker.h"

#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/un.h>
#include <unistd.h>

static int ensure_socket_dir(void) {
    if (mkdir("/data/local/tmp/sdk", 0770) == -1 && errno != EEXIST) {
        return -1;
    }
    if (mkdir(IPC_SOCKET_DIR, 0770) == -1 && errno != EEXIST) {
        return -1;
    }
    return 0;
}

static int read_full(int fd, void *buffer, size_t length) {
    uint8_t *p = (uint8_t *)buffer;
    size_t done = 0;
    while (done < length) {
        ssize_t n = read(fd, p + done, length - done);
        if (n == 0) return -1;
        if (n < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        done += (size_t)n;
    }
    return 0;
}

static int write_full(int fd, const void *buffer, size_t length) {
    const uint8_t *p = (const uint8_t *)buffer;
    size_t done = 0;
    while (done < length) {
        ssize_t n = write(fd, p + done, length - done);
        if (n < 0) {
            if (errno == EINTR) continue;
            return -1;
        }
        done += (size_t)n;
    }
    return 0;
}

static void handle_client(int fd) {
    IpcHeader request_header;
    uint8_t *payload = NULL;
    IpcHeader response_header;
    memset(&response_header, 0, sizeof(response_header));

    if (read_full(fd, &request_header, sizeof(request_header)) < 0) {
        return;
    }

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

    if (request_header.magic != IPC_MAGIC_SIGNATURE) {
        response_header.status = STATUS_ERROR;
    } else if (request_header.subsystem != SUBSYSTEM_PRIVILEGE_BROKER) {
        response_header.status = STATUS_UNSUPPORTED;
    } else if (!nacl_privilege_broker_is_uid2000()) {
        response_header.status = STATUS_PERMISSION_DENIED;
    } else if (request_header.command == NACL_BROKER_PING) {
        response_header.status = STATUS_OK;
    } else if (request_header.command == NACL_BROKER_GET_BACKEND) {
        if (request_header.payload_len != sizeof(NaclBrokerRequest)) {
            response_header.status = STATUS_ERROR;
        } else {
            const NaclBrokerRequest *request = (const NaclBrokerRequest *)payload;
            NaclBrokerResponse response;
            response.status = STATUS_OK;
            response.backend = NACL_BACKEND_UID2000;
            response.payload_len = 0;
            response_header.payload_len = sizeof(response);
            write_full(fd, &response_header, sizeof(response_header));
            write_full(fd, &response, sizeof(response));
            free(payload);
            return;
        }
    } else if (request_header.command == NACL_BROKER_DISPATCH) {
        if (request_header.payload_len != sizeof(NaclBrokerRequest)) {
            response_header.status = STATUS_ERROR;
        } else {
            const NaclBrokerRequest *request = (const NaclBrokerRequest *)payload;
            if (request->protocol_version != NACL_PRIVILEGE_BROKER_PROTOCOL_VERSION ||
                !nacl_privilege_capability_supported((NaclCapability)request->capability)) {
                response_header.status = STATUS_UNSUPPORTED;
            } else if (request->backend != NACL_BACKEND_UID2000) {
                response_header.status = STATUS_ERROR;
            } else {
                /*
                 * The transport and capability-specific implementations are
                 * deliberately separate from the broker identity check.
                 * This prevents arbitrary shell execution from becoming the
                 * public capability API.
                 */
                response_header.status = STATUS_UNSUPPORTED;
            }
        }
    } else {
        response_header.status = STATUS_UNSUPPORTED;
    }

    write_full(fd, &response_header, sizeof(response_header));
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
