import { httpsCallable } from 'firebase/functions';

import { functions } from '@/lib/firebase';

const requestDataExportFn = httpsCallable<Record<string, never>, { export: unknown }>(functions, 'requestDataExport');
const deleteAccountFn = httpsCallable<Record<string, never>, { ok: boolean }>(functions, 'deleteAccount');

export const requestDataExport = async () => (await requestDataExportFn({})).data.export;
export const deleteAccount = () => deleteAccountFn({});
