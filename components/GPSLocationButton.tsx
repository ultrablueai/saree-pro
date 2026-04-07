"use client";

import { useEffect, useRef, useState } from "react";
import { ExclamationTriangleIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useLocalization } from "../hooks/useLocalization";

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
}

interface GPSLocationButtonProps {
  onLocationDetected: (location: LocationResult) => void | Promise<void>;
  className?: string;
  resolveAddress?: (location: LocationResult) => Promise<string | undefined> | string | undefined;
}

export function GPSLocationButton({
  onLocationDetected,
  className = "",
  resolveAddress,
}: GPSLocationButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, isRTL } = useLocalization();
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const location: LocationResult = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? undefined,
      };

      if (resolveAddress) {
        try {
          const address = await resolveAddress(location);
          if (address) {
            location.address = address;
          }
        } catch (resolveError) {
          console.warn("Address resolution failed:", resolveError);
        }
      }

      if (isMountedRef.current) {
        await onLocationDetected(location);
      }
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Please enable GPS access.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information unavailable.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("An unknown location error occurred.");
        }
      } else {
        setError("Failed to detect location.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={detectLocation}
        disabled={isLoading}
        className={`inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_38px_-24px_rgba(214,107,66,0.82)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 ${
          isRTL ? "flex-row-reverse" : ""
        }`}
      >
        {isLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <MapPinIcon className="h-5 w-5" />
        )}
        <span>{t("use_gps")}</span>
      </button>

      {error ? (
        <div
          className={`absolute top-full z-10 mt-2 max-w-xs rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 ${
            isRTL ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function useLocationTracking() {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startTracking = () => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? undefined,
        });
      },
      (error) => {
        console.error("Location tracking error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      },
    );

    watchIdRef.current = watchId;
    setIsTracking(true);
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    location,
    isTracking,
    startTracking,
    stopTracking,
  };
}
