import { validateUpload } from "@/lib/s3/upload-policy";

const ok = {
  entityType: "causes",
  mediaType: "images",
  entityId: "0b6c1f2e-3a4d-4e5f-8a9b-0c1d2e3f4a5b",
  contentType: "image/jpeg",
  size: 200_000,
};

describe("validateUpload", () => {
  it("accepts a normal cause cover", () => {
    expect(validateUpload(ok)).toBeNull();
  });

  it("accepts uploads without an entityId", () => {
    expect(validateUpload({ ...ok, entityId: undefined })).toBeNull();
  });

  it("rejects script-capable image types", () => {
    expect(validateUpload({ ...ok, contentType: "image/svg+xml" })).toMatch(
      /Unsupported file type/,
    );
    expect(validateUpload({ ...ok, contentType: "text/html" })).toMatch(
      /Unsupported file type/,
    );
  });

  it("allows PDFs as documents but not as images", () => {
    expect(
      validateUpload({
        ...ok,
        mediaType: "documents",
        contentType: "application/pdf",
      }),
    ).toBeNull();
    expect(validateUpload({ ...ok, contentType: "application/pdf" })).toMatch(
      /Unsupported file type/,
    );
  });

  it("enforces size limits per media type", () => {
    expect(validateUpload({ ...ok, size: 11 * 1024 * 1024 })).toMatch(
      /exceeds 10MB/,
    );
    expect(validateUpload({ ...ok, size: 0 })).toBe("File is empty");
    expect(
      validateUpload({
        ...ok,
        mediaType: "videos",
        contentType: "video/mp4",
        size: 40 * 1024 * 1024,
      }),
    ).toBeNull();
  });

  it("rejects entityIds that would add path segments", () => {
    expect(validateUpload({ ...ok, entityId: "x/images/y" })).toBe(
      "Invalid entityId",
    );
    expect(validateUpload({ ...ok, entityId: "../other-user" })).toBe(
      "Invalid entityId",
    );
  });

  it("rejects unknown entity and media types", () => {
    expect(validateUpload({ ...ok, entityType: "admin" })).toBe(
      "Invalid entityType",
    );
    expect(validateUpload({ ...ok, mediaType: "scripts" })).toBe(
      "Invalid mediaType",
    );
    expect(validateUpload({ ...ok, mediaType: "constructor" })).toBe(
      "Invalid mediaType",
    );
  });
});
