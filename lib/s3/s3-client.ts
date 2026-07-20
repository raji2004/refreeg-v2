import { S3Client } from "@aws-sdk/client-s3";

// Ensure AWS Region is available or fallback
const region = process.env.AWS_REGION || "us-east-1";

// Create and export the configured S3 client
// We rely on the default credential provider chain which will pick up
// EC2 IAM roles when running on the AWS instance.
//
// Disable flexible checksums so browser presigned PUTs stay compatible
// (SignedHeaders=host + Content-Type only — no x-amz-checksum-* query junk).
export const s3Client = new S3Client({
  region,
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});
