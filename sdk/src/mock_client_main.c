#include "quickjs.h"
#include "routing_core.h"

#include <string.h>

static JSValue js_wifi_scan(JSContext *ctx, JSValueConst this_val, int argc, JSValueConst *argv) {
    uint8_t buf[1024];
    uint32_t len = sizeof(buf);

    int res = dispatch_hardware_command("bluetooth_scan", NULL, 0, buf, &len);

    if (res != 0) {
        return JS_ThrowInternalError(ctx, "Wi-Fi scan request rejected by daemon");
    }

    return JS_NewStringLen(ctx, (char *)buf, len);
}

static const JSCFunctionListEntry js_wifi_funcs[] = {
    JS_CFUNC_DEF("scan", 0, js_wifi_scan),
};

static int js_wifi_init(JSContext *ctx, JSModuleDef *m) {
    return JS_SetModuleExportList(ctx, m, js_wifi_funcs,
        sizeof(js_wifi_funcs) / sizeof(js_wifi_funcs[0]));
}

JSModuleDef *js_init_module_wifi(JSContext *ctx, const char *module_name) {
    JSModuleDef *m = JS_NewCModule(ctx, module_name, js_wifi_init);

    if (!m) return NULL;

    JS_AddModuleExportList(ctx, m, js_wifi_funcs,
        sizeof(js_wifi_funcs) / sizeof(js_wifi_funcs[0]));

    return m;
}
