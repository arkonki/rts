import { VisualEffect } from '../../types';
import { ATTACK_VISUAL_DURATION, EXPLOSION_DURATION, DAMAGE_TEXT_DURATION, REPAIR_TEXT_DURATION, CHRONO_VORTEX_DURATION, NUKE_IMPACT_DURATION } from '../../constants';

export function updateVisualEffects(effects: VisualEffect[], now: number): VisualEffect[] {
    return effects.filter(effect => {
        let duration = 0;
        switch(effect.type) {
            case 'ATTACK_VISUAL': duration = ATTACK_VISUAL_DURATION; break;
            case 'EXPLOSION': duration = EXPLOSION_DURATION; break;
            case 'DAMAGE_TEXT': duration = DAMAGE_TEXT_DURATION; break;
            case 'REPAIR_TEXT': duration = REPAIR_TEXT_DURATION; break;
            case 'CHRONO_VORTEX': duration = CHRONO_VORTEX_DURATION; break;
            case 'NUKE_IMPACT': duration = NUKE_IMPACT_DURATION; break;
        }
        return now - effect.creationTime < duration;
    });
}
