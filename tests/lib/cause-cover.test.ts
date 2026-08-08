import {
  readImageDimensions,
  validateCauseCoverImage,
  validateCauseGalleryImage,
} from "@/lib/media/cause-cover";

function createPngHeader(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

function createImageFile(bytes: Uint8Array, type = "image/png") {
  return {
    type,
    arrayBuffer: async () => bytes.slice().buffer as ArrayBuffer,
  };
}

describe("cause cover validation", () => {
  it("reads PNG dimensions", () => {
    expect(readImageDimensions(createPngHeader(1600, 900))).toEqual({
      width: 1600,
      height: 900,
    });
  });

  it.each([
    [1280, 720],
    [1600, 900],
    [1920, 1080],
    [3840, 2160],
  ])("accepts a %i by %i cropped cover", async (width, height) => {
    await expect(
      validateCauseCoverImage(createImageFile(createPngHeader(width, height))),
    ).resolves.toBeNull();
  });

  it("rejects portrait images", async () => {
    await expect(
      validateCauseCoverImage(createImageFile(createPngHeader(4446, 6669))),
    ).resolves.toContain("must be cropped to 16:9");
  });

  it("rejects square images", async () => {
    await expect(
      validateCauseCoverImage(createImageFile(createPngHeader(1200, 1200))),
    ).resolves.toContain("must be cropped to 16:9");
  });

  it("rejects a cover that has not completed the crop step", async () => {
    await expect(
      validateCauseCoverImage(createImageFile(createPngHeader(5979, 3986))),
    ).resolves.toContain("must be cropped to 16:9");
  });

  it("allows portrait gallery images", async () => {
    await expect(
      validateCauseGalleryImage(createImageFile(createPngHeader(3000, 4499))),
    ).resolves.toBeNull();
  });

  it("rejects unreadable image data", async () => {
    await expect(
      validateCauseCoverImage(createImageFile(new Uint8Array([1, 2, 3]))),
    ).resolves.toContain("Could not read the cover image");
  });

  it("rejects unsupported image types", async () => {
    await expect(
      validateCauseCoverImage(
        createImageFile(createPngHeader(1600, 900), "image/gif"),
      ),
    ).resolves.toBe("Cover image must be a JPG, PNG, or WebP file.");
  });
});
