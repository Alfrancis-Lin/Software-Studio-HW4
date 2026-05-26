const { ccclass, property } = cc._decorator;

import GameManager from "./GameManager";
import { GroupNames } from "./GameTypes";

@ccclass
export default class PlayerController extends cc.Component {
    @property(cc.RigidBody)
    rb: cc.RigidBody | null = null;

    @property(cc.Sprite)
    sprite: cc.Sprite | null = null;

    @property(cc.SpriteAtlas)
    smallAtlas: cc.SpriteAtlas | null = null;

    @property(cc.SpriteAtlas)
    bigAtlas: cc.SpriteAtlas | null = null;

    @property(cc.Node)
    gameManagerNode: cc.Node | null = null;

    @property
    moveSpeed: number = 220;

    @property
    jumpImpulse: number = 520;

    @property
    fallDeathY: number = -400;

    private _moveLeft: boolean = false;
    private _moveRight: boolean = false;
    private _jumpRequested: boolean = false;
    private _facingRight: boolean = true;
    private _isJumping: boolean = false;
    private _currentAtlas: cc.SpriteAtlas | null = null;
    private _runFrames: string[] = [];
    private _jumpFrames: string[] = [];
    private _frameIndex: number = 0;
    private _frameTimer: number = 0;
    private _frameInterval: number = 0.12;
    private _gameManager: cc.Node | null = null;
    private _groundContactCount: number = 0;
    private _respawnLocked: boolean = false;
    private _jumpFrameUp: string | null = null;
    private _jumpFrameApex: string | null = null;
    private _jumpFrameDown: string | null = null;
    private _loggedSetup: boolean = false;

