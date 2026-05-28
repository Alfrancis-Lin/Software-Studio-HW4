const { ccclass, property } = cc._decorator;

import GameManager from "./GameManager";
import { NodeNames } from "./GameTypes";

@ccclass
export default class UIHUDController extends cc.Component {
    @property(cc.Label)
    scoreLabel: cc.Label | null = null;

    @property(cc.Label)
    lifeLabel: cc.Label | null = null;

    @property(cc.Label)
    timeLabel: cc.Label | null = null;

    private _gameManager: any = null;
    private _warnedMissingLabels: boolean = false;

    onLoad(): void {
        this.resolveSceneNodes();
        this.refreshHUD();
    }

    update(): void {
        this.resolveGameManager();
        this.refreshHUD();
    }

    private resolveSceneNodes(): void {
        if (!this.scoreLabel) {
            const scoreNode = cc.find(NodeNames.ScoreLabel);
            this.scoreLabel = scoreNode ? scoreNode.getComponent(cc.Label) : null;
        }

        if (!this.lifeLabel) {
            const lifeNode = cc.find(NodeNames.LifeLabel);
            this.lifeLabel = lifeNode ? lifeNode.getComponent(cc.Label) : null;
        }

        if (!this.timeLabel) {
            const timeNode = cc.find(NodeNames.TimeLabel);
            this.timeLabel = timeNode ? timeNode.getComponent(cc.Label) : null;
        }

        if (!this._warnedMissingLabels && (!this.scoreLabel || !this.lifeLabel || !this.timeLabel)) {
            this._warnedMissingLabels = true;
            cc.warn("UIHUDController: missing one or more HUD labels in the scene");
        }
    }

    private resolveGameManager(): void {
        if (this._gameManager) {
            return;
        }

        if (GameManager.instance) {
            this._gameManager = GameManager.instance;
            return;
        }

        const managerNode = cc.find(NodeNames.GameManager);
        if (managerNode) {
            this._gameManager = managerNode.getComponent(GameManager);
        }

        if (!this._gameManager) {
            cc.warn("UIHUDController: GameManager not ready yet");
        }
    }

    private refreshHUD(): void {
        if (!this._gameManager) {
            return;
        }

        if (this.scoreLabel) {
            this.scoreLabel.string = `SCORE ${this._gameManager.score}`;
        }

        if (this.lifeLabel) {
            this.lifeLabel.string = `LIFE ${this._gameManager.life}`;
        }

        if (this.timeLabel) {
            this.timeLabel.string = `TIME ${Math.ceil(this._gameManager.timer)}`;
        }
    }
}
