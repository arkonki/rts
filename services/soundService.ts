
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
    place_building: '/sounds/place_building.mp3',
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

    public init() {
        if (this.isInitialized) return;
        
        // Use a single user interaction to unlock the AudioContext
        const unlockAudio = () => {
            Object.keys(soundFiles).forEach(key => {
                const soundName = key as SoundEffect;
                const audio = new Audio(soundFiles[soundName]);
                audio.load();
                this.audioCache[soundName] = audio;
            });
            this.isInitialized = true;
            console.log("Sound service initialized and audio unlocked.");
            // Clean up the event listener once it has served its purpose
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };

        window.addEventListener('click', unlockAudio, { once: true });
        window.addEventListener('keydown', unlockAudio, { once: true });
    }

    public play(sound: SoundEffect, volume = 0.5) {
        if (!this.isInitialized) {
            // It's possible play is called before the user has clicked, so we don't warn
            return;
        }
        const audio = this.audioCache[sound];
        if (audio) {
            const newAudioInstance = audio.cloneNode() as HTMLAudioElement;
            newAudioInstance.volume = volume;
            newAudioInstance.play().catch(e => { /* Autoplay errors are common, fail silently */ });
        } else {
            console.warn(`Sound not found in cache: ${sound}`);
        }
    }
}

export const soundService = new SoundService();