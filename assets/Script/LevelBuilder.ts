const { ccclass, property } = cc._decorator;

import GameManager from "./GameManager";
import EnemyController from "./EnemyController";

@ccclass
export default class LevelBuilder extends cc.Component {
    @property(cc.Prefab)
    groundPrefab: cc.Prefab | null = null;

    @property(cc.Prefab)
    blockPrefab: cc.Prefab | null = null;

    @property(cc.Prefab)
    enemyPrefab: cc.Prefab | null = null;

    @property(cc.TextAsset)
    mapAsset: cc.TextAsset | null = null;

    @property
    tileSize: number = 16;

    @property
    useFixedTileSize: boolean = true;

    @property
    originX: number = 0;

    @property
    originY: number = -250;

    @property
    debugLog: boolean = true;

    private _tileStep: cc.Size | null = null;
    private _playerSpawn: cc.Vec2 | null = null;

    private levelMap: string[] = [
        /* 00-05 */ "....................................................................................................",
        /* 01-05 */ "....................................................................................................",
        /* 02-05 */ "....................................................................................................",
        /* 03-05 */ "....................................................................................................",
        /* 04-05 */ "....................................................................................................",
        /* 05-05 */ "....................................................................................................",
        /* 06-10 */ "....................................................................................................",
        /* 07-10 */ "....................................................................................................",
        /* 08-10 */ "....................................................................................................",
        /* 09-10 */ "....................................................................................................",
        /* 10-10 */ "....................................................................................................",
        /* 11-15 */ "....................................................................................................",
        /* 12-15 */ "....................................................................................................",
        /* 13-15 */ "....................................................................................................",
        /* 14-15 */ "....................................................................................................",
        /* 15-15 */ "....................................................................................................",
        /* 16-20 */ "....................................................................................................",
        /* 17-20 */ "....................................................................................................",
        /* 18-20 */ "....................................................................................................",
        /* 19-20 */ "....................................................................................................",
        /* 20-20 */ "....................................................................................................",
        /* 21-25 */ "....................................................................................................",
        /* 22-25 */ "....................................................................................................",
        /* 23-25 */ "....................................................................................................",
        /* 24-25 */ "....................................................................................................",
        /* 25-25 */ "....................................................................................................",
        /* 26-30 */ "....................................................................................................",
        /* 27-30 */ "....................................................................................................",
        /* 28-30 */ "....................................................................................................",
        /* 29-30 */ "....................................................................................................",
        /* 30-30 */ "....................................................................................................",
        /* 31-35 */ "......................BBBB......................................BBBBBB..............................",
        /* 32-35 */ "....................................................................................................",
        /* 33-35 */ "............BBBB......................B.B.B..............BBBBB...............................BBB....",
        /* 34-35 */ "....................................................................................................",
        /* 35-35 */ "..................E.....................................................E...........................",
        /* 36-39 */ "....................................................................................................",
        /* 37-39 */ "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
        /* 38-39 */ "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
        /* 39-39 */ "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
    ];

    start(): void {
        if (!this.groundPrefab) {
            cc.warn("LevelBuilder: groundPrefab is not assigned");
            return;
        }

        this.loadMapFromAsset();
        this.useFixedTileSize = true;
        this.tileSize = 16;

        this.buildLevel();
    }

    public buildLevel(): void {
        const root = this.getOrCreateRoot();
        root.removeAllChildren();
        root.setPosition(0, 0);

        const tileStep = this.getTileStep();
        const visibleSize = cc.view.getVisibleSize();
        const startX = -visibleSize.width * 0.5 + tileStep.width * 0.5 + this.originX;
        const startY = visibleSize.height * 0.5 - tileStep.height * 0.5 + this.originY;

        let warnedGround = false;
        let warnedBlock = false;
        let warnedEnemy = false;
        let spawnedCount = 0;
        let spawnedEnemyCount = 0;

        for (let row = 0; row < this.levelMap.length; row += 1) {
            const line = this.levelMap[row];
            for (let col = 0; col < line.length; col += 1) {
                const cell = line.charAt(col);
                const prefab = this.getPrefabForCell(cell);
                if (!prefab) {
                    if (cell === 'G' && !warnedGround) {
                        warnedGround = true;
                        cc.warn('LevelBuilder: groundPrefab is not assigned');
                    }
                    if (cell === 'B' && !warnedBlock) {
                        warnedBlock = true;
                        cc.warn('LevelBuilder: blockPrefab is not assigned');
                    }
                    if (cell === 'E' && !warnedEnemy) {
                        warnedEnemy = true;
                        cc.warn('LevelBuilder: enemyPrefab is not assigned');
                    }
                    continue;
                }

                const node = cc.instantiate(prefab);
                node.parent = root;
                if (cell === 'E' && !node.getComponent(EnemyController)) {
                    node.addComponent(EnemyController);
                }
                if (cell === 'E') {
                    node.group = 'Enemy';
                    spawnedEnemyCount += 1;
                }
                this.applyTileVisual(node, cell);
                const targetX = startX + col * tileStep.width;
                const targetY = startY - row * tileStep.height;
                node.setPosition(targetX, targetY);
                spawnedCount += 1;
            }
        }

        if (this.debugLog) {
            cc.log('LevelBuilder: spawned', spawnedCount, 'nodes', 'enemies', spawnedEnemyCount);
        }

        this.updatePlayerSpawnFromMap(startX, startY, tileStep);
    }

