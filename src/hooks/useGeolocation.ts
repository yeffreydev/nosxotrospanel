import { useState } from 'react';

export interface GeoState {
  lat?: number;
  lng?: number;
  loading: boolean;
  error?: string;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ loading: false });

  const locate = () =>
    new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        const err = 'Geolocalización no disponible';
        setState({ loading: false, error: err });
        reject(new Error(err));
        return;
      }
      setState((s) => ({ ...s, loading: true, error: undefined }));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setState({ ...coords, loading: false });
          resolve(coords);
        },
        (err) => {
          setState({ loading: false, error: err.message });
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    });

  return { ...state, locate };
}
