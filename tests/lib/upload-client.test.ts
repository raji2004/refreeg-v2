import { resolveMultimediaForSubmit } from "@/lib/s3/upload-client";

describe("resolveMultimediaForSubmit", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(async (url: string) => {
      if (url === "/api/s3/upload") {
        return {
          ok: true,
          json: async () => ({ key: "uploads/causes/entity-1/images/mock.jpg" }),
        };
      }
      return { ok: false };
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes existing S3 key strings through untouched", async () => {
    const existingKey = "uploads/causes/123/images/existing.jpg";
    const result = await resolveMultimediaForSubmit([existingKey], {
      entityType: "causes",
      entityId: "entity-1",
    });

    expect(result).toEqual([existingKey]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("uploads image Files and returns S3 keys", async () => {
    const imageFile = new File(["dummy content"], "photo.jpg", {
      type: "image/jpeg",
    });

    const result = await resolveMultimediaForSubmit([imageFile], {
      entityType: "causes",
      entityId: "entity-1",
    });

    expect(result).toEqual(["uploads/causes/entity-1/images/mock.jpg"]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/s3/upload",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uploads video Files and returns S3 keys", async () => {
    const videoFile = new File(["video stream"], "clip.mp4", {
      type: "video/mp4",
    });

    const result = await resolveMultimediaForSubmit([videoFile], {
      entityType: "causes",
      entityId: "entity-1",
    });

    expect(result).toEqual(["uploads/causes/entity-1/images/mock.jpg"]);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/s3/upload",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("handles a mix of existing strings, image Files, and video Files", async () => {
    const existingKey = "uploads/causes/123/images/existing.png";
    const imageFile = new File(["img"], "cam.webp", { type: "image/webp" });
    const videoFile = new File(["vid"], "tour.webm", { type: "video/webm" });

    const result = await resolveMultimediaForSubmit(
      [existingKey, imageFile, videoFile],
      {
        entityType: "causes",
        entityId: "entity-1",
      },
    );

    expect(result).toEqual([
      existingKey,
      "uploads/causes/entity-1/images/mock.jpg",
      "uploads/causes/entity-1/images/mock.jpg",
    ]);
  });
});