    private getPrefabForCell(cell: string): cc.Prefab | null {
        switch (cell) {
            case 'G':
            case 'C':
                return this.groundPrefab;
            case 'B':
                return this.blockPrefab;
            case 'E':
                return this.enemyPrefab;
            default:
                return null;
        }
    }

    private getOrCreateRoot(): cc.Node {
        const name = 'LevelTiles';
        let root = this.node.getChildByName(name);
        if (!root) {
            root = new cc.Node(name);
            root.parent = this.node;
        }
        return root;
    }

    private loadMapFromAsset(): void {
        if (!this.mapAsset) {
            return;
        }

        const text = this.mapAsset.text || "";
        const fromQuoted = this.extractQuotedLines(text);
        const lines = fromQuoted.length ? fromQuoted : this.extractPlainLines(text);

        if (lines.length) {
            this.levelMap = lines;
        }
    }

    private extractQuotedLines(text: string): string[] {
        const result: string[] = [];
        const regex = /"([^"]*)"/g;
        let match: RegExpExecArray | null;

        while ((match = regex.exec(text)) !== null) {
            if (match[1]) {
                result.push(match[1]);
            }
        }

        return result;
    }

    private extractPlainLines(text: string): string[] {
        return text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .filter((line) => line.includes('.') || line.includes('G') || line.includes('B') || line.includes('C') || line.includes('E'));
    }

    private applyTileVisual(node: cc.Node, cell: string): void {
        if (cell !== 'G' && cell !== 'C') {
            return;
        }

        const sprite = node.getComponent(cc.Sprite) || node.getComponentInChildren(cc.Sprite);
        if (!sprite || !sprite.spriteFrame) {
            return;
        }

        const atlas = (sprite as any)._atlas as cc.SpriteAtlas | null;
        if (!atlas) {
            return;
        }

        const frameName = cell === 'G' ? 'tiles_83' : 'tiles_100';
        const frame = atlas.getSpriteFrame(frameName);
        if (!frame) {
            cc.warn(`LevelBuilder: missing sprite frame ${frameName}`);
            return;
        }

        sprite.spriteFrame = frame;
        sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        sprite.node.setContentSize(frame.getOriginalSize());
    }

    private getTileStep(): cc.Size {
        if (this.useFixedTileSize) {
            return cc.size(this.tileSize, this.tileSize);
        }

        return this.resolveTileStep();
    }

    private resolveTileStep(): cc.Size {
        if (this._tileStep) {
            return this._tileStep;
        }

        const fallback = cc.size(this.tileSize, this.tileSize);
        if (!this.groundPrefab) {
            this._tileStep = fallback;
            return fallback;
        }

        const sample = cc.instantiate(this.groundPrefab);
        const sprite = sample.getComponent(cc.Sprite) || sample.getComponentInChildren(cc.Sprite);
        let step = fallback;

        if (sprite && sprite.spriteFrame) {
            const size = sprite.spriteFrame.getOriginalSize();
            if (size.width > 0 && size.height > 0) {
                step = cc.size(size.width, size.height);
            }
        }

        sample.destroy();
        this._tileStep = step;
        return step;
    }

    private updatePlayerSpawnFromMap(startX: number, startY: number, tileStep: cc.Size): void {
        const spawn = this.findLeftmostGroundSpawn(startX, startY, tileStep);
        if (!spawn) {
            return;
        }

        const manager = GameManager.instance;
        if (manager) {
            manager.playerSpawn = spawn;
            cc.log('LevelBuilder: player spawn set', spawn);
        }

        this._playerSpawn = spawn;
    }

    private findLeftmostGroundSpawn(startX: number, startY: number, tileStep: cc.Size): cc.Vec2 | null {
        for (let row = this.levelMap.length - 1; row >= 0; row -= 1) {
            const line = this.levelMap[row];
            for (let col = 0; col < line.length; col += 1) {
                if (line.charAt(col) !== 'G') {
                    continue;
                }

                const tileX = startX + col * tileStep.width;
                const tileY = startY - row * tileStep.height;
                return cc.v2(tileX, tileY + tileStep.height);
            }
        }

        return null;
    }

    public getPlayerSpawn(): cc.Vec2 | null {
        return this._playerSpawn ? this._playerSpawn.clone() : null;
    }
}
