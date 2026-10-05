// What every edge function needs: the caller's identity, full-access data, file storage, secrets.
// The shapes match what the functions were written against, so their bodies stay unchanged.
import { createClient } from "npm:@supabase/supabase-js@2";
import { entitiesProxy } from "./entities.js";

export const secrets = { get: (key) => Deno.env.get(key) };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tool-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const safeName = (name) => String(name || "file").normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80);

export function createClientFromRequest(req) {
  // service role: bypasses row level security, never leaves the server
  const admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const entities = entitiesProxy(admin);

  const upload = async (bucket, file) => {
    const path = `${crypto.randomUUID().slice(0, 8)}_${safeName(file.name)}`;
    const { error } = await admin.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
    if (error) throw new Error(error.message);
    return path;
  };

  return {
    auth: {
      // throws when the request carries no signed-in user (callers treat that as "guest")
      async me() {
        const { data, error } = await admin.auth.getUser(token);
        if (error || !data?.user) throw new Error("Unauthorized");
        const { data: profile } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
        return { id: data.user.id, email: data.user.email, full_name: profile?.full_name || "", role: profile?.role || "user" };
      },
    },
    entities,
    asServiceRole: {
      entities,
      integrations: {
        Core: {
          async UploadPrivateFile({ file }) {
            return { file_uri: await upload("private-files", file) };
          },
          async UploadPublicFile({ file }) {
            const path = await upload("public-files", file);
            return { file_url: admin.storage.from("public-files").getPublicUrl(path).data.publicUrl };
          },
          // A one-time address a trusted client uploads one file to, straight into storage
          // (large PDFs never pass through a function). ref = what to store on the record.
          async CreateUploadUrl({ name, isPrivate }) {
            const bucket = isPrivate ? "private-files" : "public-files";
            const path = `${crypto.randomUUID().slice(0, 8)}_${safeName(name)}`;
            const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
            if (error) throw new Error(error.message);
            const ref = isPrivate ? path : admin.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            return { upload_url: data.signedUrl, ref };
          },
          async CreateFileSignedUrl({ file_uri, expires_in = 120 }) {
            // saved on the buyer's computer under the file's own name, without the storage prefix
            const download = file_uri.split("/").pop().replace(/^[0-9a-f]{8,9}_/, "");
            const { data, error } = await admin.storage.from("private-files").createSignedUrl(file_uri, expires_in, { download });
            if (error) throw new Error(error.message);
            return { signed_url: data.signedUrl };
          },
        },
      },
    },
  };
}

// Deno.serve + CORS (the site calls functions from the browser)
export function serve(handler) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    const res = await handler(req);
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  });
}
