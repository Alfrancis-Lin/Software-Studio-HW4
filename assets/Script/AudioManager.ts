const { ccclass, property } = cc._decorator;

@ccclass
export default class AudioManager extends cc.Component {
    private static _instance: AudioManager | null = null;

    private _bgm: cc.AudioClip | null = null;
    private _jump: cc.AudioClip | null = null;
    private _kick: cc.AudioClip | null = null;
    private _loseOneLife: cc.AudioClip | null = null;
    private _powerUp: cc.AudioClip | null = null;

    public static get instance(): AudioManager | null {
        return AudioManager._instance;
    }

    onLoad(): void {
        if (AudioManager._instance && AudioManager._instance !== this) {
            this.node.destroy();
            return;
        }

        AudioManager._instance = this;

        if (this.node.parent && this.node.parent === cc.director.getScene()) {
            cc.game.addPersistRootNode(this.node);
        }

        this.loadDefaultClips();
    }

    onDestroy(): void {
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
    }

    playBgm(loop: boolean = true): void {
        if (!this._bgm) {
            return;
        }

        cc.audioEngine.playMusic(this._bgm, loop);
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

    playJump(): void {
        this.playSfx(this._jump);
    }

    playKick(): void {
        this.playSfx(this._kick);
    }

    playLoseOneLife(): void {
        this.playSfx(this._loseOneLife);
    }

    playPowerUp(): void {
        this.playSfx(this._powerUp);
    }

    private loadDefaultClips(): void {
        this.loadClip("audio/bgm_1", (clip) => {
            this._bgm = clip;
            this.playBgm(true);
        });

        this.loadClip("audio/jump", (clip) => {
            this._jump = clip;
        });

        this.loadClip("audio/kick", (clip) => {
            this._kick = clip;
        });

        this.loadClip("audio/loseOneLife", (clip) => {
            this._loseOneLife = clip;
        });

        this.loadClip("audio/PowerUp", (clip) => {
            this._powerUp = clip;
        });
    }

    private loadClip(path: string, onLoaded: (clip: cc.AudioClip) => void): void {
        cc.loader.loadRes(path, cc.AudioClip, (err, clip) => {
            if (err) {
                cc.warn(`AudioManager: failed to load ${path}`, err);
                return;
            }

            if (!clip) {
                cc.warn(`AudioManager: empty clip for ${path}`);
                return;
            }

            onLoaded(clip as cc.AudioClip);
        });
    }
}