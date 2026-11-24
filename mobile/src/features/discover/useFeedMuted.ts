import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'tung.feedMuted';

/** Feed videos play with sound by default; the choice is remembered across sessions. */
export function useFeedMuted() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((value) => {
      if (value !== null) setMuted(value === 'true');
    });
  }, []);

  const toggle = useCallback(() => {
    setMuted((current) => {
      AsyncStorage.setItem(KEY, String(!current));
      return !current;
    });
  }, []);

  return [muted, toggle] as const;
}
