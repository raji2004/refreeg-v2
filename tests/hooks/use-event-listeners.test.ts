import { renderHook } from "@testing-library/react";
import { useEventListeners } from "@/hooks/use-event-listeners";

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }
}

describe("useEventListeners", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    global.EventSource = MockEventSource as unknown as typeof EventSource;
  });

  it("opens an EventSource with userId when provided", () => {
    renderHook(() =>
      useEventListeners({
        userId: "user-1",
        onComment: jest.fn(),
      }),
    );

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe(
      `${window.location.origin}/api/events?userId=user-1`,
    );
  });

  it("dispatches comment events to onComment callback", () => {
    const onComment = jest.fn();
    renderHook(() => useEventListeners({ onComment }));

    const payload = {
      type: "comment",
      data: { id: "c-1" },
      timestamp: "2026-01-01T00:00:00Z",
    };
    MockEventSource.instances[0].onmessage?.({
      data: JSON.stringify(payload),
    } as MessageEvent);

    expect(onComment).toHaveBeenCalledWith(payload);
  });

  it("ignores ping events", () => {
    const onDonation = jest.fn();
    renderHook(() => useEventListeners({ onDonation }));

    MockEventSource.instances[0].onmessage?.({
      data: JSON.stringify({ type: "ping" }),
    } as MessageEvent);

    expect(onDonation).not.toHaveBeenCalled();
  });

  it("closes EventSource on unmount", () => {
    const { unmount } = renderHook(() => useEventListeners({}));
    const instance = MockEventSource.instances[0];

    unmount();

    expect(instance.close).toHaveBeenCalled();
  });
});
