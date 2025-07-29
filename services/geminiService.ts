
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, AIAction, BuildingType, UnitType, FogState, PlayerId, AIConfiguration } from '../types';
import { TILE_SIZE } from "../constants";
import { getProducibleItems } from "../utils/logic";


// Default AI instance using environment variable
const defaultAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

function getVisibleState(state: GameState, aiPlayerId: PlayerId) {
    const { entities, players, fogOfWar, resourcePatches } = state;
    
    const aiPlayerState = players[aiPlayerId];

    const aiPlayer = {
        credits: Math.floor(aiPlayerState.credits),
        power: aiPlayerState.power.produced - aiPlayerState.power.consumed,
        superweapon: aiPlayerState.superweapon ? `${aiPlayerState.superweapon.type} is ${aiPlayerState.superweapon.isReady ? 'READY' : 'charging'}` : 'None',
    };

    const aiEntities = Object.values(entities).filter(e => e.playerId === aiPlayerId);
    const aiBuildings = aiEntities.filter(e => 'isPowered' in e).map(b => ({ type: b.type, hp: b.hp, id: b.id }));
    const aiUnits = aiEntities.filter(e => 'status' in e).map(u => ({ type: u.type, hp: u.hp, id: u.id, status: (u as any).status, cargo: (u as any).cargoAmount || 0 }));

    const visibleEnemies = Object.values(entities).filter(e => {
        if (e.playerId !== aiPlayerId) {
            const tileX = Math.floor(e.position.x / TILE_SIZE);
            const tileY = Math.floor(e.position.y / TILE_SIZE);
            if (tileY < 0 || tileY >= fogOfWar.length || tileX < 0 || tileX >= fogOfWar[0].length) return false;
            return fogOfWar[tileY]?.[tileX] === FogState.VISIBLE || fogOfWar[tileY]?.[tileX] === FogState.EXPLORED;
        }
        return false;
    }).map(e => ({ type: e.type, hp: e.hp, id: e.id, playerId: e.playerId, position: {x: Math.round(e.position.x), y: Math.round(e.position.y)} }));

    const enemyPlayers = Object.values(players).filter(p => p.id !== aiPlayerId).map(p => ({
        id: p.id,
        superweapon: p.superweapon ? `${p.superweapon.type} is ${p.superweapon.isReady ? 'READY' : 'charging'}` : 'None'
    }));
    
    const visibleResourcePatches = Object.values(resourcePatches).filter(p => {
        const tileX = Math.floor(p.position.x / TILE_SIZE);
        const tileY = Math.floor(p.position.y / TILE_SIZE);
        if (tileY < 0 || tileY >= fogOfWar.length || tileX < 0 || tileX >= fogOfWar[0].length) return false;
        return fogOfWar[tileY]?.[tileX] !== FogState.UNEXPLORED;
    }).map(p => ({ id: p.id, position: {x: Math.round(p.position.x), y: Math.round(p.position.y)}, amount: Math.floor(p.amount) }));

    return { aiPlayer, aiBuildings, aiUnits, visibleEnemies, enemyPlayers, resourcePatches: visibleResourcePatches };
}

