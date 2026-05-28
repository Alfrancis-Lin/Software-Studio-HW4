const { ccclass, property } = cc._decorator;

import AudioManager from "./AudioManager";
import { SceneNames } from "./GameTypes";
import { NodeNames } from "./GameTypes";
import { GroupNames } from "./GameTypes";

@ccclass
export default class GameManager extends cc.Component {
    private static _instance: GameManager | null = null;

    @property({ type: cc.Integer })
    startLife: number = 3;

    @property({ type: cc.Integer })
    startScore: number = 0;

    @property({ type: cc.Integer })
    startTimer: number = 300;

    @property({ type: cc.Float })
    respawnDelay: number = 0.5;

    @property({ type: cc.Vec2 })
    playerSpawn: cc.Vec2 = cc.v2(200, 200);

    private _score: number = 0;
    private _life: number = 3;
    private _timer: number = 300;
    private _gameOver: boolean = false;
    private _respawnQueued: boolean = false;
    private _respawnCountdown: number = 0;

    public static get instance(): GameManager | null {
        return GameManager._instance;
    }

    onLoad(): void {
        if (GameManager._instance && GameManager._instance !== this) {
            cc.warn("GameManager: duplicate instance detected, destroying the new one.");
            this.node.destroy();
            return;
        }

        GameManager._instance = this;
        this.ensurePhysicsEnabled();
        this.ensurePersistRootNode();
        this.resetGameState();
    }

    onDestroy(): void {
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }

    start(): void {
        cc.log("GameManager: ready", this.getState());
        this.bootstrapMinimalTestScene();
        this.ensureAudioManagerNode();
        this.ensureHudControllers();
        this.scheduleOnce(this.syncPlayerSpawnFromLevelBuilder, 0);
        this.scheduleOnce(this.syncPlayerSpawnFromLevelBuilder, 0.1);
    }

    update(dt: number): void {
        if (this._gameOver) {
            return;
        }

        if (this._respawnQueued) {
            this._respawnCountdown -= dt;
            if (this._respawnCountdown <= 0) {
                this._respawnQueued = false;
                this._respawnCountdown = 0;
                this.performRespawn();
            }
        }

        if (this._timer > 0) {
            this._timer -= dt;
            if (this._timer <= 0) {
                this._timer = 0;
                this.loseLife("timer");
            }
        }
    }

    public get score(): number {
        return this._score;
    }

    public get life(): number {
        return this._life;
    }

    public get timer(): number {
        return this._timer;
    }

    public get gameOver(): boolean {
        return this._gameOver;
    }

    public getState(): { score: number; life: number; timer: number; gameOver: boolean } {
        return {
            score: this._score,
            life: this._life,
            timer: this._timer,
            gameOver: this._gameOver,
        };
    }

    public resetGameState(): void {
        this._score = this.startScore;
        this._life = this.startLife;
        this._timer = this.startTimer;
        this._gameOver = false;
        this._respawnQueued = false;
        this._respawnCountdown = 0;
        cc.log("GameManager: game state reset", this.getState());
    }

    public addScore(points: number): void {
        if (this._gameOver) {
            return;
        }

        const safePoints = Number.isFinite(points) ? points : 0;
        this._score += safePoints;
        if (this._score < 0) {
            this._score = 0;
        }
        cc.log("GameManager: score updated", this._score);
    }

    public loseLife(reason: string = "unknown"): void {
        if (this._gameOver) {
            return;
        }

        this.playLoseOneLifeSfx();
        this._life -= 1;
        cc.warn("GameManager: life lost", reason, "remaining", this._life);

        if (this._life <= 0) {
            this._life = 0;
            this.showGameOver();
            return;
        }

        this.requestRespawn();
    }

    public requestRespawn(): void {
        if (this._gameOver) {
            return;
        }

        this._respawnQueued = true;
        this._respawnCountdown = Math.max(0, this.respawnDelay);
        cc.log("GameManager: respawn queued", this._respawnCountdown);
    }

    public cancelRespawn(): void {
        this._respawnQueued = false;
        this._respawnCountdown = 0;
    }

    public performRespawn(): void {
        cc.log("GameManager: performRespawn", this.playerSpawn);
        this.node.emit("game-manager-respawn", this.playerSpawn);
    }

    public showGameOver(): void {
        this._gameOver = true;
        this.cancelRespawn();
        cc.warn("GameManager: game over");
        this.node.emit("game-manager-gameover");
        cc.director.pause();
    }

    public loadSceneStartMenu(): void {
        cc.director.resume();
        cc.director.getScheduler().setTimeScale(1);
        cc.director.loadScene(SceneNames.StartMenu);
    }

    public loadSceneLevelSelect(): void {
        cc.director.resume();
        cc.director.getScheduler().setTimeScale(1);
        cc.director.loadScene(SceneNames.LevelSelect);
    }

    public loadSceneGame(): void {
        cc.director.resume();
        cc.director.getScheduler().setTimeScale(1);
        cc.director.loadScene(SceneNames.Game);
    }

