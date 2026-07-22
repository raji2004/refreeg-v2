import { renderHook, act } from "@testing-library/react";
import { useToast, toast } from "@/hooks/use-toast";

describe("useToast", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.toasts.forEach((t) => result.current.dismiss(t.id));
    });
  });

  it("adds a toast to state when toast() is called", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Hello", description: "World" });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: "Hello",
      description: "World",
      open: true,
    });
  });

  it("marks toast as closed when dismiss() is called", () => {
    const { result } = renderHook(() => useToast());
    let toastId = "";

    act(() => {
      const created = toast({ title: "Dismiss me" });
      toastId = created.id;
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
