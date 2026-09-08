import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DeviceLocationField } from "@/components/device-location-field";

describe("DeviceLocationField", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    jest.restoreAllMocks();
  });

  it("asks the browser for location and returns the server-derived city", async () => {
    const getCurrentPosition = jest.fn((success) =>
      success({
        coords: { latitude: 6.5244, longitude: 3.3792, accuracy: 40 },
      }),
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ location: "Lagos, Lagos, Nigeria" }),
    } as Response);
    const onVerified = jest.fn();

    render(<DeviceLocationField value="" onVerified={onVerified} />);
    expect(screen.getByPlaceholderText(/Verify your current location/i)).toHaveAttribute(
      "readonly",
    );
    fireEvent.click(screen.getByRole("button", { name: /Use my location/i }));

    await waitFor(() =>
      expect(onVerified).toHaveBeenCalledWith(
        "Lagos, Lagos, Nigeria",
        expect.objectContaining({
          latitude: 6.5244,
          longitude: 3.3792,
          accuracy: 40,
        }),
      ),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/locations/current",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("explains how to recover when location permission is denied", async () => {
    const getCurrentPosition = jest.fn((_success, failure) =>
      failure({ code: 1, PERMISSION_DENIED: 1 }),
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(<DeviceLocationField value="" onVerified={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Use my location/i }));

    expect(
      await screen.findByText(/Location permission was denied/i),
    ).toBeVisible();
  });
});
