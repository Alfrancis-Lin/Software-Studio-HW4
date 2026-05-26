const { ccclass, property } = cc._decorator;

@ccclass
export default class CameraFollow extends cc.Component {
    @property(cc.Node)
    target: cc.Node | null = null;

    @property
    followLerp: number = 0.1;

    private _fixedY: number = 0;
    private _fixedZ: number = 0;

    onLoad(): void {
        this._fixedY = this.node.y;
        this._fixedZ = this.node.z;
    }

    lateUpdate(): void {
        if (!this.target) {
            return;
        }

        const currentX = this.node.x;
        const desiredX = this.target.x;
        const newX = cc.misc.lerp(currentX, desiredX, this.followLerp);

        this.node.setPosition(newX, this._fixedY, this._fixedZ);
    }
}
