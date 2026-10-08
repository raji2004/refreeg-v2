import { isOwnUploadKey } from "@/lib/s3/owned-key";

describe("isOwnUploadKey", () => {
  it("accepts a key in the user's own folder", () => {
    expect(
      isOwnUploadKey("uploads/profiles/u1/u1/images/a.jpg", "profiles", "u1"),
    ).toBe(true);
  });

  it("rejects another user's folder", () => {
    expect(
      isOwnUploadKey("uploads/profiles/u2/images/a.jpg", "profiles", "u1"),
    ).toBe(false);
  });

  it("does not treat a longer user id as a match", () => {
    expect(
      isOwnUploadKey("uploads/profiles/u10/images/a.jpg", "profiles", "u1"),
    ).toBe(false);
  });

  it("rejects the wrong entity type", () => {
    expect(
      isOwnUploadKey("uploads/causes/u1/images/a.jpg", "profiles", "u1"),
    ).toBe(false);
  });

  it("requires the entity id when one is given", () => {
    expect(
      isOwnUploadKey("uploads/causes/u1/c1/images/a.jpg", "causes", "u1", "c1"),
    ).toBe(true);
    expect(
      isOwnUploadKey("uploads/causes/u1/c2/images/a.jpg", "causes", "u1", "c1"),
    ).toBe(false);
  });

  it("rejects path traversal and non-strings", () => {
    expect(
      isOwnUploadKey("uploads/profiles/u1/../u2/a.jpg", "profiles", "u1"),
    ).toBe(false);
    expect(isOwnUploadKey(undefined, "profiles", "u1")).toBe(false);
    expect(isOwnUploadKey({}, "profiles", "u1")).toBe(false);
  });
});
