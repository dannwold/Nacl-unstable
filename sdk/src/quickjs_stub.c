#include "quickjs.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>

#define WEAK_STUB __attribute__((weak))

WEAK_STUB void JS_FreeValue(JSContext *ctx, JSValue v) { (void)ctx; (void)v; }
WEAK_STUB void JS_FreeCString(JSContext *ctx, const char *ptr) { (void)ctx; (void)ptr; }

WEAK_STUB const char *JS_ToCString(JSContext *ctx, JSValueConst val) { (void)ctx; (void)val; return ""; }
WEAK_STUB const char *JS_ToCStringLen(JSContext *ctx, size_t *plen, JSValueConst val1) {
    (void)ctx; (void)val1;
    if (plen) *plen = 0;
    return "";
}

WEAK_STUB int JS_ToInt32(JSContext *ctx, int32_t *pres, JSValueConst val) {
    (void)ctx; (void)val;
    if (pres) *pres = 0;
    return 0;
}

WEAK_STUB int JS_ToUint64(JSContext *ctx, uint64_t *pres, JSValueConst val) {
    (void)ctx; (void)val;
    if (pres) *pres = 0;
    return 0;
}

WEAK_STUB JSValue JS_NewString(JSContext *ctx, const char *str) { (void)ctx; (void)str; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewStringLen(JSContext *ctx, const char *str1, size_t len1) { (void)ctx; (void)str1; (void)len1; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewInt32(JSContext *ctx, int32_t val) { (void)ctx; (void)val; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewInt64(JSContext *ctx, int64_t val) { (void)ctx; (void)val; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewBigInt64(JSContext *ctx, int64_t val) { (void)ctx; (void)val; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewFloat64(JSContext *ctx, double d) { (void)ctx; (void)d; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewBool(JSContext *ctx, int val) { (void)ctx; (void)val; return JS_UNDEFINED; }

WEAK_STUB JSValue JS_NewObject(JSContext *ctx) { (void)ctx; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewObjectClass(JSContext *ctx, JSClassID class_id) { (void)ctx; (void)class_id; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewArray(JSContext *ctx) { (void)ctx; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_NewArrayBuffer(JSContext *ctx, uint8_t *buf, size_t size, void (*free_func)(JSRuntime *rt, void *opaque, void *ptr), void *opaque, int is_shared) {
    (void)ctx; (void)buf; (void)size; (void)free_func; (void)opaque; (void)is_shared;
    return JS_UNDEFINED;
}
WEAK_STUB uint8_t *JS_GetArrayBuffer(JSContext *ctx, size_t *pbyte_offset, size_t *pbyte_length, JSValueConst obj) {
    (void)ctx; (void)obj;
    if (pbyte_offset) *pbyte_offset = 0;
    if (pbyte_length) *pbyte_length = 0;
    return NULL;
}

WEAK_STUB JSValue JS_ThrowInternalError(JSContext *ctx, const char *fmt, ...) { (void)ctx; (void)fmt; return JS_EXCEPTION; }
WEAK_STUB JSValue JS_ThrowOutOfMemory(JSContext *ctx) { (void)ctx; return JS_EXCEPTION; }
WEAK_STUB JSValue JS_ThrowRangeError(JSContext *ctx, const char *fmt, ...) { (void)ctx; (void)fmt; return JS_EXCEPTION; }
WEAK_STUB JSValue JS_ThrowTypeError(JSContext *ctx, const char *fmt, ...) { (void)ctx; (void)fmt; return JS_EXCEPTION; }

WEAK_STUB int JS_IsException(JSValueConst v) { return v.tag == JS_TAG_EXCEPTION; }
WEAK_STUB int JS_IsUndefined(JSValueConst v) { return v.tag == JS_TAG_UNDEFINED; }
WEAK_STUB int JS_IsString(JSValueConst v) { return v.tag == JS_TAG_STRING; }
WEAK_STUB int JS_IsFunction(JSContext *ctx, JSValueConst v) { (void)ctx; (void)v; return 0; }

static JSClassID g_class_id_counter = 1;
WEAK_STUB JSClassID JS_NewClassID(JSClassID *pclass_id) {
    JSClassID id = g_class_id_counter++;
    if (pclass_id) *pclass_id = id;
    return id;
}
WEAK_STUB int JS_NewClass(JSRuntime *rt, JSClassID class_id, const JSClassDef *class_def) { (void)rt; (void)class_id; (void)class_def; return 0; }
WEAK_STUB JSRuntime *JS_GetRuntime(JSContext *ctx) { (void)ctx; return NULL; }

WEAK_STUB void JS_SetClassProto(JSContext *ctx, JSClassID class_id, JSValue obj) { (void)ctx; (void)class_id; (void)obj; }
WEAK_STUB void JS_SetOpaque(JSValue obj, void *opaque) { (void)obj; (void)opaque; }
WEAK_STUB void *JS_GetOpaque(JSValueConst obj, JSClassID class_id) { (void)obj; (void)class_id; return NULL; }
WEAK_STUB void *JS_GetOpaque2(JSContext *ctx, JSValueConst obj, JSClassID class_id) { (void)ctx; (void)obj; (void)class_id; return NULL; }

WEAK_STUB int JS_SetPropertyStr(JSContext *ctx, JSValueConst this_obj, const char *prop, JSValue val) { (void)ctx; (void)this_obj; (void)prop; (void)val; return 0; }
WEAK_STUB int JS_SetPropertyUint32(JSContext *ctx, JSValueConst this_obj, uint32_t idx, JSValue val) { (void)ctx; (void)this_obj; (void)idx; (void)val; return 0; }
WEAK_STUB void JS_SetPropertyFunctionList(JSContext *ctx, JSValueConst obj, const JSCFunctionListEntry *tab, int len) { (void)ctx; (void)obj; (void)tab; (void)len; }

WEAK_STUB JSModuleDef *JS_NewCModule(JSContext *ctx, const char *name_str, JSModuleInitFunc *func) { (void)ctx; (void)name_str; (void)func; return NULL; }
WEAK_STUB int JS_AddModuleExport(JSContext *ctx, JSModuleDef *m, const char *name_str) { (void)ctx; (void)m; (void)name_str; return 0; }
WEAK_STUB int JS_AddModuleExportList(JSContext *ctx, JSModuleDef *m, const JSCFunctionListEntry *tab, int len) { (void)ctx; (void)m; (void)tab; (void)len; return 0; }
WEAK_STUB int JS_SetModuleExport(JSContext *ctx, JSModuleDef *m, const char *export_name, JSValue val) { (void)ctx; (void)m; (void)export_name; (void)val; return 0; }
WEAK_STUB int JS_SetModuleExportList(JSContext *ctx, JSModuleDef *m, const JSCFunctionListEntry *tab, int len) { (void)ctx; (void)m; (void)tab; (void)len; return 0; }

WEAK_STUB JSValue JS_GetGlobalObject(JSContext *ctx) { (void)ctx; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_Call(JSContext *ctx, JSValueConst func_obj, JSValueConst this_obj, int argc, JSValueConst *argv) { (void)ctx; (void)func_obj; (void)this_obj; (void)argc; (void)argv; return JS_UNDEFINED; }
WEAK_STUB JSValue JS_DupValue(JSContext *ctx, JSValueConst v) { (void)ctx; return v; }
WEAK_STUB JSValue JS_NewCFunction2(JSContext *ctx, JSCFunction *func, const char *name, int length, int cproto, int magic) { (void)ctx; (void)func; (void)name; (void)length; (void)cproto; (void)magic; return JS_UNDEFINED; }
