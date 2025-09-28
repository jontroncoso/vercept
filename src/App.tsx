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
import OpenAi from "openai";
import {
  extractTextFromMessage,
  messageIsInput,
  messageIsResponse,
  useMessageStore,
  type InputMessage,
} from "./store/store";

type ChatbotStatus = "uploading" | "thinking" | "drag-n-drop" | "idle";

const openai = new OpenAi({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

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
  const [chatbotStatus, setChatbotStatus] = useState<ChatbotStatus>("idle");
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const scrollDivRef = useRef<HTMLOutputElement>(null);
  const [timeoutRef, setTimeoutRef] = useState<NodeJS.Timeout | null>(null);

  const setStatus = useCallback(
    (status: ChatbotStatus) => {
      setShowSlowWarning(false);

      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
      if (status === "thinking") {
        setTimeoutRef(
          setTimeout(() => {
            setShowSlowWarning(true);
          }, 3000)
        );
      }
      setChatbotStatus(status);
    },
    [setChatbotStatus, setTimeoutRef, timeoutRef]
  );

  const scrollToBottom = useCallback(() => {
    if (scrollDivRef.current) {
      scrollDivRef.current.scrollTo({
        top: scrollDivRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [scrollDivRef]);
  return (
    <div className="h-screen w-screen text-foreground flex flex-col">
      <ChatWindow showSlowWarning={showSlowWarning} chatbotStatus={chatbotStatus} scrollDivRef={scrollDivRef} />
      <Dropzone setStatus={setStatus} scrollToBottom={scrollToBottom} chatbotStatus={chatbotStatus} />
    </div>
  );
}

const ChatWindow: React.FC<{
  showSlowWarning: boolean;
  chatbotStatus: ChatbotStatus;
  scrollDivRef: React.Ref<HTMLOutputElement>;
}> = ({ showSlowWarning, chatbotStatus, scrollDivRef }) => {
  const messages = useMessageStore((state) => state.messages);
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
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex flex-col relative justify-end ${messageIsInput(message) ? "items-end" : "items-start"} mb-4`}
        >
          {messageIsInput(message) &&
            message.images.length > 0 &&
            message.images.map((img, i) => (
              <img key={i} src={img || ""} alt={`Uploaded image ${i + 1}`} className="rounded-lg max-w-xs" />
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
      ))}
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

const Dropzone: React.FC<{
  setStatus: (status: ChatbotStatus) => void;
  chatbotStatus: ChatbotStatus;
  scrollToBottom: () => void;
}> = ({ setStatus, scrollToBottom, chatbotStatus }) => {
  const [files, setFiles] = useState<File[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const appendMessage = useMessageStore((state) => state.appendMessage);
  const clearMessages = useMessageStore((state) => state.clearMessages);
  useMessageStore.subscribe(async () => {
    setTimeout(scrollToBottom, 100);
  });

  const appendFiles = useCallback(
    (newFilesRaw: File[]) => {
      const newFiles = [...files, ...newFilesRaw];
      if (newFiles.length > 4) {
        newFiles.splice(0, newFiles.length - 4);
        appendMessage({ error: "You can only upload up to 4 images at a time, for some reason." });
      }
      setFiles(newFiles);
    },
    [appendMessage, files]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      console.log("onDrop", e);
      e.preventDefault();
      if (chatbotStatus === "thinking") return;
      appendFiles(Array.from(e.dataTransfer.files));
    },
    [chatbotStatus, appendFiles]
  );

  const onClick = useCallback(() => {
    if (chatbotStatus === "thinking") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => appendFiles(input.files ? Array.from(input.files) : []);
    input.click();
  }, [chatbotStatus, appendFiles]);

  const onDragOver = (e: React.DragEvent) => {
    if (chatbotStatus === "thinking") return;
    e.preventDefault();
  };

  const submitQuestion = async () => {
    setStatus("thinking");

    const message: InputMessage = {
      role: "user",
      content: [{ type: "input_text", text }],
      images: files.map((file) => URL.createObjectURL(file)),
    };
    appendMessage(message);
    setText("");

    message.content.unshift(
      ...(await Promise.all<OpenAI.Responses.ResponseInputImage>(
        files.map(async (file) => {
          const openAiFile = await openai.files.create({
            file,
            purpose: "user_data",
          });
          return {
            type: "input_image",
            file_id: openAiFile.id,
            detail: "auto",
          };
        })
      ))
    );

    // Submit the question along with attached files
    setFiles([]);

    // Call OpenAI API to get a response
    try {
      const response = await openai.responses.create({
        model: "o3",
        input: [{ role: message.role, content: message.content }],
      });
      console.log({ response });
      appendMessage(response);
    } catch (error: unknown) {
      console.error("Error fetching response from OpenAI:", error);
      if (error instanceof Error) {
        appendMessage({
          role: "user",
          content: [{ type: "input_text", text: error.message || "Error occurred" }],
          images: [],
        });
      }
    }
    setStatus("idle");
  };

  return (
    <menu ref={ref} className="flex items-center gap-3 px-3 py-2" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="flex-1 flex-col rounded-2xl relative shadow-zinc-500 shadow-sm transition bg-popover border text-foreground focus-within:shadow-md focus-within:bg-accent">
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
            disabled={chatbotStatus === "thinking"}
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
          <button className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1">
            <Globe className="h-4 w-4" />
            Search
          </button>

          <button className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1">
            <Telescope className="h-4 w-4" />
            Deep research
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-sm text-muted min-h-6 min-w-6 leading-1"
            onClick={() => clearMessages()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <Button
        size="icon"
        className="rounded-full h-12 w-12"
        onClick={() => {
          setStatus(chatbotStatus === "idle" ? "thinking" : "idle");
          setTimeout(scrollToBottom, 100);
        }}
      >
        <Mic className="h-5 w-5" />
      </Button>
    </menu>
  );
};
