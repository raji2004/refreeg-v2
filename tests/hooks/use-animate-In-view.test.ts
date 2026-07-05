import { renderHook } from "@testing-library/react";
import { useAnimateInView } from "@/hooks/use-animate-In-view";

const mockUseInView = jest.fn();

jest.mock("framer-motion", () => ({
  useInView: (...args: unknown[]) => mockUseInView(...args),
}));

describe("useAnimateInView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInView.mockReturnValue(false);
  });

  it("returns ref and isInView from framer-motion useInView", () => {
    mockUseInView.mockReturnValue(true);

    const { result } = renderHook(() => useAnimateInView());

    expect(result.current.ref).toEqual({ current: null });
    expect(result.current.isInView).toBe(true);
  });

  it("passes default options to useInView", () => {
    renderHook(() => useAnimateInView());

    expect(mockUseInView).toHaveBeenCalledWith(
      expect.objectContaining({ current: null }),
      { once: true, margin: "-100px" },
    );
  });

  it("passes custom options to useInView", () => {
    renderHook(() => useAnimateInView({ once: false, margin: "0px" }));

    expect(mockUseInView).toHaveBeenCalledWith(
      expect.objectContaining({ current: null }),
      { once: false, margin: "0px" },
    );
  });
});
