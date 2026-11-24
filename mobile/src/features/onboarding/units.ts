import { getLocales } from 'expo-localization';

export const usesImperial = () => {
  const system = getLocales()[0]?.measurementSystem;
  return system === 'us' || system === 'uk';
};

export function formatHeight(cm: number, imperial = usesImperial()) {
  if (!imperial) return `${cm} cm`;
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}′ ${totalInches % 12}″`;
}

/** Always kilometres — VOYC is India-first; don’t follow the device’s imperial setting. */
export function formatDistance(km: number) {
  return `${Math.round(km)} km`;
}
