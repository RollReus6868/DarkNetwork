import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Check, Loader2 } from "lucide-react";

export default function EmailCapture({ source = "Homepage", variant = "full" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    setError("");
    try {
      await base44.entities.Subscriber.create({ email: email.trim(), source });
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setError(err?.message?.includes?.("duplicate") ? "You're already subscribed." : "Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 text-primary justify-center py-4">
        <Check className="w-5 h-5" />
        <span className="font-medium">Check your inbox — your free guide is on its way.</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          required
          className="flex-1 bg-secondary border border-border rounded px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded font-medium uppercase text-sm tracking-wide hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Guide"}
        </button>
        {error && <p className="text-destructive text-xs absolute mt-12">{error}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            className="w-full bg-secondary border border-border rounded pl-12 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-primary text-primary-foreground px-7 py-3.5 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {status === "loading" ? <Loader2 className="w-5 h-5 animate-spin" /> : "Get Free Guide"}
        </button>
      </div>
      {error && <p className="text-destructive text-sm mt-3 text-center">{error}</p>}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Free Bible studies & resources. Unsubscribe anytime.
      </p>
    </form>
  );
}