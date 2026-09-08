import { findLegacyNormalizedCenterCrop } from "@/lib/media/legacy-normalized-image";

const makeImage = (
  pixel: (x: number, y: number) => [number, number, number],
) => {
  const width = 320;
  const height = 180;
  const channels = 3;
  const data = new Uint8Array(width * height * channels);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      const [red, green, blue] = pixel(x, y);
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
    }
  }

  return { data, width, height, channels };
};

describe("findLegacyNormalizedCenterCrop", () => {
  it("finds the sharp centered portrait in a legacy composite", () => {
    const image = makeImage((x, y) =>
      x >= 92 && x < 228
        ? [210, 85 + (y % 12), 35]
        : [18 + (y % 4), 34, 61],
    );

    expect(findLegacyNormalizedCenterCrop(image)).toEqual({
      left: 92,
      width: 136,
    });
  });

  it("leaves an ordinary landscape image unchanged", () => {
    const image = makeImage((x, y) => [
      Math.round((x / 319) * 180),
      Math.round((y / 179) * 160),
      90,
    ]);

    expect(findLegacyNormalizedCenterCrop(image)).toBeNull();
  });
});
