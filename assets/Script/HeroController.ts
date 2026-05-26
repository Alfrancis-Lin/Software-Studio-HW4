const { ccclass, property } = cc._decorator;

@ccclass
export default class HeroController extends cc.Component {
    @property
    moveSpeed: number = 300;

    @property
    jumpHeight: number = 100;

    rb: cc.RigidBody | null = null;
    moveDir: number = 0;
    isGrounded: boolean = false;

    onLoad(): void {
        this.rb = this.getComponent(cc.RigidBody);
        if (!this.rb) {
            this.rb = this.node.addComponent(cc.RigidBody);
        }

        this.rb.enabledContactListener = true;
        if (this.rb.type !== cc.RigidBodyType.Dynamic) {
            this.rb.type = cc.RigidBodyType.Dynamic;
        }
        if (!this.rb.fixedRotation) {
            this.rb.fixedRotation = true;
        }

        const collider = this.getComponent(cc.PhysicsBoxCollider) || this.node.addComponent(cc.PhysicsBoxCollider);
        const sprite = this.getComponent(cc.Sprite) || this.getComponentInChildren(cc.Sprite);
        const spriteNode = sprite ? sprite.node : this.node;
        const baseSize = spriteNode.getContentSize();
        const scaleX = spriteNode.scaleX === 0 ? 1 : spriteNode.scaleX;
        const scaleY = spriteNode.scaleY === 0 ? 1 : spriteNode.scaleY;
        const frame = sprite ? sprite.spriteFrame : null;
        const frameSize = frame ? frame.getOriginalSize() : cc.size(16, 16);
        const displaySize = (baseSize.width > 0 && baseSize.height > 0)
            ? cc.size(Math.abs(baseSize.width * scaleX), Math.abs(baseSize.height * scaleY))
            : cc.size(Math.abs(frameSize.width * scaleX), Math.abs(frameSize.height * scaleY));

        collider.size = cc.size(displaySize.width, displaySize.height);
        collider.offset = cc.v2(spriteNode.x, spriteNode.y);
        collider.apply();

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    update(dt: number): void {
        if (!this.rb) {
            return;
        }

        const velocity = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(this.moveDir * this.moveSpeed, velocity.y);

        if (this.moveDir !== 0) {
            this.playViewAction("move");
        } else {
            this.playViewAction("idle");
        }
    }

    onBeginContact(contact: cc.PhysicsContact, self: cc.Collider, other: cc.Collider): void {
        if (!other || !other.node) {
            return;
        }

        if (other.node.group === "wall" || other.node.group === "Wall") {
            const normal = contact.getWorldManifold().normal;
            if (normal && normal.y > 0.5) {
                this.isGrounded = true;
            }
        }
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.Collider, other: cc.Collider): void {
        if (other && other.node && (other.node.group === "wall" || other.node.group === "Wall")) {
            this.isGrounded = false;
        }
    }

    private onKeyDown(event: cc.Event.EventKeyboard): void {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this.moveDir = -1;
                this.playViewAction("move");
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this.moveDir = 1;
                this.playViewAction("move");
                break;
            case cc.macro.KEY.w:
            case cc.macro.KEY.space:
                if (this.rb && (this.isGrounded || Math.abs(this.rb.linearVelocity.y) < 0.01)) {
                    const gravity = Math.abs(cc.director.getPhysicsManager().gravity.y);
                    const jumpVelocity = Math.sqrt(2 * gravity * this.jumpHeight);
                    this.rb.linearVelocity = cc.v2(this.rb.linearVelocity.x, jumpVelocity);
                    this.isGrounded = false;
                    this.playViewAction("jump");
                }
                break;
        }
    }

    private onKeyUp(event: cc.Event.EventKeyboard): void {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                if (this.moveDir < 0) {
                    this.moveDir = 0;
                }
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                if (this.moveDir > 0) {
                    this.moveDir = 0;
                }
                break;
        }

        if (this.moveDir === 0) {
            this.playViewAction("idle");
        }
    }

    private playViewAction(actionName: string): void {
        const view = this.getComponent("HeroViewManager") as any;
        if (view && typeof view["playAction"] === "function") {
            view["playAction"](actionName);
        }
    }
}
