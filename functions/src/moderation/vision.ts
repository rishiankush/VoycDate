import { GoogleAuth } from 'google-auth-library';

const ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

type Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';

type SafeSearch = { adult: Likelihood; racy: Likelihood; violence: Likelihood; medical: Likelihood; spoof: Likelihood };

type Face = {
  detectionConfidence: number;
  boundingPoly?: { vertices?: { x?: number; y?: number }[] };
};

export type ImageAnnotation = {
  faceAnnotations?: Face[];
  safeSearchAnnotation?: SafeSearch;
  error?: { message: string };
};

export type VisionImage = { content: string } | { source: { gcsImageUri: string } };

export async function annotateImages(images: VisionImage[], features: ('FACE_DETECTION' | 'SAFE_SEARCH_DETECTION')[]) {
  const client = await auth.getClient();
  const { data } = await client.request<{ responses: ImageAnnotation[] }>({
    url: ENDPOINT,
    method: 'POST',
    data: {
      requests: images.map((image) => ({
        image,
        features: features.map((type) => ({ type, maxResults: type === 'FACE_DETECTION' ? 3 : 1 })),
      })),
    },
  });
  data.responses.forEach((r) => {
    if (r.error) throw new Error(`Vision: ${r.error.message}`);
  });
  return data.responses;
}

const atLeast = (value: Likelihood | undefined, threshold: Likelihood) => {
  const order: Likelihood[] = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
  return order.indexOf(value ?? 'UNKNOWN') >= order.indexOf(threshold);
};

/** Explicit, violent or graphic content. Swimwear-level "racy" content is only rejected when very likely. */
export function isUnsafe(safe: SafeSearch | undefined) {
  if (!safe) return false;
  return (
    atLeast(safe.adult, 'LIKELY') ||
    atLeast(safe.violence, 'LIKELY') ||
    atLeast(safe.racy, 'VERY_LIKELY') ||
    atLeast(safe.medical, 'VERY_LIKELY')
  );
}

/** A confident face that takes up a meaningful part of the frame (not a tiny face in the background). */
export function hasClearFace(annotation: ImageAnnotation, frameWidth: number) {
  return (annotation.faceAnnotations ?? []).some((face) => {
    const xs = (face.boundingPoly?.vertices ?? []).map((v) => v.x ?? 0);
    const width = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    return face.detectionConfidence >= 0.7 && width >= frameWidth * 0.15;
  });
}
