import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ExtractResponse } from "./types";

const InputSchema = z.object({
  input: z.string(),
  bearerToken: z.string().optional(),
});

export const extractPost = createServerFn({ method: "POST" })
  .validator((data) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ExtractResponse> => {
    const { runExtract } = await import("./sources.server.ts");
    return runExtract(data.input, data.bearerToken);
  });
