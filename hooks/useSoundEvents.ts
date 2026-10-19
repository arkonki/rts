import { useEffect, useRef } from 'react';
import { SoundEvent } from '../types';
import { soundService } from '../services/soundService';

/**
 * Plays sounds the simulation queued in state.soundEvents. The reducer stays pure; this is the
 * only place those events turn into audio. Events are deduped by their monotonic id.
 */
export function useSoundEvents(soundEvents: SoundEvent[]) {
  const lastPlayedId = useRef(0);

  useEffect(() => {
    for (const event of soundEvents) {
      if (event.id > lastPlayedId.current) {
        lastPlayedId.current = event.id;
        soundService.play(event.sound, event.volume);
      }
    }
  }, [soundEvents]);
}
