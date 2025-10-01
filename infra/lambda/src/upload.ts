import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { HandlerType } from "./server.js";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const uploadBucket = process.env.VITE_BUCKET_NAME;
const URL_EXPIRATION_SECONDS = 30000;

// Main Lambda entry point
export const upload: HandlerType = async function (event) {
  const body: { files: File[] } = event.body ? JSON.parse(event.body) : {};
  const { files } = body;

  const presignedUrls = await Promise.all(
    files.map(async (file) => {
      const command = new PutObjectCommand({
        Bucket: uploadBucket,
        Key: `chatbot/upload/${file.name}`,
        ContentType: file.type,
      });
      const signedUrl = await getSignedUrl(s3, command, {
        expiresIn: URL_EXPIRATION_SECONDS,
      });

      return signedUrl;
    })
  );

  return {
    statusCode: 200,
    isBase64Encoded: false,
    headers: {
      Expires: URL_EXPIRATION_SECONDS,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ presignedUrls }),
  };
};
