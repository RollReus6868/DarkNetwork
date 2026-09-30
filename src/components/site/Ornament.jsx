// Thin gold rule with a small cross in the middle — used above section headings.
export default function Ornament({ className = "", light = false }) {
  const line = light ? "bg-[#c9a24a]/60" : "bg-primary/50";
  const dot = light ? "bg-[#c9a24a]" : "bg-primary";
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} aria-hidden="true">
      <span className={`h-px w-16 sm:w-24 ${line}`} />
      <span className={`w-1 h-1 rounded-full ${dot}`} />
      <svg width="12" height="16" viewBox="0 0 12 16" className={light ? "text-[#c9a24a]" : "text-primary"} fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M6 1v14M2 5h8" />
      </svg>
      <span className={`w-1 h-1 rounded-full ${dot}`} />
      <span className={`h-px w-16 sm:w-24 ${line}`} />
    </div>
  );
}
