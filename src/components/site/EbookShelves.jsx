import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import EbookSlider from "@/components/site/EbookSlider";
import { KIND_TITLES } from "@/lib/ebookGroups";
import { formatPrice } from "@/lib/pricing";

// Buttons that pick one part series ("All" = every series, one after another).
export function SeriesChips({ series, value, onChange, className = "" }) {
  if (series.length < 2) return null;
  const chip = (key, label) => (
    <button
      key={key}
      type="button"
      onClick={() => onChange(key)}
      aria-pressed={value === key}
      className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
        value === key
          ? "bg-[#2b1d0a] text-[#f4ead4] border-[#2b1d0a]"
          : "border-[#2b1d0a]/25 text-[#2b1d0a]/75 hover:border-[#8a6420] hover:text-[#8a6420]"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex flex-wrap gap-2 ${className}`} role="group" aria-label="Choose a series">
      {chip("all", "All")}
      {series.map((row) => chip(row.key, row.short))}
    </div>
  );
}

// "Prefer the whole book?" line under a series: its full version and what it saves.
export function FullVersionOffer({ row, className = "" }) {
  if (!row?.full) return null;
  return (
    <p className={`text-sm text-[#2b1d0a]/75 ${className}`}>
      Want all {row.parts.length} parts of <span className="italic">{row.short}</span>?{" "}
      <Link to={`/books/${row.full.slug}`} className="inline-flex items-center gap-1 font-semibold text-[#8a6420] hover:text-[#2b1d0a] underline-offset-4 hover:underline">
        Get the Full Version · {formatPrice(row.full.price)}{row.save > 0 ? ` (save ${row.save}%)` : ""}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </p>
  );
}

// Home page: every short part in ONE row, series after series, with buttons to show one series.
export function PartSeriesRow({ series }) {
  const [pick, setPick] = useState("all");
  const chosen = series.find((row) => row.key === pick);
  const ebooks = chosen ? chosen.parts : series.flatMap((row) => row.parts);
  if (ebooks.length === 0) return null;
  return (
    <EbookSlider
      key={pick}
      title={KIND_TITLES.part}
      ebooks={ebooks}
      compact
      controls={<SeriesChips series={series} value={pick} onChange={setPick} className="-mt-2 mb-6" />}
      footer={chosen ? <FullVersionOffer row={chosen} className="mt-6 text-center" /> : null}
    />
  );
}
