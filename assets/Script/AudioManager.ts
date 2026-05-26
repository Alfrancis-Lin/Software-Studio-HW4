const { ccclass, property } = cc._decorator;

@ccclass
export default class AudioManager extends cc.Component {
    @property(cc.AudioClip)
    bgm: cc.AudioClip | null = null;

    playBgm(loop: boolean = true): void {
        if (!this.bgm) {
            return;
        }

        cc.audioEngine.playMusic(this.bgm, loop);
    }

    stopBgm(): void {
        cc.audioEngine.stopMusic();
    }

    playSfx(clip: cc.AudioClip | null): void {
        if (!clip) {
            return;
        }

        cc.audioEngine.playEffect(clip, false);
    }
}