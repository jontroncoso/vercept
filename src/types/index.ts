export type Message = {
  role: "user" | "assistant";
  content: string;
  images: string[];
};
