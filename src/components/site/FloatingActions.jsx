import { useState } from "react";
import ChatWidget from "./ChatWidget";
import DonateButton from "./DonateButton";

// Bottom-left stack: chat above, donate below. Their panels open above the stack, one at a time.
export default function FloatingActions() {
  const [active, setActive] = useState(null);
  const toggle = (name) => () => setActive((cur) => (cur === name ? null : name));

  return (
    <div className="fixed left-4 sm:left-8 bottom-20 sm:bottom-5 z-[75] flex flex-col items-start gap-3">
      <ChatWidget open={active === "chat"} onToggle={toggle("chat")} />
      <DonateButton open={active === "donate"} onToggle={toggle("donate")} />
    </div>
  );
}
