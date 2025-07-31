import { GameEntity, Position } from '../types';

export class SpatialGrid {
    private cells: Map<string, GameEntity[]>;
    private cellSize: number;
    private entitiesMap: Map<string, string>;

    constructor(cellSize: number) {
        this.cells = new Map();
        this.entitiesMap = new Map();
        this.cellSize = cellSize;
    }

    private getKey(x: number, y: number): string {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
    }

    public clear(): void {
        this.cells.clear();
        this.entitiesMap.clear();
    }

    public insert(entity: GameEntity): void {
        const key = this.getKey(entity.position.x, entity.position.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key)!.push(entity);
        this.entitiesMap.set(entity.id, key);
    }

    public getNearby(entity: GameEntity): GameEntity[] {
        const nearby: GameEntity[] = [];
        const { x, y } = entity.position;
        const originX = Math.floor(x / this.cellSize);
        const originY = Math.floor(y / this.cellSize);

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const key = `${originX + j},${originY + i}`;
                if (this.cells.has(key)) {
                    nearby.push(...this.cells.get(key)!);
                }
            }
        }
        return nearby;
    }
    
    public getAt(position: Position): GameEntity[] {
        const key = this.getKey(position.x, position.y);
        return this.cells.get(key) || [];
    }
}
