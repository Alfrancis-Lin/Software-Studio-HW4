const { ccclass, property } = cc._decorator;

import GameManager from "./GameManager";
import { NodeNames, SceneNames } from "./GameTypes";

@ccclass
export default class GameOverPanelController extends cc.Component {
    private _restartButton: cc.Button | null = null;
    @property(cc.Label)
    gameOverLabel: cc.Label | null = null;

    private _gameManager: any = null;

    onLoad(): void {
        this.resolveSceneNodes();
        this.node.active = false;
        this.bindGameManagerEvents();
    }

    onDestroy(): void {
        this.unbindGameManagerEvents();
    }

    private resolveSceneNodes(): void {
        const restartNode = this.node.getChildByName("BtnRestart") || cc.find(`${NodeNames.GameOverPanel}/BtnRestart`);
        this._restartButton = restartNode ? restartNode.getComponent(cc.Button) : null;

        if (!this.gameOverLabel) {
            const labelNode = this.node.getChildByName("GameOverLabel") || cc.find(`${NodeNames.GameOverPanel}/GameOverLabel`);
            this.gameOverLabel = labelNode ? labelNode.getComponent(cc.Label) : null;
        }

        if (this._restartButton) {
            this._restartButton.node.on(cc.Node.EventType.TOUCH_END, this.onRestartClicked, this);
        }
    }

    private bindGameManagerEvents(): void {
        if (GameManager.instance) {
            this._gameManager = GameManager.instance;
            this._gameManager.node.on("game-manager-gameover", this.onGameOver, this);
            return;
        }

        const managerNode = cc.find(NodeNames.GameManager);
        if (!managerNode) {
            return;
        }

        this._gameManager = managerNode.getComponent(GameManager);
        this._gameManager.node.on("game-manager-gameover", this.onGameOver, this);
    }

    private unbindGameManagerEvents(): void {
        if (this._gameManager) {
            this._gameManager.node.off("game-manager-gameover", this.onGameOver, this);
        }

        if (this._restartButton) {
            this._restartButton.node.off(cc.Node.EventType.TOUCH_END, this.onRestartClicked, this);
        }
    }

    private onGameOver(): void {
        this.node.active = true;
        if (this.gameOverLabel) {
            this.gameOverLabel.string = "GAME OVER";
        }
    }

    private onRestartClicked(): void {
        if (this._gameManager && typeof this._gameManager.loadSceneGame === "function") {
            this._gameManager.loadSceneGame();
            return;
        }

        cc.director.loadScene(SceneNames.Game);
    }
}
