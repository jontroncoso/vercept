import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Globe,
  Microscope,
  MoreHorizontal,
  Mic,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RefreshCw,
} from "lucide-react";

/**
 * Screenshot Replica – Single-file React/TypeScript component
 * Tailwind + shadcn/ui
 *
 * This is a mostly-static UI that mirrors the provided mock:
 *  - Large product image
 *  - User question bubble floating over the image
 *  - Assistant answer text
 *  - 5-icon actions toolbar under the answer
 *  - Bottom input with Add / Search / Deep research / More chips and a Dictate button
 */

export default function ScreenshotReplica() {
  const actions = [
    { icon: Copy, label: "Copy" },
    { icon: ThumbsUp, label: "Like" },
    { icon: ThumbsDown, label: "Dislike" },
    { icon: Volume2, label: "Read" },
    { icon: RefreshCw, label: "Refresh" },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Image with question bubble */}
        <div className="relative">
          <img
            src="/books-demo.png"
            alt="Stack of books"
            className="w-full rounded-2xl border bg-zinc-50 object-cover"
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="rounded-full bg-zinc-100 text-zinc-700 px-5 py-3 shadow-sm border text-sm">
              How many books are in this image?
            </div>
          </div>
        </div>

        {/* Assistant answer */}
        <div className="space-y-3">
          <p className="text-lg">There are four books in this image.</p>
          <div className="flex items-center gap-4 text-zinc-500">
            {actions.map(({ icon: Icon, label }, i) => (
              <button
                key={label}
                aria-label={label}
                className="p-1 rounded-md hover:bg-zinc-100 transition"
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </div>

        {/* Spacer to mimic open chat area */}
        <div className="h-32" />

        {/* Bottom composer */}
        <div className="sticky bottom-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-2xl border bg-white shadow-sm px-3 py-2">
              <div className="text-zinc-400 text-[15px] px-2 py-2">
                Ask anything
              </div>
              <div className="flex items-center gap-2 px-1 pb-2">
                <Chip icon={Plus}>Add</Chip>
                <Chip icon={Globe}>Search</Chip>
                <Chip icon={Microscope}>Deep research</Chip>
                <Chip icon={MoreHorizontal}>More</Chip>
              </div>
            </div>
            <Button size="icon" className="rounded-full h-12 w-12">
              <Mic className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  children,
}: {
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50">
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}
