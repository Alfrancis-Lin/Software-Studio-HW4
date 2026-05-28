const { ccclass } = cc._decorator;

import { NodeNames, SceneNames } from "./GameTypes";

@ccclass
export default class GameOverPanelController extends cc.Component {
    private _restartButton: cc.Button | null = null;
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

        if (this._restartButton) {
            this._restartButton.node.on(cc.Node.EventType.TOUCH_END, this.onRestartClicked, this);
        }
    }

    private bindGameManagerEvents(): void {
        const managerNode = cc.find(NodeNames.GameManager);
        if (!managerNode) {
            return;
        }

        this._gameManager = managerNode.getComponent("GameManager");
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
    }

    private onRestartClicked(): void {
        if (this._gameManager && typeof this._gameManager.loadSceneGame === "function") {
            this._gameManager.loadSceneGame();
            return;
        }

        cc.director.loadScene(SceneNames.Game);
    }
}
