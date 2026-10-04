/**
 * @jest-environment node
 */
jest.mock("sharp", () => {
  const fn: any = jest.fn();
  fn.cache = jest.fn();
  fn.concurrency = jest.fn();
  return { __esModule: true, default: fn };
});
jest.mock("@/lib/s3/s3-client", () => ({ s3Client: { send: jest.fn() } }));
jest.mock("@/lib/media/cause-image-cache", () => ({
  readCachedCauseImage: jest.fn(),
  writeCachedCauseImage: jest.fn(),
}));

import {
  isCauseImageKey,
  normalizeMediaKey,
  warmCauseImage,
} from "@/lib/media/cause-image-render";
import { readCachedCauseImage } from "@/lib/media/cause-image-cache";

const KEY = "uploads/causes/user-1/cause-1/images/abc_cover.jpg";

describe("normalizeMediaKey", () => {
  it("passes bare keys through", () => {
    expect(normalizeMediaKey(KEY)).toBe(KEY);
  });

  it("unwraps proxy URLs, encoded or not", () => {
    const proxied = `/api/s3/image?key=${encodeURIComponent(KEY)}`;
    expect(normalizeMediaKey(proxied)).toBe(KEY);
    expect(normalizeMediaKey(encodeURIComponent(proxied))).toBe(KEY);
  });
});

describe("isCauseImageKey", () => {
  it("only matches cause images", () => {
    expect(isCauseImageKey(KEY)).toBe(true);
    expect(isCauseImageKey("uploads/causes/u/c/videos/a.mp4")).toBe(false);
    expect(isCauseImageKey("uploads/profiles/u/images/a.jpg")).toBe(false);
  });
});

describe("warmCauseImage", () => {
  it("skips empty and non-cover values", async () => {
    await expect(warmCauseImage(null)).resolves.toBe("skipped");
    await expect(
      warmCauseImage("uploads/profiles/u/images/a.jpg"),
    ).resolves.toBe("skipped");
  });

  it("does not render covers that are already cached", async () => {
    const cancel = jest.fn();
    (readCachedCauseImage as jest.Mock).mockResolvedValue({
      body: { cancel },
      contentType: "image/jpeg",
    });

    await expect(warmCauseImage(KEY)).resolves.toBe("cached");
    expect(cancel).toHaveBeenCalled();
  });
});
