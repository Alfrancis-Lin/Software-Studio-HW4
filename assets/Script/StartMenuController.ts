const { ccclass, property } = cc._decorator;

import { SceneNames } from "./GameTypes";

function safeLoadScene(sceneName: string) {
    if (!sceneName || typeof sceneName !== 'string') {
        cc.error('safeLoadScene: invalid sceneName', sceneName);
        return;
    }
    const available = cc.director.getScene();
    try {
        cc.log('safeLoadScene: loading', sceneName);
        cc.director.loadScene(sceneName, () => {
            cc.log('safeLoadScene: loaded', sceneName);
        });
    } catch (e) {
        cc.error('safeLoadScene: failed to load scene', sceneName, e);
    }
}

@ccclass
export default class StartMenuController extends cc.Component {
    @property(cc.Button)
    btnStart: cc.Button | null = null;

    onLoad(): void {
        if (this.btnStart && this.btnStart.node) {
            try {
                this.btnStart.node.on("click", this.onStartClicked, this);
            } catch (e) {
                cc.error('StartMenuController: failed to bind btnStart click', e);
            }
        } else {
            cc.error("StartMenuController: btnStart is not set or missing node reference.");
        }
    }

    onDestroy(): void {
        try {
            const node = this.btnStart && this.btnStart.node;
            if (node && typeof node.off === 'function') {
                node.off("click", this.onStartClicked, this);
            }
        } catch (e) {
            cc.error('StartMenuController: failed to unbind btnStart click', e);
        }
    }

    private onStartClicked(): void {
        cc.log('StartMenuController: Btn_Start clicked');
        safeLoadScene(SceneNames.LevelSelect);
    }
}
