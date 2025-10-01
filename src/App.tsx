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
import type OpenAI from "openai";
import {
  dedupeFilter,
  extractTextFromMessage,
  messageIsInput,
  messageIsResponse,
  useMessageStore,
} from "./store/store";

type ImageType = OpenAI.Responses.ResponseInputImage & { image_url: string };

const extractImagesFromMessage = (message: OpenAI.Responses.ResponseInputItem.Message): string[] =>
  message.content
    .filter((c): c is ImageType => c.type === "input_image" && Boolean(c.image_url))
    .map((c) => c.image_url);

// Main App component
export default function App() {
  const showSlowWarning = useMessageStore((state) => state.showSlowWarning);
  const scrollDivRef = useRef<HTMLOutputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollDivRef.current?.scrollTo) {
      scrollDivRef.current.scrollTo({
        top: scrollDivRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [scrollDivRef]);
  return (
    <div className="h-dvh w-screen text-foreground flex flex-col">
      <ChatWindow showSlowWarning={showSlowWarning} scrollDivRef={scrollDivRef} />
      <Dropzone scrollToBottom={scrollToBottom} />
    </div>
  );
}

/**
 * Chat window that shows the conversation
 */
const ChatWindow: React.FC<{
  showSlowWarning: boolean;
  scrollDivRef: React.Ref<HTMLOutputElement>;
}> = ({ showSlowWarning, scrollDivRef }) => {
  const messages = useMessageStore((state) => state.messages);
  const chatbotStatus = useMessageStore((state) => state.chatbotStatus);

  const actions = [
    { icon: Copy, label: "Copy" },
    { icon: ThumbsUp, label: "Like" },
    { icon: ThumbsDown, label: "Dislike" },
    { icon: Volume2, label: "Read" },
    { icon: RefreshCw, label: "Refresh" },
  ];

  return (
    <output
      ref={scrollDivRef}
      className="overflow-y-scroll flex-1 shrink-0 px-3 pt-2"
      aria-label="Chatbot conversation"
    >
      {messages.map((message, index) => {
        const images = messageIsInput(message) ? extractImagesFromMessage(message) : [];
        return (
          <div
            key={index}
            className={`flex flex-col relative justify-end ${
              messageIsInput(message) ? "items-end" : "items-start"
            } mb-4`}
          >
            {images.length > 0 &&
              images.map((img, i) => (
                <img key={i} src={img || ""} alt={`Chatted image ${i + 1}`} className="rounded-lg max-w-xs" />
              ))}
            <div
              className={`rounded-2xl text-secondary-foreground px-5 py-3 shadow-primary/50 shadow-md text-sm mb-8 ${
                messageIsInput(message)
                  ? "bg-chart-1 text-white rounded-tr-none"
                  : "bg-muted text-primary rounded-tl-none"
              }`}
            >
              {extractTextFromMessage(message)}
              {messageIsResponse(message) && (
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
        );
      })}
      {["thinking", "uploading"].includes(chatbotStatus) && (
        <div className=" relative w-1/3" id="thinking-indicator">
          <p
            className={`w-full text-sm transition-opacity text-primary ${
              showSlowWarning ? "opacity-100" : "opacity-0"
            } text-center text-muted mb-1`}
          >
            Please be patient, especially if analyzing images.
            <br />
            This is using o3 to save costs.
          </p>
          <div style={{ left: "0" }} />
          <div style={{ animationDelay: "50ms", left: "5%" }} />
          <div style={{ animationDelay: "100ms", left: "10%" }} />
          <div style={{ animationDelay: "150ms", left: "15%" }} />
          <div style={{ animationDelay: "200ms", left: "20%" }} />
          <div style={{ animationDelay: "250ms", left: "25%" }} />
          <div style={{ animationDelay: "300ms", left: "30%" }} />
          <div style={{ animationDelay: "350ms", left: "35%" }} />
          <div style={{ animationDelay: "400ms", left: "40%" }} />
          <div style={{ animationDelay: "450ms", left: "45%" }} />
          <div style={{ animationDelay: "500ms", left: "50%" }} />
          <div style={{ animationDelay: "550ms", left: "55%" }} />
          <div style={{ animationDelay: "600ms", left: "60%" }} />
          <div style={{ animationDelay: "650ms", left: "65%" }} />
          <div style={{ animationDelay: "700ms", left: "70%" }} />
          <div style={{ animationDelay: "750ms", left: "75%" }} />
          <div style={{ animationDelay: "800ms", left: "80%" }} />
          <div style={{ animationDelay: "850ms", left: "85%" }} />
          <div style={{ animationDelay: "900ms", left: "90%" }} />
          <div style={{ animationDelay: "950ms", left: "95%" }} />
        </div>
      )}
    </output>
  );
};

/**
 * Dropzone component for file uploads and text input
 */
const Dropzone: React.FC<{
  scrollToBottom: () => void;
}> = ({ scrollToBottom }) => {
  const [files, setFiles] = useState<{ type: string; name: string; url: string }[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const appendMessage = useMessageStore((state) => state.appendMessage);
  const clearMessages = useMessageStore((state) => state.clearMessages);
  const setChatbotStatus = useMessageStore((state) => state.setChatbotStatus);
  const chatbotStatus = useMessageStore((state) => state.chatbotStatus);

  // Subscribe to message store changes to auto-scroll to bottom
  useMessageStore.subscribe(async () => setTimeout(scrollToBottom, 100));

  // Append files, limiting to 4
  const appendFiles = useCallback(
    async (rawFiles: File[]) => {
      const response = await fetch(`/api/upload`, {
        method: "POST",
        body: JSON.stringify({ files: rawFiles.map((f) => ({ name: f.name, type: f.type })) }),
        headers: { "Content-Type": "application/json" },
      });
      const { presignedUrls } = (await response.json()) as { presignedUrls: string[] };
      const processedFiles = await Promise.all(
        rawFiles.map(async (f, i) => {
          await fetch(presignedUrls[i], {
            method: "PUT",
            headers: { "Content-Type": f.type },
            body: f,
          });
          return { type: f.type, name: f.name, url: `${import.meta.env.VITE_API_URL}/upload/${f.name}` };
        })
      );
      const newFiles = [...files, ...processedFiles].filter(dedupeFilter);

      if (newFiles.length > 4) {
        newFiles.splice(0, newFiles.length - 4);
        appendMessage({ error: "You can only upload up to 4 images at a time, for some reason." });
      }

      setTimeout(() => setFiles(newFiles), 250);
    },
    [appendMessage, files]
  );

  // Handle file drop
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (chatbotStatus === "thinking") return;
      appendFiles(Array.from(e.dataTransfer.files));
      setChatbotStatus("idle");
    },
    [chatbotStatus, appendFiles, setChatbotStatus]
  );

  // Handle Add Image button click
  const onClick = useCallback(() => {
    if (chatbotStatus === "thinking") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => appendFiles(input.files ? Array.from(input.files) : []);
    input.click();
    setChatbotStatus("idle");
  }, [chatbotStatus, appendFiles, setChatbotStatus]);

  // Handle drag over
  const onDragOver = (e: React.DragEvent) => {
    if (chatbotStatus === "thinking") return;
    e.preventDefault();
    setChatbotStatus("drag-n-drop");
  };

  // Submit request to OpenAI
  const submitRequest = async (text: string) => {
    // Move images in UI first.
    setChatbotStatus("thinking");
    const message: OpenAI.Responses.ResponseInputItem.Message = {
      role: "user",
      content: [
        { type: "input_text", text },
        ...files.map<OpenAI.Responses.ResponseInputImage>((f) => ({
          type: "input_image",
          image_url: f.url,
          detail: "auto",
        })),
      ],
    };
    appendMessage(message);
    setFiles([]);
  };

  return (
    <menu ref={ref} className="flex items-center gap-3 px-3 py-2" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="flex-1 flex-col rounded-2xl relative shadow-zinc-500 shadow-sm transition bg-popover border text-foreground focus-within:shadow-md focus-within:bg-accent">
        <div className="flex justify-end py-1.5 px-2 gap-2 min-h-10">
          <div
            className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center text-center p-4 z-20 pointer-events-none transition-opacity bg-accent ${
              chatbotStatus === "drag-n-drop" ? "opacity-100 z-10" : "opacity-0 z-0"
            }`}
            id="dropzone"
          >
            Drop Files Here!
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
            <div />
          </div>
          <Textarea submitRequest={submitRequest} />
          {files.map((file) => (
            <div key={file.name} className="relative  z-30">
              <img src={file.url} alt={file.name} className="rounded-sm border object-contain max-h-16" />
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
          <button className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1">
            <Globe className="h-4 w-4" />
            <span className="sm:inline hidden">Search</span>
          </button>

          <button className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1">
            <Telescope className="h-4 w-4" />
            <span className="sm:inline hidden">Deep research</span>
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1"
            onClick={() => clearMessages()}
            //  alt="Clear chat"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <Button
        size="icon"
        className="rounded-full h-12 w-12"
        onClick={() => {
          setChatbotStatus(chatbotStatus === "idle" ? "drag-n-drop" : "idle");
          setTimeout(scrollToBottom, 100);
        }}
      >
        <Mic className="h-5 w-5" />
      </Button>
    </menu>
  );
};

const Textarea: React.FC<{ submitRequest: (text: string) => void }> = ({ submitRequest }) => {
  const chatbotStatus = useMessageStore((state) => state.chatbotStatus);
  const [text, setText] = useState("");

  const onKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        submitRequest(text);
        setText("");
      }
    },
    [text, submitRequest]
  );

  const onchange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  }, []);
  return (
    <textarea
      className="text-secondary-foreground p-2 outline-none grow resize-none"
      placeholder="Ask anything..."
      onKeyDown={onKeyDown}
      rows={1}
      onChange={onchange}
      value={text}
      disabled={chatbotStatus === "thinking"}
    ></textarea>
  );
};
