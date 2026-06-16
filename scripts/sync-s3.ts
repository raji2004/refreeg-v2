import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_S3_CONFIG = {
  region: "us-east-1", // Update if different
  endpoint: "https://[PROJECT-ID].supabase.co/storage/v1/s3",
  credentials: {
    accessKeyId: "[SUPABASE-ACCESS-KEY]",
    secretAccessKey: "[SUPABASE-SECRET-KEY]",
  },
};

const AWS_S3_CONFIG = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};

const supabaseS3 = new S3Client(SUPABASE_S3_CONFIG);
const awsS3 = new S3Client(AWS_S3_CONFIG);

const SOURCE_BUCKET = "[SUPABASE-BUCKET-NAME]";
const TARGET_BUCKET = process.env.AWS_S3_BUCKET || "";

async function syncStorage() {
  console.log("🚀 Starting Storage Sync...");

  try {
    const listObjects = await supabaseS3.send(new ListObjectsV2Command({ Bucket: SOURCE_BUCKET }));
    
    if (!listObjects.Contents) {
      console.log("Empty bucket.");
      return;
    }

    for (const obj of listObjects.Contents) {
      if (!obj.Key) continue;

      console.log(`📦 Copying ${obj.Key}...`);

      const getObj = await supabaseS3.send(new GetObjectCommand({
        Bucket: SOURCE_BUCKET,
        Key: obj.Key
      }));

      const body = getObj.Body as Readable;

      await awsS3.send(new PutObjectCommand({
        Bucket: TARGET_BUCKET,
        Key: obj.Key,
        Body: await streamToBuffer(body),
        ContentType: getObj.ContentType
      }));
    }

    console.log("✅ Storage Sync Complete!");
  } catch (err) {
    console.error("❌ Sync failed:", err);
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

syncStorage();
