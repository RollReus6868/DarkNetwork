import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

// The buyer's ebooks and their download action. With a token: a guest order (receipt link);
// without: the signed-in buyer's library. A fresh order can take a few seconds to arrive
// from the payment provider, so an empty guest list is retried for a while.
export function useLibrary({ token, enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    (async () => {
      for (let attempt = 0; active && attempt < (token ? 10 : 1); attempt++) {
        try {
          const res = await base44.functions.invoke("generateEbookDownloadUrl", { list: true, token });
          const found = (res?.data || res)?.items || [];
          if (!active) return;
          if (found.length > 0) { setItems(found); break; }
        } catch {
          break;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [token, enabled]);

  const download = useCallback(async (ebookId, file = "main") => {
    setDownloadingId(`${ebookId}:${file}`);
    try {
      const res = await base44.functions.invoke("generateEbookDownloadUrl", { ebook_id: ebookId, file, token });
      const signedUrl = (res?.data || res)?.signed_url;
      if (!signedUrl) throw new Error("No download link returned");
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Download failed",
        description: error?.message || "Please try again or contact us.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  }, [token, toast]);

  return { items, loading, downloadingId, download };
}
