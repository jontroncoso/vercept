import "dotenv/config"; // or import { config } from 'dotenv'; config();
import express from "express";
import { chat } from "./chat.js";
import { upload } from "./upload.js";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
const app = express();
app.use(express.json());
export type HandlerType = (event: Partial<APIGatewayProxyEvent>) => Promise<APIGatewayProxyResult>;

app.post("/api/chat", async (req, res) => {
  const response = await chat({ body: JSON.stringify(req.body) });
  return res
    .status(response.statusCode || 500)
    .set(response.headers || {})
    .send(response.body);
});

app.post("/api/upload", async (req, res) => {
  const response = await upload({ body: JSON.stringify(req.body) });
  return res
    .status(response.statusCode || 500)
    .set(response.headers || {})
    .send(response.body);
});

app.listen(3000, () => console.info("API on :3000"));
