import { getMediaUrl, isProxyMediaUrl } from "@/lib/s3/media";

describe("getMediaUrl", () => {
  it("requests the clean presentation for existing cause images", () => {
    expect(
      getMediaUrl("uploads/causes/user/cause/images/portrait.jpg"),
    ).toBe(
      "/api/s3/image?key=uploads%2Fcauses%2Fuser%2Fcause%2Fimages%2Fportrait.jpg&presentation=clean-v3",
    );
  });

  it("does not transform unrelated media", () => {
    expect(getMediaUrl("uploads/profiles/user/images/avatar.jpg")).toBe(
      "/api/s3/image?key=uploads%2Fprofiles%2Fuser%2Fimages%2Favatar.jpg",
    );
  });
});

describe("isProxyMediaUrl", () => {
  it("marks S3 proxy and S3-hosted URLs as unoptimized", () => {
    expect(isProxyMediaUrl("/api/s3/image?key=uploads%2Fcauses%2Fx.jpg")).toBe(
      true,
    );
    expect(
      isProxyMediaUrl(
        "https://refreeg-media.s3.us-east-1.amazonaws.com/uploads/causes/x.jpg",
      ),
    ).toBe(true);
    expect(isProxyMediaUrl("/placeholder.svg")).toBe(false);
  });
});
