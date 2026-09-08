import {
  allocateUniqueCauseSlug,
  causePublicPath,
  shouldRefreshCauseSlug,
  slugifyCauseTitle,
} from "@/lib/causes/slug";

describe("lib/causes/slug", () => {
  describe("slugifyCauseTitle", () => {
    it("normalizes titles into kebab-case", () => {
      expect(slugifyCauseTitle("Help Flood Victims in Lagos!")).toBe(
        "help-flood-victims-in-lagos",
      );
    });

    it("strips accents and falls back for empty titles", () => {
      expect(slugifyCauseTitle("École Primaire")).toBe("ecole-primaire");
      expect(slugifyCauseTitle("   ")).toBe("cause");
    });
  });

  describe("allocateUniqueCauseSlug", () => {
    it("returns the base slug when available", async () => {
      const slug = await allocateUniqueCauseSlug("School Books", {
        isTaken: async () => false,
      });
      expect(slug).toBe("school-books");
    });

    it("adds numeric suffixes on collision", async () => {
      const taken = new Set(["school-books", "school-books-2"]);
      const slug = await allocateUniqueCauseSlug("School Books", {
        isTaken: async (candidate) => taken.has(candidate),
      });
      expect(slug).toBe("school-books-3");
    });
  });

  describe("shouldRefreshCauseSlug", () => {
    it("refreshes missing or auto-derived slugs", () => {
      expect(shouldRefreshCauseSlug(null, "Old Title")).toBe(true);
      expect(shouldRefreshCauseSlug("old-title", "Old Title")).toBe(true);
      expect(shouldRefreshCauseSlug("old-title-2", "Old Title")).toBe(true);
      expect(shouldRefreshCauseSlug("custom-brand", "Old Title")).toBe(false);
    });
  });

  describe("causePublicPath", () => {
    it("prefers slug over id", () => {
      expect(
        causePublicPath({ id: "uuid-1", slug: "help-flood-victims" }),
      ).toBe("/causes/help-flood-victims");
      expect(causePublicPath({ id: "uuid-1", slug: null })).toBe(
        "/causes/uuid-1",
      );
    });
  });
});
