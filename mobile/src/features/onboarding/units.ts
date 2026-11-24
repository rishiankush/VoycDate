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

const KM_PER_MILE = 1.609344;

export function formatDistance(km: number, imperial = usesImperial()) {
  return imperial ? `${Math.round(km / KM_PER_MILE)} mi` : `${Math.round(km)} km`;
}
