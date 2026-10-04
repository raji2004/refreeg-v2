import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { buffer } from "stream/consumers";
import sharp from "sharp";

describe("cause image cache", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "cause-image-cache-"));
    process.env.CAUSE_IMAGE_CACHE_DIR = dir;
    jest.resetModules();
  });

  afterEach(async () => {
    delete process.env.CAUSE_IMAGE_CACHE_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it("serves a complete cached file and ignores a half-written image", async () => {
    const { readCachedCauseImage, writeCachedCauseImage } = await import(
      "@/lib/media/cause-image-cache"
    );
    const key = "uploads/causes/1/images/cover.jpg";
    const bytes = await sharp({
      create: {
        width: 40,
        height: 20,
        channels: 3,
        background: { r: 20, g: 80, b: 40 },
      },
    })
      .jpeg()
      .toBuffer();

    expect(await readCachedCauseImage(key)).toBeNull();

    await writeCachedCauseImage(key, bytes, "image/jpeg");
    const cached = await readCachedCauseImage(key);
    expect(cached?.contentType).toBe("image/jpeg");
    const body = await buffer(Readable.fromWeb(cached!.body as never));
    expect(Buffer.from(body).equals(bytes)).toBe(true);

    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(key).digest("hex");
    await writeFile(path.join(dir, `${hash}.img`), bytes);
    await rm(path.join(dir, `${hash}.meta`));
    expect(await readCachedCauseImage(key)).toBeNull();
  });
});