    private playLoseOneLifeSfx(): void {
        const audioManager = AudioManager.instance || (cc.find(NodeNames.AudioManager)?.getComponent(AudioManager) as AudioManager | null);
        if (audioManager) {
            audioManager.playLoseOneLife();
            return;
        }

        cc.loader.loadRes("audio/loseOneLife", cc.AudioClip, (err, clip) => {
            if (err || !clip) {
                cc.warn("GameManager: failed to play loseOneLife sfx", err);
                return;
            }

            cc.audioEngine.playEffect(clip, false);
        });
    }

    private ensurePhysicsEnabled(): void {
        const physics = cc.director.getPhysicsManager();
        physics.enabled = true;
        physics.gravity = cc.v2(0, -980);
    }

    private ensurePersistRootNode(): void {
        if (!this.node.parent) {
            cc.game.addPersistRootNode(this.node);
            return;
        }

        cc.warn("GameManager: node is not at scene root, skipping persist root registration");
    }

    private bootstrapMinimalTestScene(): void {
        if (cc.find("GameMaster") || cc.find("LevelBuilder")) {
            return;
        }

        const playerNode = cc.find(NodeNames.Player);
        if (playerNode) {
            this.playerSpawn = cc.v2(playerNode.position.x, playerNode.position.y);
        }

        const cameraNode = cc.find(NodeNames.MainCamera);
        if (cameraNode && playerNode) {
            const follow = cameraNode.getComponent("CameraFollow") as any;
            if (follow) {
                follow.target = playerNode;
            }
        }

        const gameWorld = cc.find(NodeNames.GameWorld) || this.node.parent;
        if (!gameWorld) {
            cc.warn("GameManager: GameWorld node not found, skipping test ground creation");
            return;
        }

        if (gameWorld.getChildByName("TestGround")) {
            return;
        }

        const ground = new cc.Node("TestGround");
        ground.parent = gameWorld;
        ground.setPosition(0, -240);
        ground.group = GroupNames.Wall;

        const graphics = ground.addComponent(cc.Graphics);
        graphics.clear();
        graphics.fillColor = cc.color(120, 72, 24);
        graphics.rect(-1600, -24, 3200, 48);
        graphics.fill();

        const rigidBody = ground.addComponent(cc.RigidBody);
        rigidBody.type = cc.RigidBodyType.Static;
        rigidBody.enabledContactListener = true;

        const collider = ground.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(3200, 48);
        collider.offset = cc.v2(0, 0);
        collider.apply();

        cc.log("GameManager: created minimal test ground");
        // Diagnostic: if a LevelBuilder exists in the scene, log its state and
        // attempt to force a build to surface runtime errors in the console.
        try {
            const lbNode = cc.find(NodeNames.LevelBuilder);
            if (lbNode) {
                const lbComp = lbNode.getComponent("LevelBuilder") as any;
                cc.log("GameManager: diagnostic - LevelBuilder node found", lbNode.name);
                if (lbComp) {
                    cc.log("GameManager: diagnostic - LevelBuilder component enabled", !!lbComp.enabled, "debugLog", !!lbComp.debugLog);
                    if (typeof lbComp.buildLevel === 'function') {
                        try {
                            lbComp.buildLevel();
                            cc.log("GameManager: diagnostic - forced LevelBuilder.buildLevel()");
                        } catch (err) {
                            cc.error("GameManager: diagnostic - LevelBuilder.buildLevel threw:", err);
                        }
                    }
                }
            }
        } catch (e) {
            cc.error("GameManager: diagnostic error while checking LevelBuilder", e);
        }
    }

    private ensureAudioManagerNode(): void {
        const scene = cc.director.getScene();
        if (!scene) {
            return;
        }

        let audioNode = cc.find(NodeNames.AudioManager);
        if (!audioNode) {
            audioNode = new cc.Node(NodeNames.AudioManager);
            audioNode.parent = scene;
        }

        if (!audioNode.getComponent(AudioManager)) {
            audioNode.addComponent(AudioManager);
        }
    }

    private ensureHudControllers(): void {
        const uiRoot = cc.find("UI") || cc.find("Canvas");
        if (uiRoot && !uiRoot.getComponent("UIHUDController")) {
            (uiRoot as any).addComponent("UIHUDController");
        }

        const gameOverNode = cc.find(NodeNames.GameOverPanel);
        if (gameOverNode && !gameOverNode.getComponent("GameOverPanelController")) {
            (gameOverNode as any).addComponent("GameOverPanelController");
        }
    }

    private syncPlayerSpawnFromLevelBuilder(): void {
        const levelBuilderNode = cc.find(NodeNames.LevelBuilder);
        if (!levelBuilderNode) {
            return;
        }

        const levelBuilder = levelBuilderNode.getComponent("LevelBuilder") as any;
        if (!levelBuilder || typeof levelBuilder.getPlayerSpawn !== "function") {
            return;
        }

        const spawn = levelBuilder.getPlayerSpawn();
        if (!spawn) {
            return;
        }

        this.playerSpawn = spawn;
        cc.log("GameManager: synced player spawn from LevelBuilder", spawn);
    }
}
