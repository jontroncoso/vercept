import OpenAi from "openai";
import type { HandlerType } from "./server.js";
if (!process.env.VITE_OPENAI_API_KEY) {
  throw new Error(`VITE_OPENAI_API_KEY is not set ${JSON.stringify(process.env)}`);
}

const openai = new OpenAi({
  apiKey: process.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export const chat: HandlerType = async (event) => {
  const body = event.body ? JSON.parse(event.body) : {};
  try {
    const response = await openai.responses.create({
      ...body,
      model: "o3",
    });
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error:", { body: JSON.stringify(body), error });
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Error occurred",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