    onLoad(): void {
        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite);
        }

        if (!this.sprite) {
            this.sprite = this.getComponentInChildren(cc.Sprite);
        }

        if (!this.rb) {
            this.rb = this.getComponent(cc.RigidBody);
        }

        if (!this.rb) {
            this.rb = this.node.addComponent(cc.RigidBody);
        }

        if (!this.getComponent(cc.PhysicsCollider)) {
            const collider = this.node.addComponent(cc.PhysicsBoxCollider);
            collider.size = cc.size(48, 64);
            collider.offset = cc.v2(0, 0);
            collider.apply();
        }

        this.ensureRigidBodySetup();
        this.ensurePhysicsManager();

        this._currentAtlas = this.smallAtlas || this.bigAtlas || null;
        this.prepareFrames();
        this.syncGameManagerReference();
        this.bindGameManagerEvents();
        this.refreshSpriteFrame(true);
    }

    onEnable(): void {
        this.bindInput();
    }

    onDisable(): void {
        this.unbindInput();
    }

    onDestroy(): void {
        this.unbindInput();
        this.unbindGameManagerEvents();
    }

    update(dt: number): void {
        if (!this._loggedSetup) {
            this.logSetupWarnings();
            this._loggedSetup = true;
        }

        if (!this.rb) {
            return;
        }

        const velocity = this.rb.linearVelocity;
        let horizontalVelocity = 0;
        const isMoving = this._moveLeft || this._moveRight;

        if (this._moveLeft) {
            horizontalVelocity -= this.moveSpeed;
            this._facingRight = false;
        }

        if (this._moveRight) {
            horizontalVelocity += this.moveSpeed;
            this._facingRight = true;
        }

        this.rb.linearVelocity = cc.v2(horizontalVelocity, velocity.y);

        if (this._jumpRequested) {
            this._jumpRequested = false;
            this.tryJump();
        }

        this._isJumping = !this.isGrounded() && Math.abs(this.rb.linearVelocity.y) > 0.01;

        if (this.node.y < this.fallDeathY && !this._respawnLocked) {
            this._respawnLocked = true;
            this.requestRespawn();
        }

        this.updateSpriteAnimation(dt);
    }

    private bindInput(): void {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    private unbindInput(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(event: cc.Event.EventKeyboard): void {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this._moveLeft = true;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this._moveRight = true;
                break;
            case cc.macro.KEY.space:
                this._jumpRequested = true;
                break;
        }
    }

    private onKeyUp(event: cc.Event.EventKeyboard): void {
        switch (event.keyCode) {
            case cc.macro.KEY.a:
            case cc.macro.KEY.left:
                this._moveLeft = false;
                break;
            case cc.macro.KEY.d:
            case cc.macro.KEY.right:
                this._moveRight = false;
                break;
        }
    }

    private tryJump(): void {
        if (!this.rb) {
            return;
        }

        const velocity = this.rb.linearVelocity;
        if (!this.isGrounded() && Math.abs(velocity.y) > 0.01) {
            return;
        }

        this.rb.linearVelocity = cc.v2(velocity.x, 0);
        this.rb.applyLinearImpulse(cc.v2(0, this.jumpImpulse), this.rb.getWorldCenter(), true);
        this._isJumping = true;
        this.refreshSpriteFrame(true);
    }

    private requestRespawn(): void {
        const manager = GameManager.instance;
        if (manager) {
            manager.loseLife("fall");
        } else {
            cc.warn("PlayerController: GameManager instance is missing, cannot respawn");
        }
    }

    private syncGameManagerReference(): void {
        if (this.gameManagerNode) {
            this._gameManager = this.gameManagerNode;
            return;
        }

        const manager = cc.find("GameManager");
        this._gameManager = manager || null;
    }

    private bindGameManagerEvents(): void {
        if (!this._gameManager) {
            return;
        }

        this._gameManager.on("game-manager-respawn", this.onRespawnRequested, this);
        this._gameManager.on("game-manager-gameover", this.onGameOver, this);
    }

    private unbindGameManagerEvents(): void {
        if (!this._gameManager) {
            return;
        }

        this._gameManager.off("game-manager-respawn", this.onRespawnRequested, this);
        this._gameManager.off("game-manager-gameover", this.onGameOver, this);
    }

    private onRespawnRequested(spawnPosition: cc.Vec2): void {
        if (!spawnPosition) {
            return;
        }

        this.node.setPosition(spawnPosition);
        if (this.rb) {
            this.rb.linearVelocity = cc.v2(0, 0);
            this.rb.angularVelocity = 0;
        }
        this._isJumping = false;
        this._respawnLocked = false;
        this.refreshSpriteFrame(true);
    }

    private onGameOver(): void {
        if (this.rb) {
            this.rb.linearVelocity = cc.v2(0, 0);
        }
    }

    private ensureRigidBodySetup(): void {
        if (!this.rb) {
            return;
        }

        if (this.rb.type !== cc.RigidBodyType.Dynamic) {
            this.rb.type = cc.RigidBodyType.Dynamic;
        }

        if (!this.rb.fixedRotation) {
            this.rb.fixedRotation = true;
        }

        if (this.rb.gravityScale === 0) {
            this.rb.gravityScale = 1;
        }

        this.rb.enabledContactListener = true;
    }

    private ensurePhysicsManager(): void {
        const physics = cc.director.getPhysicsManager();
        if (physics && !physics.enabled) {
            physics.enabled = true;
            physics.gravity = cc.v2(0, -980);
            cc.warn("PlayerController: PhysicsManager was disabled and has been enabled at runtime");
        }
    }

    private logSetupWarnings(): void {
        if (!this.rb) {
            cc.warn("PlayerController: missing RigidBody on Player node");
        }

        if (!this.sprite) {
            cc.warn("PlayerController: missing Sprite on Player node");
        }

        const collider = this.getComponent(cc.PhysicsCollider);
        if (!collider) {
            cc.warn("PlayerController: missing PhysicsCollider on Player node");
        }

        if (!this.smallAtlas && !this.bigAtlas) {
            cc.warn("PlayerController: atlas not assigned; movement will work but animations will stay on the current sprite frame");
        }
    }

    private prepareFrames(): void {
        const usingBig = this._currentAtlas && this.bigAtlas && this._currentAtlas === this.bigAtlas;
        const runNames = usingBig
            ? ["mario_big_10", "mario_big_11"]
            : ["mario_small_1", "mario_small_2"];
        const jumpNames = usingBig
            ? ["mario_big_7", "mario_big_8"]
            : ["mario_small_3", "mario_small_4", "mario_small_5"];

        this._runFrames = this.collectFrames(runNames);
        this._jumpFrames = this.collectFrames(jumpNames);

        if (usingBig) {
            this._jumpFrameUp = this._jumpFrames[0] || null;
            this._jumpFrameApex = this._jumpFrames[0] || null;
            this._jumpFrameDown = this._jumpFrames[1] || this._jumpFrames[0] || null;
        } else {
            this._jumpFrameUp = this._jumpFrames[0] || null;
            this._jumpFrameApex = this._jumpFrames[1] || this._jumpFrames[0] || null;
            this._jumpFrameDown = this._jumpFrames[2] || this._jumpFrames[1] || this._jumpFrames[0] || null;
        }

        if (!this._runFrames.length || !this._jumpFrames.length) {
            cc.warn("PlayerController: atlas frames are incomplete, check atlas.txt and atlas assignment in Inspector");
        }
    }

    private collectFrames(names: string[]): string[] {
        const result: string[] = [];
        if (!this._currentAtlas) {
            return result;
        }

        for (const name of names) {
            const frame = this._currentAtlas.getSpriteFrame(name);
            if (frame) {
                result.push(name);
            }
        }

        return result;
    }

    private updateSpriteAnimation(dt: number): void {
        if (!this.sprite || !this._currentAtlas) {
            return;
        }

        const isMoving = this._moveLeft || this._moveRight;

        if (this._isJumping) {
            this.applyJumpFrame();
            return;
        }

        if (!this._runFrames.length) {
            return;
        }

        if (!isMoving) {
            this._frameIndex = 0;
            this.applyFrame(this._runFrames[0]);
            return;
        }

        this._frameTimer += dt;
        if (this._frameTimer < this._frameInterval) {
            return;
        }

        this._frameTimer = 0;
        this._frameIndex = (this._frameIndex + 1) % this._runFrames.length;
        this.applyFrame(this._runFrames[this._frameIndex]);
    }

    private refreshSpriteFrame(forceJump: boolean = false): void {
        if (!this.sprite || !this._currentAtlas) {
            return;
        }

        if (forceJump || this._isJumping) {
            this.applyJumpFrame();
            return;
        }

        if (!this._runFrames.length) {
            return;
        }

        this._frameIndex = 0;
        this.applyFrame(this._runFrames[0]);
    }

    private applyJumpFrame(): void {
        if (!this._currentAtlas || !this.sprite) {
            return;
        }

        const velocityY = this.rb ? this.rb.linearVelocity.y : 0;
        let frameName = this._jumpFrameUp || this._jumpFrameApex || this._jumpFrameDown;

        if (velocityY > 40 && this._jumpFrameUp) {
            frameName = this._jumpFrameUp;
        } else if (velocityY < -40 && this._jumpFrameDown) {
            frameName = this._jumpFrameDown;
        } else if (this._jumpFrameApex) {
            frameName = this._jumpFrameApex;
        }

        if (frameName) {
            this.applyFrame(frameName);
        }
    }

    private applyFrame(frameName: string): void {
        if (!this._currentAtlas || !this.sprite) {
            return;
        }

        const frame = this._currentAtlas.getSpriteFrame(frameName);
        if (frame) {
            this.sprite.spriteFrame = frame;
            this.sprite.node.scaleX = this._facingRight ? 1 : -1;
        }
    }

    private isGrounded(): boolean {
        return this._groundContactCount > 0;
    }

    private isGroundCollider(collider: cc.Collider | null): boolean {
        if (!collider || !collider.node) {
            return false;
        }

        const group = collider.node.group;
        return group === GroupNames.Wall || group === GroupNames.Item;
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        const normal = contact.getWorldManifold().normal;
        if (this.isGroundCollider(otherCollider) && normal && normal.y > 0.5) {
            this._groundContactCount += 1;
        }
    }

    onEndContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        if (this.isGroundCollider(otherCollider) && this._groundContactCount > 0) {
            this._groundContactCount -= 1;
        }
    }
}
