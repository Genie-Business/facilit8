"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F7FAFB] px-4 text-center font-sans">
          <div>
            <p className="text-sm font-medium" style={{ color: "#47bbd1" }}>
              Critical error
            </p>
            <h1 className="mt-2 text-3xl font-medium tracking-tight text-black">
              The application failed to load
            </h1>
            <p className="mt-2 max-w-sm text-gray-500">
              Please try again. If this keeps happening, contact support.
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="rounded-full px-6 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: "#47bbd1" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
