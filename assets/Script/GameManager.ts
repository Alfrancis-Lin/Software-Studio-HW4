const { ccclass, property } = cc._decorator;

import { SceneNames } from "./GameTypes";

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
    playerSpawn: cc.Vec2 = cc.v2(0, 0);

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
        cc.game.addPersistRootNode(this.node);
        this.resetGameState();
    }

    onDestroy(): void {
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }

    start(): void {
        cc.log("GameManager: ready", this.getState());
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
    }

    public loadSceneStartMenu(): void {
        cc.director.loadScene(SceneNames.StartMenu);
    }

    public loadSceneLevelSelect(): void {
        cc.director.loadScene(SceneNames.LevelSelect);
    }

    public loadSceneGame(): void {
        cc.director.loadScene(SceneNames.Game);
    }
}
