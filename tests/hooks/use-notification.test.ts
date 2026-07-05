jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

import { renderHook, act, waitFor } from "@testing-library/react";
import { toast } from "@/components/ui/use-toast";
import { useNotifications } from "@/hooks/use-notification";

const mockToast = toast as jest.Mock;

describe("useNotifications", () => {
  const originalNotification = global.Notification;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.Notification = originalNotification;
  });

  it("detects notification support on mount", async () => {
    class MockNotification {
      static permission: NotificationPermission = "default";
      static requestPermission = jest.fn().mockResolvedValue("granted");
    }
    global.Notification = MockNotification as unknown as typeof Notification;

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.isSupported).toBe(true));
    expect(result.current.permission).toBe("default");
  });

  it("falls back to toast when notifications are unsupported", () => {
    // @ts-expect-error simulate missing Notification API
    delete global.Notification;

    const { result } = renderHook(() => useNotifications());

    act(() => {
      result.current.showNotification("Hello", { body: "World" });
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: "Hello",
      description: "World",
    });
  });

  it("requests permission and shows a notification when granted", async () => {
    const notificationCtor = jest.fn();
    class MockNotification {
      static permission: NotificationPermission = "default";
      static requestPermission = jest.fn().mockResolvedValue("granted");

      constructor(title: string, options?: NotificationOptions) {
        notificationCtor(title, options);
      }
    }
    global.Notification = MockNotification as unknown as typeof Notification;

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => expect(result.current.isSupported).toBe(true));

    act(() => {
      result.current.showNotification("Alert", { body: "Details" });
    });

    await waitFor(() =>
      expect(MockNotification.requestPermission).toHaveBeenCalled(),
    );
    expect(notificationCtor).toHaveBeenCalledWith("Alert", { body: "Details" });
  });
});
