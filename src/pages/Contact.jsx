import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { getChatGuestKey } from "@/lib/chatGuestKey";
import { Mail, Loader2, Check, MessageSquare } from "lucide-react";
import Seo from "@/components/site/Seo";
import { SectionHeading } from "@/components/site/Cards";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      // Lands in the Admin chat inbox, next to the live chat messages.
      await base44.functions.invoke("chatGuest", {
        action: "send",
        guestKey: getChatGuestKey(),
        body: `[Contact form] ${form.subject || "(no subject)"}\nName: ${form.name}\nEmail: ${form.email}\n\n${form.message}`,
      });
      setStatus("success");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError("Something went wrong. Please email us directly at support@darknetwork.com");
    }
  };

  return (
    <>
      <Seo title="Contact — Dark Network" description="Get in touch with the Dark Network team." />
      <div className="pt-16 lg:pt-20">
        <div className="bg-secondary/50 border-b border-border py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Contact Us" subtitle="Questions, feedback, or collaboration ideas — we'd love to hear from you." />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
          {status === "success" ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-heading text-2xl font-bold mb-2">Message Sent</h3>
              <p className="text-muted-foreground">Thanks for reaching out. We'll get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-secondary border border-border rounded px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-secondary border border-border rounded px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-secondary border border-border rounded px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-secondary border border-border rounded px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full bg-primary text-primary-foreground px-6 py-4 rounded font-semibold uppercase text-sm tracking-wide hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === "loading" ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</> : <><MessageSquare className="w-5 h-5" /> Send Message</>}
              </button>
            </form>
          )}

          <div className="mt-12 pt-8 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">Prefer email?</p>
            <a href="mailto:support@darknetwork.com" className="text-primary flex items-center justify-center gap-2 hover:underline">
              <Mail className="w-4 h-4" /> support@darknetwork.com
            </a>
          </div>
        </div>
      </div>
    </>
  );
}