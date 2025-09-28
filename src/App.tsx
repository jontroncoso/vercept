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
  return (
    <div className="h-screen w-screen text-foreground flex flex-col">
      <ChatWindow
        discussion={[
          {
            role: "user",
            content: "How many lights are in this image?",
            images: [
              "https://images.prismic.io/star-trek-untold/NDQzYTYyYWItMjY2Ny00MGY3LWEzMzItMDNkNjdhOWMyMzg2_chain_of_command_2.jpg?auto=compress,format&rect=0,0,700,526&w=700&h=526",
            ],
          },
          { role: "assistant", content: "There are four lights in this image.", images: [] },
        ]}
      />
      <Dropzone />
    </div>
  );
}

type Message = {
  role: "user" | "assistant";
  content: string;
  images: (string | File)[];
};

const ChatWindow: React.FC<{ discussion: Message[] }> = ({ discussion }) => {
  const actions = [
    { icon: Copy, label: "Copy" },
    { icon: ThumbsUp, label: "Like" },
    { icon: ThumbsDown, label: "Dislike" },
    { icon: Volume2, label: "Read" },
    { icon: RefreshCw, label: "Refresh" },
  ];

  return (
    <div className="overflow-y-scroll flex-1 shrink-0 px-3 pt-2">
      {discussion.map((message, index) => (
        <div
          key={index}
          className={`flex relative items-end ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}
        >
          {message.images.length > 0 &&
            message.images.map((img, i) => (
              <img
                key={i}
                src={typeof img === "string" ? img : URL.createObjectURL(img)}
                alt={`Uploaded image ${i + 1}`}
                className="rounded-lg max-w-xs"
              />
            ))}
          <div
            className={`absolute -bottom-3 rounded-full text-secondary-foreground px-5 py-3 shadow-primary/50 shadow-md text-sm ${
              message.role === "user"
                ? "bg-chart-1 text-white rounded-tr-none"
                : "bg-muted text-primary rounded-tl-none"
            }`}
          >
            {message.content}
            {message.role === "assistant" && (
              <div className="flex items-center gap-4 text-muted -mb-12 pt-4">
                {actions.map(({ icon: Icon, label }) => (
                  <button key={label} aria-label={label} className="p-1 rounded-full">
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const Dropzone: React.FC<{
  disabled?: boolean;
}> = ({ disabled }) => {
  const [files, setFiles] = useState<File[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");

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
      setFiles((fs) => [...fs, ...(input.files ? Array.from(input.files) : [])].filter(dedupeArray));
    };
    input.click();
  }, [setFiles, disabled]);

  const onDragOver = (e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
  };

  const submitQuestion = async () => {
    // Submit the question along with attached files
    setText("");
  };

  return (
    <div ref={ref} id="dropzone" className="flex items-center gap-3 px-3 py-2" onDrop={onDrop} onDragOver={onDragOver}>
      <div
        className="flex-1 flex-col rounded-2xl relative shadow-zinc-500 shadow-sm transition bg-popover border text-foreground focus-within:shadow-md focus-within:bg-accent"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <div className="flex justify-end py-1.5 px-2 gap-2 min-h-10">
          <textarea
            className="text-secondary-foreground p-2 outline-none grow resize-none"
            placeholder="Ask anything..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitQuestion();
              }
            }}
            rows={1}
            onChange={(e) => setText(e.target.value)}
            value={text}
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
                onClick={() => setFiles((fs) => fs.filter((f) => f.name !== file.name))}
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
