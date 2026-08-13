"use client";

import { useEffect, useRef } from "react";

const BLOB_BASE = "https://vv3aaceovcojppbg.public.blob.vercel-storage.com/marketing";

const VIDEOS = [
  {
    src: `${BLOB_BASE}/people-business.mp4`,
    title: "Event Managers reviewing bids",
    description: "Compare proposals side by side and pick the right facilitator for the job.",
  },
  {
    src: `${BLOB_BASE}/presentation-listening.mp4`,
    title: "Facilitators delivering training",
    description: "Vetted specialists running sessions that actually move the needle.",
  },
  {
    src: `${BLOB_BASE}/team-collaboration.mp4`,
    title: "Professionals pooling resources",
    description: "Merged training lets peers split the cost of bringing in a facilitator none could afford alone.",
  },
];

function VideoCard({ src, title, description }: { src: string; title: string; description: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          node.play().catch(() => {});
        } else {
          node.pause();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <video ref={videoRef} muted loop playsInline preload="none" className="aspect-video w-full object-cover">
        <source src={src} type="video/mp4" />
      </video>
      <div className="p-5">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function VideoShowcase() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
          The ecosystem, in motion
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Real moments from how training gets sourced, delivered, and funded on Facilit8.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {VIDEOS.map((video) => (
          <VideoCard key={video.src} {...video} />
        ))}
      </div>
    </section>
  );
}