export async function getAICommand(state: GameState, aiPlayerId: PlayerId, aiConfig: AIConfiguration): Promise<AIAction> {
    const { aiPlayer, aiBuildings, aiUnits, visibleEnemies, enemyPlayers, resourcePatches } = getVisibleState(state, aiPlayerId);
    const aiEntities = Object.values(state.entities).filter(e => e.playerId === aiPlayerId);
    const { producibleUnits, producibleBuildings } = getProducibleItems(state.players[aiPlayerId], aiEntities);
    
    let currentAi = defaultAi;
    if (aiConfig.apiKey) {
        try {
            currentAi = new GoogleGenAI({ apiKey: aiConfig.apiKey });
        } catch (error) {
            console.error(`Failed to initialize Gemini for ${aiPlayerId} with custom API key:`, error);
            return { action: 'IDLE', thought: 'My custom API key is invalid. Holding position.', error: 'GENERAL', playerId: aiPlayerId };
        }
    }
    
    let systemInstruction = "You are a balanced AI commander named 'Skynet' in a real-time strategy game. Your goal is to defeat the enemy by balancing economic growth, technological advancement, and military might. Adapt your strategy to the situation on the battlefield.";

    if (aiConfig.personality === 'AGGRESSIVE') {
        systemInstruction = "You are an aggressive AI commander named 'Skynet'. Your only goal is to build cheap, fast units and rush the enemy's HQ. Prioritize constant military production and relentless attacks over economic growth or high-tech units. Overwhelm the enemy with numbers.";
    } else if (aiConfig.personality === 'ECONOMIC') {
        systemInstruction = "You are a patient, economic AI commander named 'Skynet'. Your goal is to build an unstoppable late-game army. Prioritize building a massive economy with multiple Refineries and Chrono Miners first. Defend yourself, but only attack when you have a decisive technological and numerical advantage.";
    }

    const prompt = `
This is the current game state for you, ${aiPlayerId}. Provide your next action as a JSON object.

Your current status:
- Credits: ${aiPlayer.credits}
- Power Balance: ${aiPlayer.power}
- Your Superweapon: ${aiPlayer.superweapon}
- Your Buildings: ${JSON.stringify(aiBuildings.map(b => b.type))}
- Your Units with IDs: ${JSON.stringify(aiUnits.map(u => ({type: u.type, id: u.id, status: u.status, cargo: u.cargo})))}
- Visible Resource Patches: ${resourcePatches.length > 0 ? JSON.stringify(resourcePatches) : "None"}

Enemy Status:
- Visible Enemy forces: ${visibleEnemies.length > 0 ? JSON.stringify(visibleEnemies) : "None"}
- Enemy Superweapons: ${JSON.stringify(enemyPlayers)}

Possible Actions:
1.  BUILD: Construct a new building. Choose from: ${producibleBuildings.join(', ')}. Your workers will find a suitable location.
2.  TRAIN: Train a new unit. Choose from: ${producibleUnits.join(', ')}. It will be queued at the appropriate building.
3.  ATTACK: Send a group of units to attack an enemy. Specify 'unitIds' and a 'attackTargetId'. Prioritize high-value targets.
4.  GATHER: Send an IDLE Chrono Miner to an ore patch. Specify a single 'unitId' (the miner) and 'gatherTargetId' (the patch).
5.  LAUNCH_SUPERWEAPON: If your superweapon is ready, launch it. Specify the target coordinates. Choose a high-value area.
6.  IDLE: Do nothing this turn, to save resources for a bigger purpose.
`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            thought: {
                type: Type.STRING,
                description: "Your reasoning for the chosen action, according to your personality."
            },
            action: {
                type: Type.STRING,
                enum: ['BUILD', 'TRAIN', 'ATTACK', 'IDLE', 'LAUNCH_SUPERWEAPON', 'GATHER'],
                description: "The action to perform."
            },
            buildingType: {
                type: Type.STRING,
                description: "The type of building to construct (if action is BUILD)."
            },
            unitType: {
                type: Type.STRING,
                description: "The type of unit to train (if action is TRAIN)."
            },
            unitIds: {
                type: Type.ARRAY,
                description: "An array of your unit IDs to send for an attack or gather. For GATHER, provide only one ID.",
                items: { type: Type.STRING }
            },
            attackTargetId: {
                type: Type.STRING,
                description: "The ID of the enemy entity to attack (if action is ATTACK)."
            },
            gatherTargetId: {
                type: Type.STRING,
                description: "The ID of the resource patch to gather from (if action is GATHER)."
            },
            targetPosition: {
                type: Type.OBJECT,
                description: "The x, y coordinates to target with the superweapon (if action is LAUNCH_SUPERWEAPON).",
                properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                }
            }
        },
        required: ['thought', 'action']
    };

    try {
        const response = await currentAi.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: schema,
                temperature: 0.9,
            }
        });
        
        const jsonText = response.text.trim();
        const aiAction = JSON.parse(jsonText);
        return { ...aiAction, playerId: aiPlayerId } as AIAction;
    } catch (error) {
        console.error(`Error fetching AI command for ${aiPlayerId} from Gemini:`, error);
        const errorString = JSON.stringify(error);
        
        if (aiConfig.apiKey && (errorString.includes('400') || errorString.includes('API_KEY_INVALID'))) {
             return { action: 'IDLE', thought: 'My custom API key is invalid. Please check it.', error: 'GENERAL', playerId: aiPlayerId };
        }
        if (errorString.includes('429') || errorString.includes('RESOURCE_EXHAUSTED')) {
            return { action: 'IDLE', thought: 'My command servers are overloaded. Standing by.', error: 'RATE_LIMIT', playerId: aiPlayerId };
        }
        // Fallback to a simple action in case of other API errors
        return { action: 'IDLE', thought: 'Error in decision making. Holding position.', error: 'GENERAL', playerId: aiPlayerId };
    }
}
