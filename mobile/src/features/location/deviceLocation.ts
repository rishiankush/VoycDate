import * as Location from 'expo-location';
import { geohashForLocation } from 'geofire-common';

import type { ProfileLocation } from '@/features/onboarding/types';

// Two decimal places is roughly 1 km, so the stored point never pinpoints where someone lives.
const coarse = (n: number) => Math.round(n * 100) / 100;

export function toProfileLocation(
  coords: { latitude: number; longitude: number },
  place: Location.LocationGeocodedAddress | undefined,
  source: ProfileLocation['source'],
  fallbackCity = '',
): ProfileLocation {
  const lat = coarse(coords.latitude);
  const lng = coarse(coords.longitude);
  return {
    city: place?.city ?? place?.subregion ?? place?.district ?? place?.region ?? fallbackCity,
    region: place?.region ?? null,
    country: place?.country ?? null,
    countryCode: place?.isoCountryCode ?? null,
    geohash: geohashForLocation([lat, lng]),
    lat,
    lng,
    source,
  };
}

export function placeLabel(location: ProfileLocation) {
  const tail = location.countryCode === 'US' ? location.region : location.country;
  return [location.city, tail].filter(Boolean).join(', ');
}

/** Reads the device GPS (simulator or phone) and returns a coarse profile location. */
export async function readDeviceLocation(): Promise<ProfileLocation> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('LOCATION_DENIED');
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const [place] = await Location.reverseGeocodeAsync(position.coords);
  return toProfileLocation(position.coords, place, 'device');
}
