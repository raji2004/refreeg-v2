import { getMediaUrl } from "@/lib/s3/media";

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
