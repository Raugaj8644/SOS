'use client';
import { useState, useEffect, useCallback } from 'react';

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  error: string | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useGeolocation(watchMode = false): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: watchMode ? 0 : 30_000,
  };

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
    setError(null);
    setIsLoading(false);
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    setError(
      err.code === 1
        ? 'Location permission denied. Please enable GPS access.'
        : 'Unable to determine your location.',
    );
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setIsLoading(false);
      return;
    }

    if (watchMode) {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, options);
      return () => navigator.geolocation.clearWatch(id);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    }
  }, [watchMode]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      ...options,
      maximumAge: 0,
    });
  }, [onSuccess, onError]);

  return { position, error, isLoading, refresh };
}
