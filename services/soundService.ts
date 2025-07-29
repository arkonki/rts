
import { UnitType } from "../types";

export type SoundEffect =
  | 'click'
  | 'place_building'
  | 'unit_ready'
  | 'construction_complete'
  | 'insufficient_funds'
  | 'explosion_small'
  | 'explosion_large'
  | 'move_confirm_1'
  | 'move_confirm_2'
  // Superweapons
  | 'superweapon_ready'
  | 'chrono_teleport'
  | 'nuke_launch'
  // Unit attack sounds
  | 'attack_rifleman'
  | 'attack_tesla'
  | 'attack_tank'
  | 'attack_prism'
  | 'attack_apoc'
  | 'attack_rocketeer'
  | 'attack_jet'
  | 'attack_kirov'
  | 'attack_destroyer'
  | 'attack_scorpion';

// IMPORTANT: These are placeholder paths. You will need to provide your own sound files
// and place them in a '/public/sounds' directory (or similar) for them to be accessible.
const soundFiles: Record<SoundEffect, string> = {
    click: '/sounds/click.wav',
    place_building: 'https://maantoa.ee/audio/place_building.waw',
    unit_ready: 'https://maantoa.ee/audio/unit-reporting.mp3',
    construction_complete: '/sounds/construction_complete.mp3',
    insufficient_funds: '/sounds/insufficient_funds.mp3',
    explosion_small: 'https://maantoa.ee/audio/explosion.mp3',
    explosion_large: 'https://maantoa.ee/audio/explosion-large.mp3',
    move_confirm_1: 'https://maantoa.ee/audio/moving.mp3',
    move_confirm_2: 'https://maantoa.ee/audio/movin-out.mp3',
    superweapon_ready: '/sounds/superweapon_ready.mp3',
    chrono_teleport: '/sounds/chrono_teleport.mp3',
    nuke_launch: '/sounds/nuke_launch.mp3',
    attack_rifleman: '/sounds/attack_rifleman.wav',
    attack_tesla: '/sounds/attack_tesla.wav',
    attack_tank: '/sounds/attack_tank.wav',
    attack_prism: '/sounds/attack_prism.wav',
    attack_apoc: '/sounds/attack_apoc.wav',
    attack_rocketeer: '/sounds/attack_rocketeer.wav',
    attack_jet: '/sounds/attack_jet.wav',
    attack_kirov: '/sounds/attack_kirov.wav',
    attack_destroyer: '/sounds/attack_destroyer.wav',
    attack_scorpion: '/sounds/attack_scorpion.wav',
};

export const unitAttackSounds: Partial<Record<UnitType, SoundEffect>> = {
    [UnitType.RIFLEMAN]: 'attack_rifleman',
    [UnitType.TESLA_TROOPER]: 'attack_tesla',
    [UnitType.TANK]: 'attack_tank',
    [UnitType.PRISM_TANK]: 'attack_prism',
    [UnitType.APOCALYPSE_TANK]: 'attack_apoc',
    [UnitType.ROCKETEER]: 'attack_rocketeer',
    [UnitType.FIGHTER_JET]: 'attack_jet',
    [UnitType.KIROV_AIRSHIP]: 'attack_kirov',
    [UnitType.DESTROYER]: 'attack_destroyer',
    [UnitType.SEA_SCORPION]: 'attack_scorpion',
};


class SoundService {
    private audioCache: Partial<Record<SoundEffect, HTMLAudioElement>> = {};
    private isInitialized = false;
    private areSoundsPreloaded = false;

    // This method needs to be called after a user interaction to enable audio playback.
    public init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("Sound service initialized and ready for playback.");
    }

    // This method will preload all audio files and can be called on app load.
    public preloadSounds(onProgress?: (progress: number) => void): Promise<void> {
        if (this.areSoundsPreloaded) {
            onProgress?.(100);
            return Promise.resolve();
        }
        
        return new Promise((resolve) => {
            const soundKeys = Object.keys(soundFiles) as SoundEffect[];
            let loadedCount = 0;
            const totalSounds = soundKeys.length;
            let resolved = false;

            const resolvePromise = () => {
                if (!resolved) {
                    resolved = true;
                    this.areSoundsPreloaded = true;
                    onProgress?.(100); // Make sure progress is 100%
                    console.log("Sound preloading finished (might be due to timeout or completion).");
                    resolve();
                }
            };
            
            // Fallback timeout in case some assets fail to load or get stuck.
            const timeoutId = setTimeout(() => {
                console.warn("Sound preloading took too long. Proceeding anyway.");
                resolvePromise();
            }, 15000); // 15 seconds

            if (totalSounds === 0) {
                clearTimeout(timeoutId);
                resolvePromise();
                return;
            }

            const soundLoaded = () => {
                loadedCount++;
                onProgress?.((loadedCount / totalSounds) * 100);
                if (loadedCount === totalSounds) {
                    clearTimeout(timeoutId);
                    resolvePromise();
                }
            };
            
            soundKeys.forEach(key => {
                const audio = new Audio(soundFiles[key]);
                this.audioCache[key] = audio;
                
                audio.addEventListener('canplaythrough', () => soundLoaded(), { once: true });
                audio.addEventListener('error', () => {
                    console.warn(`Failed to load sound: ${key} at ${soundFiles[key]}`);
                    soundLoaded(); // Count it as "loaded" to not block the app.
                });
                audio.load();
            });
        });
    }

    public play(sound: SoundEffect, volume = 0.5) {
        if (!this.isInitialized) {
            console.warn(`Sound service not initialized. Call init() on first user interaction.`);
            return;
        }
        const audio = this.audioCache[sound];
        if (audio) {
            // Cloning the node allows for playing the same sound multiple times simultaneously.
            const newAudioInstance = audio.cloneNode() as HTMLAudioElement;
            newAudioInstance.volume = volume;
            newAudioInstance.play().catch(e => { 
                // Autoplay errors are common before user interaction, fail silently.
                // The first user-initiated play should succeed and unlock audio.
            });
        } else {
            console.warn(`Sound not found in cache: ${sound}`);
        }
    }
}

export const soundService = new SoundService();
