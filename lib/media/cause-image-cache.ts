import { createHash, randomBytes } from "crypto";
import { createReadStream } from "fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { Readable } from "stream";

/** Survives deploys: remote-deploy.sh keeps /mnt/data/refreeg/shared. */
export const CAUSE_IMAGE_CACHE_DIR =
  process.env.CAUSE_IMAGE_CACHE_DIR || "/mnt/data/refreeg/shared/image-cache";

function cachePaths(key: string) {
  const hash = createHash("sha256").update(key).digest("hex");
  return {
    image: path.join(CAUSE_IMAGE_CACHE_DIR, `${hash}.img`),
    meta: path.join(CAUSE_IMAGE_CACHE_DIR, `${hash}.meta`),
  };
}

export async function readCachedCauseImage(key: string): Promise<{
  body: ReadableStream;
  contentType: string;
} | null> {
  const { image, meta } = cachePaths(key);
  try {
    const [imageStat, metaStat] = await Promise.all([stat(image), stat(meta)]);
    if (!imageStat.isFile() || imageStat.size === 0 || !metaStat.isFile()) {
      return null;
    }
    const contentType = (await readFile(meta, "utf8")).trim();
    if (!contentType) return null;
    return {
      body: Readable.toWeb(createReadStream(image)) as ReadableStream,
      contentType,
    };
  } catch {
    return null;
  }
}

export async function writeCachedCauseImage(
  key: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  const { image, meta } = cachePaths(key);
  const suffix = randomBytes(8).toString("hex");
  const tempImage = `${image}.${suffix}.tmp`;
  const tempMeta = `${meta}.${suffix}.tmp`;

  await mkdir(CAUSE_IMAGE_CACHE_DIR, { recursive: true });
  try {
    await writeFile(tempImage, bytes);
    await writeFile(tempMeta, contentType);
    await rename(tempImage, image);
    await rename(tempMeta, meta);
  } catch (error) {
    await unlink(tempImage).catch(() => undefined);
    await unlink(tempMeta).catch(() => undefined);
    throw error;
  }
}
