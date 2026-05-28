const { ccclass } = cc._decorator;

import { NodeNames } from "./GameTypes";

@ccclass
export default class UIHUDController extends cc.Component {
    private _scoreLabel: cc.Label | null = null;
    private _lifeLabel: cc.Label | null = null;
    private _timeLabel: cc.Label | null = null;
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
        const scoreNode = cc.find(NodeNames.ScoreLabel);
        const lifeNode = cc.find(NodeNames.LifeLabel);
        const timeNode = cc.find(NodeNames.TimeLabel);

        this._scoreLabel = scoreNode ? scoreNode.getComponent(cc.Label) : null;
        this._lifeLabel = lifeNode ? lifeNode.getComponent(cc.Label) : null;
        this._timeLabel = timeNode ? timeNode.getComponent(cc.Label) : null;

        if (!this._warnedMissingLabels && (!this._scoreLabel || !this._lifeLabel || !this._timeLabel)) {
            this._warnedMissingLabels = true;
            cc.warn("UIHUDController: missing one or more HUD labels in the scene");
        }
    }

    private resolveGameManager(): void {
        if (this._gameManager) {
            return;
        }

        if (this._gameManager) {
            return;
        }

        const managerNode = cc.find(NodeNames.GameManager);
        if (managerNode) {
            this._gameManager = managerNode.getComponent("GameManager");
        }
    }

    private refreshHUD(): void {
        if (!this._gameManager) {
            return;
        }

        if (this._scoreLabel) {
            this._scoreLabel.string = `SCORE ${this._gameManager.score}`;
        }

        if (this._lifeLabel) {
            this._lifeLabel.string = `LIFE ${this._gameManager.life}`;
        }

        if (this._timeLabel) {
            this._timeLabel.string = `TIME ${Math.ceil(this._gameManager.timer)}`;
        }
    }
}
