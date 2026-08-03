import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { ImageLightbox } from "@/components/ImageLightbox";

function LightboxHarness() {
  const [index, setIndex] = useState<number | null>(0);

  return (
    <ImageLightbox
      images={[
        { src: "/api/s3/image?key=proof-first", alt: "Enlarged proof 1" },
        { src: "/api/s3/image?key=proof-second", alt: "Enlarged proof 2" },
      ]}
      currentIndex={index}
      onIndexChange={setIndex}
      onClose={() => setIndex(null)}
      label="Latest campaign proof"
    />
  );
}

describe("ImageLightbox", () => {
  it("navigates proof images and closes with Escape", () => {
    render(<LightboxHarness />);

    expect(
      screen.getByRole("dialog", { name: "Latest campaign proof" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Enlarged proof 1")).toBeInTheDocument();
    expect(document.body).toHaveAttribute("data-media-lightbox-open", "true");

    fireEvent.click(
      screen.getByRole("button", { name: "Show next enlarged image" }),
    );
    expect(screen.getByAltText("Enlarged proof 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body).not.toHaveAttribute("data-media-lightbox-open");
  });
});
