import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ImageUpload } from "@/components/ui/image-upload";

describe("ImageUpload required crop", () => {
  const originalImage = window.Image;
  const originalResizeObserver = global.ResizeObserver;

  beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    class LoadedImage {
      naturalWidth = 3000;
      naturalHeight = 4499;
      width = 3000;
      height = 4499;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    Object.defineProperty(window, "Image", {
      configurable: true,
      writable: true,
      value: LoadedImage,
    });
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    Object.defineProperty(window, "Image", {
      configurable: true,
      writable: true,
      value: originalImage,
    });
  });

  it("always opens the recommended crop and removes the original-file bypass", async () => {
    const onUpload = jest.fn();
    const { container } = render(
      <ImageUpload
        onUpload={onUpload}
        maxFiles={1}
        cropRequired
        cropAspect={16 / 9}
        cropOutputWidth={1600}
        cropOutputHeight={900}
      />,
    );

    const input = container.querySelector("input[type='file']");
    expect(input).not.toBeNull();

    fireEvent.change(input!, {
      target: {
        files: [new File(["photo"], "portrait.jpg", { type: "image/jpeg" })],
      },
    });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/recommended 1600 × 900 px output/i)).toBeVisible();
    const coverSelection = document.querySelector<HTMLElement>(
      "[data-crop-selection='fixed-aspect']",
    );
    expect(coverSelection).not.toBeNull();
    expect(parseFloat(coverSelection!.style.width)).toBeCloseTo(
      parseFloat(coverSelection!.style.height),
    );
    expect(
      screen.getByText(/drag the frame to position the crop/i),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Apply recommended crop" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Use Original" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(onUpload).not.toHaveBeenCalled());
  });

  it("offers a crop step for each image in a mixed multimedia batch", async () => {
    const onUpload = jest.fn();
    const { container } = render(
      <ImageUpload
        onUpload={onUpload}
        maxFiles={5}
        enableCrop
        cropAspect={16 / 9}
        cropOutputWidth={1600}
        cropOutputHeight={900}
        accept={{
          "image/jpeg": [".jpg", ".jpeg"],
          "video/mp4": [".mp4"],
        }}
      />,
    );

    const firstImage = new File(["first"], "first.jpg", {
      type: "image/jpeg",
    });
    const video = new File(["video"], "clip.mp4", { type: "video/mp4" });
    const secondImage = new File(["second"], "second.jpg", {
      type: "image/jpeg",
    });
    const input = container.querySelector("input[type='file']");

    fireEvent.change(input!, {
      target: { files: [firstImage, video, secondImage] },
    });

    expect(await screen.findByText("Crop Image 1 of 2")).toBeVisible();
    const gallerySelection = document.querySelector<HTMLElement>(
      "[data-crop-selection='fixed-aspect']",
    );
    expect(gallerySelection).not.toBeNull();
    expect(parseFloat(gallerySelection!.style.width)).toBeCloseTo(
      parseFloat(gallerySelection!.style.height),
    );
    fireEvent.click(screen.getByRole("button", { name: "Use Original" }));

    expect(await screen.findByText("Crop Image 2 of 2")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Use Original" }));

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([firstImage, video, secondImage]);
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
