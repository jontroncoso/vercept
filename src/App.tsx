import React, { useCallback, useRef, useState } from "react";
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
  Telescope,
  X,
} from "lucide-react";

const dedupeArray = <T,>(f: T, i: number, fs: T[]): boolean => {
  return fs.findIndex((t) => t === f) === i;
};

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
      <Dropzone />
    </div>
  );
}

const Dropzone: React.FC<{
  disabled?: boolean;
}> = ({ disabled }) => {
  const [files, setFiles] = useState<File[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  console.log({ files });

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setFiles((fs) =>
        [...fs, ...Array.from(e.dataTransfer.files)].filter((f, i, fs) => {
          return fs.findIndex((t) => t.name === f.name) === i;
        })
      );
    },
    [disabled]
  );

  const onClick = useCallback(() => {
    if (disabled) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      setFiles((fs) =>
        [...fs, ...(input.files ? Array.from(input.files) : [])].filter(
          dedupeArray
        )
      );
    };
    input.click();
  }, [setFiles, disabled]);

  const onDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      id="dropzone"
      className="flex items-center gap-3 px-3 py-2"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <div
        className="flex-1 flex-col rounded-2xl relative shadow-zinc-500 shadow-sm transition bg-popover border text-foreground focus-within:shadow-md focus-within:bg-accent"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="flex justify-end py-1.5 px-2 gap-2 min-h-10">
          <textarea
            className="text-secondary-foreground p-2 outline-none grow resize-none"
            placeholder="Ask anything..."
            rows={1}
          ></textarea>

          {files.map((file) => (
            <div key={file.name} className="relative  z-30">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="rounded-sm border object-contain max-h-16"
              />
              <button
                className="absolute -top-3 -right-3 bg-red cursor-pointer rounded-full p-1 m-1"
                onClick={() =>
                  setFiles((fs) => fs.filter((f) => f.name !== file.name))
                }
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 py-2 px-2 z-30">
          <button
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1"
            onClick={onClick}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1"
            onClick={onClick}
          >
            <Globe className="h-4 w-4" />
            Search
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1"
            onClick={onClick}
          >
            <Telescope className="h-4 w-4" />
            Deep research
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1"
            onClick={onClick}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <Button size="icon" className="rounded-full h-12 w-12">
        <Mic className="h-5 w-5" />
      </Button>
    </div>
  );
};
