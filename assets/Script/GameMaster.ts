const { ccclass, property } = cc._decorator;

@ccclass
export default class GameMaster extends cc.Component {
    @property(cc.Prefab)
    groundPrefab: cc.Prefab | null = null;

    @property(cc.Prefab)
    blockPrefab: cc.Prefab | null = null;

    @property(cc.Prefab)
    enemyPrefab: cc.Prefab | null = null;

    @property(cc.Node)
    playerNode: cc.Node | null = null;

    @property
    tileSize: number = 16;

    private levelMap: string[] = [
        "G".repeat(60)
    ];

    onLoad(): void {
        if (cc.find("LevelBuilder")) {
            this.enabled = false;
            return;
        }

        this.node.setPosition(0, 0);

        const physics = cc.director.getPhysicsManager();
        physics.enabled = true;
        physics.gravity = cc.v2(0, -980);
        physics.debugDrawFlags = 0;

        this.disableLegacySceneNodes();
        this.buildVisibleMap();
    }

    buildVisibleMap(): void {
        const horizonY = -250;
        const totalRows = this.levelMap.length;
        const tileStep = this.resolveTileStep();
        const maxCols = this.getMaxColumns();
        const startX = -((maxCols - 1) * tileStep.width) * 0.5;

        this.node.removeAllChildren();

        for (let row = 0; row < totalRows; row += 1) {
            const line = this.levelMap[row];
            for (let col = 0; col < line.length; col += 1) {
                const cell = line.charAt(col);
                const prefab = this.getPrefabForCell(cell);
                if (!prefab) {
                    continue;
                }

                const targetX = startX + col * tileStep.width;
                const targetY = horizonY + (totalRows - 1 - row) * tileStep.height;
                const node = cc.instantiate(prefab);
                node.parent = this.node;
                node.setPosition(targetX, targetY);
                this.configureTile(node, cell);
            }
        }

        if (this.playerNode) {
            this.playerNode.setPosition(120, horizonY + 150);
        }
    }

    private configureTile(node: cc.Node, cell: string): void {
        if (cell !== "G" && cell !== "B") {
            return;
        }

        node.group = "wall";
        node.scaleX = 1;
        node.scaleY = 1;
        const sprite = node.getComponent(cc.Sprite) || node.getComponentInChildren(cc.Sprite);
        const spriteNode = sprite ? sprite.node : node;
        spriteNode.setPosition(0, 0);
        spriteNode.scaleX = 1;
        spriteNode.scaleY = 1;
        const scaleX = spriteNode.scaleX === 0 ? 1 : spriteNode.scaleX;
        const scaleY = spriteNode.scaleY === 0 ? 1 : spriteNode.scaleY;
        const frame = sprite ? sprite.spriteFrame : null;
        const frameSize = frame ? frame.getOriginalSize() : cc.size(this.tileSize, this.tileSize);
        const colliderSize = cc.size(Math.abs(frameSize.width * scaleX), Math.abs(frameSize.height * scaleY));

        const rigidBody = node.getComponent(cc.RigidBody) || node.addComponent(cc.RigidBody);
        rigidBody.type = cc.RigidBodyType.Static;
        rigidBody.fixedRotation = true;
        rigidBody.gravityScale = 0;

        const collider = node.getComponent(cc.PhysicsBoxCollider) || node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(colliderSize.width, colliderSize.height);
        collider.offset = cc.v2(spriteNode.x, spriteNode.y);
        collider.apply();
    }

    private resolveTileStep(): cc.Size {
        const fallback = cc.size(this.tileSize, this.tileSize);
        if (!this.groundPrefab) {
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
        this.tileSize = step.width;
        return step;
    }

    private disableLegacySceneNodes(): void {
        const gameWorld = cc.find("GameWorld");
        if (!gameWorld) {
            return;
        }

        const staticWalls = gameWorld.getChildByName("Static Walls");
        if (staticWalls) {
            staticWalls.active = false;
        }

        const questionBlock = gameWorld.getChildByName("QuestionBlock");
        if (questionBlock) {
            questionBlock.active = false;
        }

        const levelBuilderNode = gameWorld.getChildByName("LevelBuilder");
        if (levelBuilderNode) {
            levelBuilderNode.active = false;
        }

        const levelBuilder = gameWorld.getComponent("LevelBuilder") as cc.Component | null;
        if (levelBuilder) {
            levelBuilder.enabled = false;
        }
    }

    private getMaxColumns(): number {
        let maxCols = 0;
        for (const line of this.levelMap) {
            if (line.length > maxCols) {
                maxCols = line.length;
            }
        }
        return maxCols;
    }

    private getPrefabForCell(cell: string): cc.Prefab | null {
        switch (cell) {
            case "G":
                return this.groundPrefab;
            case "B":
                return this.blockPrefab;
            case "E":
                return this.enemyPrefab;
            default:
                return null;
        }
    }
}
