import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

import { storage } from './firebase';

// fetch(uri).blob() is unreliable for local files in React Native; XHR returns a real Blob.
function readBlob(uri: string) {
  return new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Could not read the file'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

type UploadOptions = {
  onProgress?: (fraction: number) => void;
  customMetadata?: Record<string, string>;
};

export async function uploadFile(
  uri: string,
  path: string,
  contentType: string,
  { onProgress, customMetadata }: UploadOptions = {},
) {
  const blob = await readBlob(uri);
  const fileRef = ref(storage, path);
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, blob, { contentType, customMetadata });
    task.on(
      'state_changed',
      (snap) => onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
      reject,
      () => resolve(),
    );
  });
  return { path, url: await getDownloadURL(fileRef) };
}

export async function deleteFile(path: string) {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    // Already gone or never finished uploading; the profile no longer references it either way.
  }
}
