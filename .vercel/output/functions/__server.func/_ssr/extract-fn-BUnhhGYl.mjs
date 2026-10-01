import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { i as string, r as object } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/extract-fn-BUnhhGYl.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var InputSchema = object({
	input: string(),
	bearerToken: string().optional()
});
var extractPost_createServerFn_handler = createServerRpc({
	id: "6cac98b4ea8c319f032ad98b0524f32dc646fbbe40724d217f3d12349e1297fe",
	name: "extractPost",
	filename: "src/lib/extract/extract-fn.ts"
}, (opts) => extractPost.__executeServer(opts));
var extractPost = createServerFn({ method: "POST" }).validator((data) => InputSchema.parse(data)).handler(extractPost_createServerFn_handler, async ({ data }) => {
	const { runExtract } = await import("./sources.server-B8n1lcek.mjs");
	return runExtract(data.input, data.bearerToken);
});
//#endregion
export { extractPost_createServerFn_handler };
