"use client";

import { useState } from "react";
import { CheckCircle2, LocateFixed, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DeviceLocation } from "@/types/cause-types";

type DeviceLocationFieldProps = {
  value: string;
  invalid?: boolean;
  className?: string;
  onVerified: (location: string, deviceLocation: DeviceLocation) => void;
  onVerificationStarted?: () => void;
};

const geolocationErrorMessage = (error: GeolocationPositionError) => {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission was denied. Enable it in your browser settings and try again.";
    case error.POSITION_UNAVAILABLE:
      return "Your current location is unavailable. Check your device location settings and try again.";
    case error.TIMEOUT:
      return "The location request timed out. Please try again.";
    default:
      return "We could not get your current location. Please try again.";
  }
};

export function DeviceLocationField({
  value,
  invalid = false,
  className,
  onVerified,
  onVerificationStarted,
}: DeviceLocationFieldProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyLocation = () => {
    setError(null);
    onVerificationStarted?.();

    if (!window.isSecureContext) {
      setError("Location access requires a secure HTTPS connection.");
      return;
    }

    if (!navigator.geolocation) {
      setError("This browser does not support location access.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const deviceLocation: DeviceLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: Date.now(),
        };

        try {
          const response = await fetch("/api/locations/current", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(deviceLocation),
          });
          const result = (await response.json()) as {
            location?: string;
            error?: string;
          };

          if (!response.ok || !result.location) {
            throw new Error(result.error || "Unable to verify your location");
          }

          onVerified(result.location, deviceLocation);
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to verify your location",
          );
        } finally {
          setIsLocating(false);
        }
      },
      (positionError) => {
        setError(geolocationErrorMessage(positionError));
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15_000,
        maximumAge: 0,
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id="location"
          name="location"
          readOnly
          aria-invalid={invalid}
          placeholder="Verify your current location"
          value={value}
          className={cn(
            "cursor-default pl-10 pr-40",
            className,
            value && "border-emerald-300 bg-emerald-50/40",
            invalid && "border-red-500",
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={verifyLocation}
          disabled={isLocating}
          className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800"
        >
          {isLocating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : value ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <LocateFixed className="h-3.5 w-3.5" />
          )}
          {isLocating
            ? "Locating..."
            : value
              ? "Verify again"
              : "Use my location"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
