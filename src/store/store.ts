import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type OpenAI from "openai";

export type InputMessage = OpenAI.Responses.ResponseInputItem.Message & { images: string[] };

export type MessageType = InputMessage | OpenAI.Responses.Response | Error;

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
        appendMessage: (value) => set({ messages: [...get().messages, value] }),
        clearMessages: () => set({ messages: [] }),
      };
    },
    {
      name: "message-storage", // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

export const isMessage = (
  item: OpenAI.Responses.ResponseInputItem.Message | OpenAI.Responses.Response | Error
): item is OpenAI.Responses.ResponseInputItem.Message => {
  return (item as OpenAI.Responses.ResponseInputItem.Message).role !== undefined;
};
