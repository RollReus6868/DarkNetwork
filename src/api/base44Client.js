// The site's backend client. The backend is Supabase (database, sign-in, file storage,
// edge functions); the exported object keeps the name and call shapes the pages were
// written against, so pages do not need to know which backend is behind it.
import { createClient } from "@supabase/supabase-js";
import { entitiesProxy } from "../../supabase/functions/_shared/entities.js";

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// Google sign-in needs a Google Cloud key configured in Supabase first.
export const GOOGLE_LOGIN = import.meta.env.VITE_GOOGLE_LOGIN === "true";

function authError(error, status = 400) {
  const err = new Error(error?.message || "Authentication failed");
  err.status = error?.status || status;
  return err;
}

const safeName = (name) => String(name || "file").normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80);

async function upload(bucket, file) {
  const path = `${crypto.randomUUID().slice(0, 8)}_${safeName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return path;
}

const auth = {
  // The signed-in user with their role, or throws (status 401) for a visitor.
  async me() {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) throw authError({ message: "Not signed in" }, 401);
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return { id: user.id, email: user.email, full_name: profile?.full_name || "", role: profile?.role || "user" };
  },
  async isAuthenticated() {
    return Boolean((await supabase.auth.getSession()).data?.session);
  },
  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw authError(error);
    return { access_token: data.session?.access_token, user: data.user };
  },
  async loginWithProvider(provider, returnTo = "/") {
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + returnTo } });
    if (error) throw authError(error);
  },
  // access_token is set when the account is usable right away (no email confirmation step).
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw authError(error);
    return { access_token: data.session?.access_token };
  },
  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: "signup" });
    if (error) throw authError(error);
    return { access_token: data.session?.access_token };
  },
  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw authError(error);
  },
  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw authError(error);
  },
  // The reset link signs the visitor in; the new password is then set on that session.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw authError(error);
  },
  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },
  redirectToLogin(fromUrl) {
    const from = fromUrl ? new URL(fromUrl, window.location.origin) : null;
    window.location.href = "/login" + (from ? `?returnTo=${encodeURIComponent(from.pathname + from.search)}` : "");
  },
  setToken() {},   // sessions are stored by the Supabase client itself
};

export const base44 = {
  entities: entitiesProxy(supabase),
  auth,
  functions: {
    // -> { data }, or throws with the function's own error message
    async invoke(name, payload = {}) {
      const { data, error } = await supabase.functions.invoke(name, { body: payload });
      if (error) {
        const body = await error.context?.json?.().catch(() => null);
        const err = new Error(body?.error || error.message || "Request failed");
        err.status = error.context?.status;
        throw err;
      }
      return { data };
    },
  },
  integrations: {
    Core: {
      async UploadPublicFile({ file }) {
        const path = await upload("public-files", file);
        return { file_url: supabase.storage.from("public-files").getPublicUrl(path).data.publicUrl };
      },
      async UploadPrivateFile({ file }) {
        return { file_uri: await upload("private-files", file) };
      },
    },
  },
};
