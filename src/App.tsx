import React from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Globe,
  MoreHorizontal,
  Mic,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RefreshCw,
  type LucideIcon,
  Telescope,
} from "lucide-react";
import { Input } from "./components/ui/input";

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

export default function App() {
  const actions = [
    { icon: Copy, label: "Copy" },
    { icon: ThumbsUp, label: "Like" },
    { icon: ThumbsDown, label: "Dislike" },
    { icon: Volume2, label: "Read" },
    { icon: RefreshCw, label: "Refresh" },
  ];

  return (
    <div className="h-screen w-screen text-foreground flex flex-col">
      <div className="overflow-y-scroll flex-1 shrink-0 px-3 pt-2">
        {/* Image with question bubble */}
        <div className="flex relative justify-end items-end">
          <img
            src="https://images.prismic.io/star-trek-untold/NDQzYTYyYWItMjY2Ny00MGY3LWEzMzItMDNkNjdhOWMyMzg2_chain_of_command_2.jpg?auto=compress,format&rect=0,0,700,526&w=700&h=526"
            alt="Stack of books"
            className="rounded-2xl border object-contain max-h-96"
          />
          <div className="absolute bottom-6 right-0">
            <div className="rounded-full rounded-tr-none text-secondary-foreground bg-secondary px-5 py-3 shadow-primary/20 shadow-md text-sm">
              How many lights are in this image?
            </div>
          </div>
        </div>

        {/* Assistant answer */}
        <div className="space-y-3">
          <p className="text-lg">There are four lights in this image.</p>
          <div className="flex items-center gap-4 text-muted">
            {actions.map(({ icon: Icon, label }) => (
              <button
                key={label}
                aria-label={label}
                className="p-1 rounded-full"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Spacer to mimic open chat area */}
        <div className="h-98" />
      </div>
      {/* Bottom composer */}
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex-1 rounded-2xl relative">
          <Input
            className="text-foreground rounded-2xl text-[15px] px-2 pt-4 pb-16 outline-none overflow-auto border-none resize-none shadow-zinc-500 shadow-sm"
            placeholder="Ask anything..."
          />
          <div className="flex items-center gap-2 absolute bottom-2 left-3">
            <Chip icon={Plus}></Chip>
            <Chip icon={Globe}>Search</Chip>
            <Chip icon={Telescope}>Deep research</Chip>
            <Chip icon={MoreHorizontal}></Chip>
          </div>
        </div>
        <Button size="icon" className="rounded-full h-12 w-12">
          <Mic className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  children,
}: Readonly<{
  icon: LucideIcon;
  children?: React.ReactNode;
}>) {
  return (
    <button className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1">
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}
