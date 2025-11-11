import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Temporary debug routes for PDF parsers
http.route({
  path: "/debug/pdf/dry-parse",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return new Response(JSON.stringify({ error: "Missing fileId" }), { status: 400, headers: { "Content-Type": "application/json" } });
    try {
      const result = await ctx.runAction(api.pdf.dryRunParsePerPage, { fileId: fileId as any });
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

http.route({
  path: "/debug/pdf/dry-normalize",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");
    if (!fileId) return new Response(JSON.stringify({ error: "Missing fileId" }), { status: 400, headers: { "Content-Type": "application/json" } });
    try {
      const result = await ctx.runAction(api.pdf.dryRunNormalizePerPage, { fileId: fileId as any });
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }),
});

export default http;
