const { ccclass, property } = cc._decorator;

import AudioManager from "./AudioManager";
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

    @property
    colliderPadding: number = 1;

    private _moveLeft: boolean = false;
    private _moveRight: boolean = false;
    private _jumpRequested: boolean = false;
    private _facingRight: boolean = true;
    private _isJumping: boolean = false;
    private _isBig: boolean = false;
    private _currentAtlas: cc.SpriteAtlas | null = null;
    private _runFrames: string[] = [];
    private _frameIndex: number = 0;
    private _frameTimer: number = 0;
    private _frameInterval: number = 0.12;
    private _gameManager: cc.Node | null = null;
    private _groundContactCount: number = 0;
    private _respawnLocked: boolean = false;
    private _jumpFrame: string | null = null;
    private _loggedSetup: boolean = false;

    public get isBig(): boolean {
        return this._isBig;
    }

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

        const collider = this.getComponent(cc.PhysicsBoxCollider) || this.node.addComponent(cc.PhysicsBoxCollider);
        this.ensureRigidBodySetup();
        this.ensurePhysicsManager();
        this.syncGameManagerReference();
        this.bindGameManagerEvents();

        this._currentAtlas = this.smallAtlas || this.bigAtlas || null;
        this.prepareFrames();
        this.applyCurrentAppearance(true);

        const frameSize = this.getSpriteSizeForState(this._isBig);
        collider.size = cc.size(frameSize.width, frameSize.height);
        collider.offset = cc.v2(0, 0);
        collider.apply();

        if (this.sprite) {
            this.sprite.sizeMode = cc.Sprite.SizeMode.RAW;
            this.sprite.node.setContentSize(frameSize);
        }
    }

    onEnable(): void {
        this.resetInputState();
        this.bindInput();
        cc.game.on(cc.game.EVENT_HIDE, this.onGameHidden, this);
    }

    onDisable(): void {
        this.unbindInput();
        cc.game.off(cc.game.EVENT_HIDE, this.onGameHidden, this);
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

        this._isJumping = !this.isGrounded() && Math.abs(this.rb.linearVelocity.y) > 2;

        if (this.node.y < this.fallDeathY && !this._respawnLocked) {
            this._respawnLocked = true;
            this.requestRespawn();
        }

        this.updateSpriteAnimation(dt);
    }

    public growUp(): void {
        this.setBigState(true);
    }

    public shrinkToSmall(): void {
        this.setBigState(false);
    }

    public setBigState(isBig: boolean): void {
        if (this._isBig === isBig && this._currentAtlas) {
            return;
        }

        this._isBig = isBig;
        this._currentAtlas = this._isBig ? (this.bigAtlas || this.smallAtlas || null) : (this.smallAtlas || this.bigAtlas || null);
        this.prepareFrames();
        this.applyCurrentAppearance(true);
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
            case cc.macro.KEY.w:
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

    private onGameHidden(): void {
        this.resetInputState();
    }

    private resetInputState(): void {
        this._moveLeft = false;
        this._moveRight = false;
        this._jumpRequested = false;
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
        AudioManager.instance?.playJump();
        this.refreshSpriteFrame(true);
    }

    private requestRespawn(): void {
        const manager = GameManager.instance;
        if (manager) {
            manager.loseLife("fall");
            return;
        }

        cc.warn("PlayerController: GameManager instance is missing, cannot respawn");
    }

    private syncGameManagerReference(): void {
        const manager = GameManager.instance;
        if (manager) {
            this._gameManager = manager.node;
            return;
        }

        if (this.gameManagerNode) {
            this._gameManager = this.gameManagerNode;
            return;
        }

        this._gameManager = null;
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
        this.setBigState(false);
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
        const usingBigAtlas = this._currentAtlas && this.bigAtlas && this._currentAtlas === this.bigAtlas;
        const runNames = usingBigAtlas
            ? ["mario_big_10", "mario_big_11"]
            : ["mario_small_1", "mario_small_2"];
        const jumpName = usingBigAtlas ? "mario_big_7" : "mario_small_4";

        this._runFrames = this.collectFrames(runNames);
        this._jumpFrame = this.hasFrame(jumpName) ? jumpName : null;

        if (!this._runFrames.length || !this._jumpFrame) {
            cc.warn("PlayerController: atlas frames are incomplete, check atlas.txt and atlas assignment in Inspector");
        }
    }

    private collectFrames(names: string[]): string[] {
        const result: string[] = [];
        for (const name of names) {
            if (this.hasFrame(name)) {
                result.push(name);
            }
        }

        return result;
    }

    private hasFrame(frameName: string): boolean {
        if (!this._currentAtlas) {
            return false;
        }

        return !!this._currentAtlas.getSpriteFrame(frameName);
    }

    private updateSpriteAnimation(dt: number): void {
        if (!this.sprite || !this._currentAtlas) {
            return;
        }

        if (this._isJumping || !this.isGrounded()) {
            this.applyJumpFrame();
            return;
        }

        if (!this._runFrames.length) {
            return;
        }

        if (!(this._moveLeft || this._moveRight)) {
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

    private applyCurrentAppearance(forceJump: boolean = false): void {
        this.updateColliderSizeForCurrentState();
        this.refreshSpriteFrame(forceJump);
    }

    private applyJumpFrame(): void {
        if (!this._currentAtlas || !this.sprite) {
            return;
        }

        if (this._jumpFrame) {
            this.applyFrame(this._jumpFrame);
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

    private updateColliderSizeForCurrentState(): void {
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            return;
        }

        const frameSize = this.getSpriteSizeForState(this._isBig);
        const width = Math.max(4, frameSize.width - this.colliderPadding * 2);
        const height = Math.max(4, frameSize.height - this.colliderPadding * 2);
        collider.size = cc.size(width, height);
        collider.offset = cc.v2(0, 0);
        collider.friction = 0;
        collider.restitution = 0;
        collider.apply();

        if (this.sprite) {
            this.sprite.node.setContentSize(frameSize);
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

    private isEnemyCollider(collider: cc.Collider | null): boolean {
        if (!collider || !collider.node) {
            return false;
        }

        return collider.node.group === GroupNames.Enemy;
    }

    private isItemCollider(collider: cc.Collider | null): boolean {
        if (!collider || !collider.node) {
            return false;
        }

        return collider.node.group === GroupNames.Item || !!collider.node.getComponent("ItemController");
    }

    private isHitFromAbove(otherCollider: cc.Collider): boolean {
        return this.node.y >= otherCollider.node.y + 4;
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        if (this.isGroundCollider(otherCollider)) {
            this._groundContactCount += 1;
            this._respawnLocked = false;
            return;
        }

        if (this.isItemCollider(otherCollider)) {
            const item = otherCollider.node.getComponent("ItemController") as any;
            if (item && typeof item.collectByPlayer === "function") {
                item.collectByPlayer(this.node);
            } else {
                this.growUp();
                otherCollider.node.destroy();
            }
            return;
        }

        if (this.isEnemyCollider(otherCollider)) {
            this.handleEnemyContact(otherCollider, contact);
        }
    }

    onEndContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        if (this.isGroundCollider(otherCollider)) {
            if (this._groundContactCount > 0) {
                this._groundContactCount -= 1;
            }
        }
    }

    private handleEnemyContact(otherCollider: cc.Collider, contact: cc.PhysicsContact): void {
        const enemyNode = otherCollider.node;
        const enemy = enemyNode.getComponent("EnemyController") as any;
        const stomped = this.isValidStomp(otherCollider);

        if (stomped && enemy && typeof enemy.stomp === "function") {
            enemy.stomp();
            AudioManager.instance?.playKick();
            if (this.rb) {
                this.rb.linearVelocity = cc.v2(this.rb.linearVelocity.x, 220);
            }
            return;
        }

        if (this._isBig) {
            this.shrinkToSmall();
            return;
        }

        this.requestRespawn();
    }

    private isValidStomp(otherCollider: cc.Collider): boolean {
        if (!this.rb) {
            return false;
        }

        const playerY = this.node.y;
        const enemyY = otherCollider.node.y;
        const yDelta = playerY - enemyY;
        const fallingFastEnough = this.rb.linearVelocity.y < -30;
        return yDelta > 10 && fallingFastEnough;
    }

    private getSpriteSizeForState(isBig: boolean): cc.Size {
        const atlas = isBig ? this.bigAtlas || this.smallAtlas : this.smallAtlas || this.bigAtlas;
        if (!atlas) {
            return cc.size(isBig ? 16 : 16, isBig ? 26 : 16);
        }

        const frameNames = isBig ? ["mario_big_10", "mario_big_7"] : ["mario_small_1", "mario_small_4"];
        for (const frameName of frameNames) {
            const frame = atlas.getSpriteFrame(frameName);
            if (frame) {
                return frame.getOriginalSize();
            }
        }

        const fallback = atlas.getSpriteFrame(isBig ? "mario_big_10" : "mario_small_1");
        if (fallback) {
            return fallback.getOriginalSize();
        }

        return cc.size(isBig ? 16 : 16, isBig ? 26 : 16);
    }
}
