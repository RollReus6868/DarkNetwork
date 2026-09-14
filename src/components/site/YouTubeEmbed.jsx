import { useState, useRef, useEffect } from "react";
import { Play, X } from "lucide-react";

export default function YouTubeEmbed({ videoId, title, thumbnail, className = "" }) {
  const [activated, setActivated] = useState(false);
  const containerRef = useRef(null);

  const thumb = thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  if (activated) {
    return (
      <div className={`relative aspect-video bg-black overflow-hidden ${className}`}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      ref={containerRef}
      onClick={() => setActivated(true)}
      className={`group relative aspect-video bg-black overflow-hidden cursor-pointer w-full glow-bronze ${className}`}
      aria-label={`Play video: ${title}`}
    >
      <img
        src={thumb}
        alt={title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          e.target.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }}
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-[#FF0000] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-2xl">
          <Play className="w-7 h-7 lg:w-9 lg:h-9 text-white fill-white ml-1" />
        </div>
      </div>
    </button>
  );
}