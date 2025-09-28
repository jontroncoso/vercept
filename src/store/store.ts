import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type OpenAI from "openai";
import type { ReactNode } from "react";

export type InputMessage = OpenAI.Responses.ResponseInputItem.Message & { images: string[] };
export type ErrorMessage = { error: string };
export type MessageType = InputMessage | OpenAI.Responses.Response | ErrorMessage;

interface MessageStore {
  messages: MessageType[];
  appendMessage: (value: MessageType) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageStore>()(
  persist(
    (set, get) => {
      return {
        messages: [],

        /** Append a new message */
        appendMessage: (value) =>
          set({
            messages: [...get().messages, value].filter((f: MessageType, i: number, fs: MessageType[]): boolean => {
              return fs.findIndex((t) => t === f) === i;
            }),
          }),
        clearMessages: () => set({ messages: [] }),
      };
    },
    {
      name: "message-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export const messageIsInput = (item: MessageType): item is InputMessage => {
  return (item as OpenAI.Responses.ResponseInputItem.Message).role !== undefined;
};

export const messageIsError = (item: MessageType): item is ErrorMessage => {
  return typeof (item as ErrorMessage).error === "string";
};

export const messageIsResponse = (item: MessageType): item is OpenAI.Responses.Response => {
  return !messageIsInput(item) && !messageIsError(item);
};

export const extractTextFromMessage = (message: MessageType): ReactNode => {
  // {!messageIsInput(message)
  //   ? messageIsError(message)
  //     ? message.error
  //     : message.output_text.split("\n").map((line, i) => <p key={i}>{line}</p>)
  //   : message.content
  //       .map((c) => c.type === "input_text" && c.text)
  //       .filter(Boolean)
  //       .map((m, i) => <p key={i}>{m}</p>)}

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
