import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type OpenAI from "openai";
import type { ReactNode } from "react";

export type ErrorMessage = { error: string };
export type MessageType = OpenAI.Responses.ResponseInputItem.Message | OpenAI.Responses.Response | ErrorMessage;
type ChatbotStatus = "uploading" | "thinking" | "thinking-slowly" | "drag-n-drop" | "idle";

let timeoutRef: NodeJS.Timeout | null = null;

interface MessageStore {
  chatbotStatus: ChatbotStatus;
  messages: MessageType[];
  showSlowWarning: boolean;
  appendMessage: (input: MessageType) => void;
  clearMessages: () => void;
  setChatbotStatus: (status: ChatbotStatus) => void;
}

export const dedupeFilter = <T>(f: T, i: number, fs: T[]): boolean => {
  return fs.indexOf(f) === i;
};
export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => {
      return {
        /** State data */
        messages: [],
        chatbotStatus: "idle",
        showSlowWarning: false,
        setChatbotStatus: (status: ChatbotStatus) => {
          set({ showSlowWarning: false });

          if (timeoutRef) {
            clearTimeout(timeoutRef);
          }
          if (status === "thinking") {
            timeoutRef = setTimeout(() => {
              set({ showSlowWarning: true });
            }, 3000);
          }

          set({ chatbotStatus: status });
        },

        /** Append a new message */
        appendMessage: (input) => {
          const isInput = messageIsInput(input);

          // Append request
          set({
            messages: [...get().messages, input].filter(dedupeFilter),
            chatbotStatus: isInput ? "thinking" : "idle",
          });

          // If it's an input message, call the API
          if (isInput) {
            fetch(`/api/chat`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ input: [input] }),
            })
              .then((res) => res.json())
              .then((data) => {
                set({ messages: [...get().messages, data].filter(dedupeFilter), chatbotStatus: "idle" });
              })
              .catch((error) => {
                console.error("Error:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                set({
                  messages: [...get().messages, { error: errorMessage }].filter(dedupeFilter),
                  chatbotStatus: "idle",
                });
              });
          }
        },

        /** Clear all messages */
        clearMessages: () => set({ messages: [], chatbotStatus: "idle" }),
      };
    },
    {
      name: "message-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export const messageIsInput = (item: MessageType): item is OpenAI.Responses.ResponseInputItem.Message => {
  return (item as OpenAI.Responses.ResponseInputItem.Message).role !== undefined;
};

export const messageIsError = (item: MessageType): item is ErrorMessage => {
  return typeof (item as ErrorMessage).error === "string";
};

export const messageIsResponse = (item: MessageType): item is OpenAI.Responses.Response => {
  return !messageIsInput(item) && !messageIsError(item);
};

export const extractTextFromMessage = (message: MessageType): ReactNode => {
  if (messageIsInput(message)) {
    return message.content
      .map((c) => c.type === "input_text" && c.text)
      .filter(Boolean)
      .join("\n");
  } else if (messageIsError(message)) {
    return message.error;
  } else {
    return (
      message.output_text ||
      message.output
        .filter(
          (o) =>
            (o as OpenAI.Responses.ResponseOutputMessage)?.content.some(
              (c) => (c as OpenAI.Responses.ResponseOutputText)?.text
            ) !== undefined
        )
        .map((o) =>
          (o as OpenAI.Responses.ResponseOutputMessage)?.content.map(
            (c) => (c as OpenAI.Responses.ResponseOutputText)?.text
          )
        )
        .join("/n")
    );
  }
};
