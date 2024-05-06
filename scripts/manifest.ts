import * as crypto from "crypto";
import * as dotenv from "dotenv";
import * as Minio from "minio";

dotenv.config();

const storageConfig = {
  endPoint: process.env.S3_ENDPOINT || "",
  port: +(process.env.S3_PORT || "80"),
  accessKey: process.env.S3_ACCESS_KEY || "",
  secretKey: process.env.S3_SECRET_KEY || "",
  useSSL: process.env.S3_USE_SSL === "true",
};

const minioClient = new Minio.Client(storageConfig);

const bucket = process.env.S3_BUCKET || "";

export type Manifest = {
  chainId: number;
  requesterAddress: string;
  exchangeName: string;
  token: string;
  fundAmount: string;
  duration: number;
  startBlock: number;
  endBlock: number;
  type: string;
};

export const uploadManifest = async (manifest: Manifest) => {
  if (!(await minioClient.bucketExists(bucket))) {
    throw new Error(`Bucket ${bucket} does not exist`);
  }

  const contentType = "application/json";

  const content = JSON.stringify(manifest);
  const hash = crypto.createHash("sha1").update(content).digest("hex");
  const key = `s3${hash}.json`;

  try {
    await minioClient.putObject(bucket, key, content, content.length, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });

    return {
      url: `${storageConfig.useSSL ? "https" : "http"}://${
        storageConfig.endPoint
      }:${storageConfig.port}/${bucket}/${key}`,
      hash,
    };
  } catch (e) {
    console.error(e);
    throw new Error("Failed to upload manifest");
  }
};
