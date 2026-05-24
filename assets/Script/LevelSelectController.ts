const { ccclass, property } = cc._decorator;

import { SceneNames } from "./GameTypes";

function safeLoadScene(sceneName: string) {
    if (!sceneName || typeof sceneName !== 'string') {
        cc.error('safeLoadScene: invalid sceneName', sceneName);
        return;
    }
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
export default class LevelSelectController extends cc.Component {
    @property(cc.Button)
    btnWorld11: cc.Button | null = null;

    @property(cc.Button)
    btnBack: cc.Button | null = null;

    onLoad(): void {
        if (this.btnWorld11 && this.btnWorld11.node) {
            try {
                this.btnWorld11.node.on("click", this.onWorld11Clicked, this);
            } catch (e) {
                cc.error('LevelSelectController: failed to bind btnWorld11 click', e);
            }
        } else {
            cc.error("LevelSelectController: btnWorld11 is not set or missing node reference.");
        }

        if (this.btnBack && this.btnBack.node) {
            try {
                this.btnBack.node.on("click", this.onBackClicked, this);
            } catch (e) {
                cc.error('LevelSelectController: failed to bind btnBack click', e);
            }
        } else {
            cc.error("LevelSelectController: btnBack is not set or missing node reference.");
        }
    }

    onDestroy(): void {
        try {
            const node1 = this.btnWorld11 && this.btnWorld11.node;
            if (node1 && typeof node1.off === 'function') {
                node1.off("click", this.onWorld11Clicked, this);
            }
        } catch (e) {
            cc.error('LevelSelectController: failed to unbind btnWorld11 click', e);
        }

        try {
            const node2 = this.btnBack && this.btnBack.node;
            if (node2 && typeof node2.off === 'function') {
                node2.off("click", this.onBackClicked, this);
            }
        } catch (e) {
            cc.error('LevelSelectController: failed to unbind btnBack click', e);
        }
    }

    private onWorld11Clicked(): void {
        cc.log('LevelSelectController: Btn_World_1_1 clicked');
        safeLoadScene(SceneNames.Game);
    }

    private onBackClicked(): void {
        cc.log('LevelSelectController: Btn_Back clicked');
        safeLoadScene(SceneNames.StartMenu);
    }
}
