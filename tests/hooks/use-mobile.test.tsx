import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "@/hooks/use-mobile";

describe("useIsMobile", () => {
  const MOBILE_BREAKPOINT = 768;
  let changeHandler: (() => void) | null = null;

  beforeEach(() => {
    changeHandler = null;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
      media: query,
      addEventListener: jest.fn((_event: string, handler: () => void) => {
        changeHandler = handler;
      }),
      removeEventListener: jest.fn(),
    }));
  });

  it("returns true when innerWidth is below breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("returns false when innerWidth is at or above breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("updates when matchMedia change event fires", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 400,
    });

    act(() => {
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });
});
