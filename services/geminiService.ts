import { GoogleGenAI, Type } from "@google/genai";
import { GameState, AIAction, BuildingType, UnitType, FogState, PlayerId, AIConfiguration } from '../types';
import { TILE_SIZE, MAP_WIDTH_TILES, MAP_HEIGHT_TILES } from "../constants";
import { getProducibleItems } from "../utils/logic";


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
    }).map(e => ({ 
        type: e.type, 
        hp: e.hp, 
        id: e.id, 
        playerId: e.playerId, 
        tilePosition: {x: Math.floor(e.position.x / TILE_SIZE), y: Math.floor(e.position.y / TILE_SIZE)} 
    }));

    const enemyPlayers = Object.values(players).filter(p => p.id !== aiPlayerId).map(p => ({
        id: p.id,
        superweapon: p.superweapon ? `${p.superweapon.type} is ${p.superweapon.isReady ? 'READY' : 'charging'}` : 'None'
    }));
    
    const visibleResourcePatches = Object.values(resourcePatches).filter(p => {
        const tileX = Math.floor(p.position.x / TILE_SIZE);
        const tileY = Math.floor(p.position.y / TILE_SIZE);
        if (tileY < 0 || tileY >= fogOfWar.length || tileX < 0 || tileX >= fogOfWar[0].length) return false;
        return fogOfWar[tileY]?.[tileX] !== FogState.UNEXPLORED;
    }).map(p => ({ 
        id: p.id, 
        tilePosition: {x: Math.floor(p.position.x / TILE_SIZE), y: Math.floor(p.position.y / TILE_SIZE)}, 
        amount: Math.floor(p.amount) 
    }));

    return { aiPlayer, aiBuildings, aiUnits, visibleEnemies, enemyPlayers, resourcePatches: visibleResourcePatches };
}

export async function getAICommand(state: GameState, aiPlayerId: PlayerId, aiConfig: AIConfiguration): Promise<AIAction> {
    const { aiPlayer, aiBuildings, aiUnits, visibleEnemies, enemyPlayers, resourcePatches } = getVisibleState(state, aiPlayerId);
    const aiEntities = Object.values(state.entities).filter(e => e.playerId === aiPlayerId);
    const { producibleUnits, producibleBuildings } = getProducibleItems(state.players[aiPlayerId], aiEntities);
    
    let systemInstruction = "You are a balanced AI commander named 'Skynet' in a real-time strategy game. Your goal is to defeat the enemy by balancing economic growth, technological advancement, and military might. Adapt your strategy to the situation on the battlefield. You must respond with a valid JSON object matching the requested schema.";

    if (aiConfig.personality === 'AGGRESSIVE') {
        systemInstruction = "You are an aggressive AI commander named 'Skynet'. Your only goal is to build cheap, fast units and rush the enemy's HQ. Prioritize constant military production and relentless attacks over economic growth or high-tech units. Overwhelm the enemy with numbers. You must respond with a valid JSON object matching the requested schema.";
    } else if (aiConfig.personality === 'ECONOMIC') {
        systemInstruction = "You are a patient, economic AI commander named 'Skynet'. Your goal is to build an unstoppable late-game army. Prioritize building a massive economy with multiple Refineries and Chrono Miners first. Defend yourself, but only attack when you have a decisive technological and numerical advantage. You must respond with a valid JSON object matching the requested schema.";
    }

    const prompt = `
This is the current game state for you, ${aiPlayerId}. Provide your next action as a single JSON object.
The map is a grid of ${MAP_WIDTH_TILES}x${MAP_HEIGHT_TILES} tiles. All positions ('tilePosition', 'targetPosition', 'placementPosition') are given as {x, y} TILE coordinates.

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
1.  BUILD: Construct a new building. Choose from: ${producibleBuildings.join(', ')}. You must specify a 'placementPosition' in tile coordinates.
2.  TRAIN: Train a new unit. Choose from: ${producibleUnits.join(', ')}.
3.  ATTACK: Send units to attack an enemy. Specify 'unitIds' and a 'attackTargetId'.
4.  GATHER: Send an IDLE Chrono Miner to an ore patch. Specify a single 'unitId' (the miner) and 'gatherTargetId' (the patch).
5.  LAUNCH_SUPERWEAPON: If your superweapon is ready, launch it. Specify the 'targetPosition' in tile coordinates.
6.  IDLE: Do nothing this turn.
`;

    const aiActionSchema = {
        type: Type.OBJECT,
        properties: {
            thought: { type: Type.STRING, description: 'Your reasoning for the chosen action, according to your personality.' },
            action: { type: Type.STRING, enum: ['BUILD', 'TRAIN', 'ATTACK', 'IDLE', 'LAUNCH_SUPERWEAPON', 'GATHER'], description: "The action to take." },
            buildingType: { type: Type.STRING, description: 'The type of building to construct if action is BUILD' },
            unitType: { type: Type.STRING, description: 'The type of unit to train if action is TRAIN' },
            unitIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'IDs of units for the action.' },
            attackTargetId: { type: Type.STRING, description: 'The ID of the enemy entity to attack if action is ATTACK' },
            gatherTargetId: { type: Type.STRING, description: 'The ID of the resource patch to gather from if action is GATHER' },
            placementPosition: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                },
                description: 'The TILE coordinates {x, y} for a build placement.',
            },
            targetPosition: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                },
                description: 'The TILE coordinates {x, y} for a superweapon strike.',
            },
        },
        required: ['thought', 'action'],
    };

    try {
        const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: aiActionSchema,
                temperature: 0.8,
            }
        });

        const jsonText = response.text.trim();
        const aiAction = JSON.parse(jsonText);
        return { ...aiAction, playerId: aiPlayerId } as AIAction;
    } catch (error) {
        console.error(`Error fetching AI command for ${aiPlayerId}:`, error);
        return { action: 'IDLE', thought: 'Critical error processing command.', playerId: aiPlayerId };
    }
}