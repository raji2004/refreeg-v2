import { fireEvent, render, screen } from "@testing-library/react";
import MultimediaCarousel from "@/components/MultimediaCarousel";

describe("MultimediaCarousel image lightbox", () => {
  it("shows an original image once against a neutral backdrop", () => {
    const { container } = render(
      <MultimediaCarousel
        media={["gallery/portrait.jpg"]}
        title="Portrait fundraiser"
      />,
    );

    expect(screen.getByAltText("Portrait fundraiser - Image 1")).toHaveClass(
      "object-contain",
    );
    expect(
      container.querySelector("[data-media-backdrop='decorative']"),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("img[src*='logo.svg']")).toHaveLength(2);
    expect(
      container.querySelector("img[aria-hidden='true'][src*='portrait.jpg']"),
    ).toBeNull();
  });

  it("fills the campaign frame with the cover image", () => {
    render(
      <MultimediaCarousel
        media={["gallery/photo.jpg"]}
        coverImage="cover/landscape.jpg"
        title="Landscape fundraiser"
      />,
    );

    expect(screen.getByAltText("Landscape fundraiser - Image 1")).toHaveClass(
      "object-cover",
    );
    expect(screen.getByAltText("Landscape fundraiser - Image 2")).toHaveClass(
      "object-contain",
    );
  });

  it("enlarges an image and supports keyboard navigation and closing", () => {
    render(
      <MultimediaCarousel
        media={["gallery/first.jpg", "gallery/second.jpg"]}
        title="Community fundraiser"
      />,
    );

    fireEvent.click(
      screen.getByAltText("Community fundraiser - Image 1"),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Enlarge image 1 of 2" }),
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByAltText("Community fundraiser - Enlarged image 1"),
    ).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflow: "hidden" });
    expect(document.body).toHaveAttribute("data-media-lightbox-open", "true");

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(
      screen.getByAltText("Community fundraiser - Enlarged image 2"),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(document.body).not.toHaveAttribute("data-media-lightbox-open");
  });

  it("closes the enlarged image from its close button", () => {
    render(
      <MultimediaCarousel
        media={["gallery/photo.jpg"]}
        title="School supplies"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Enlarge image 1 of 1" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Close enlarged image" }),
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
