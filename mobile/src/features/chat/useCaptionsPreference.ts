import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'tung.captionsOn';

/** Remembers the chat captions switch across sessions; captions are on by default. */
export function useCaptionsPreference() {
  const [captionsOn, setCaptionsOn] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((value) => {
      if (value !== null) setCaptionsOn(value === 'true');
    });
  }, []);

  const update = useCallback((next: boolean) => {
    setCaptionsOn(next);
    AsyncStorage.setItem(KEY, String(next));
  }, []);

  return [captionsOn, update] as const;
}
