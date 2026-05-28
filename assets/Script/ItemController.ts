const { ccclass, property } = cc._decorator;

import AudioManager from "./AudioManager";
import PlayerController from "./Player controller";
import { GroupNames } from "./GameTypes";

@ccclass
export default class ItemController extends cc.Component {
    @property(cc.RigidBody)
    rb: cc.RigidBody | null = null;

    @property(cc.Sprite)
    sprite: cc.Sprite | null = null;

    @property
    moveSpeed: number = 80;

    @property
    launchSpeed: number = 180;

    @property
    launchDuration: number = 0.18;

    private _direction: number = 1;
    private _launchTimer: number = 0;
    private _pickupEnabled: boolean = false;

    onLoad(): void {
        this.node.group = GroupNames.Item;

        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite) || this.getComponentInChildren(cc.Sprite);
        }

        if (!this.rb) {
            this.rb = this.getComponent(cc.RigidBody);
        }

        if (!this.rb) {
            this.rb = this.node.addComponent(cc.RigidBody);
        }

        const boxCollider = this.getComponent(cc.PhysicsBoxCollider);
        if (boxCollider) {
            boxCollider.enabled = false;
        }

        const collider = this.getComponent(cc.PhysicsCircleCollider) || this.node.addComponent(cc.PhysicsCircleCollider);
        const size = this.resolveSize();
        collider.radius = Math.max(4, Math.min(size.width, size.height) * 0.45);
        collider.offset = cc.v2(0, 0);
        collider.friction = 0;
        collider.restitution = 0;
        collider.apply();

        if (this.sprite) {
            this.sprite.sizeMode = cc.Sprite.SizeMode.RAW;
            this.sprite.node.setContentSize(size);
        }

        if (this.rb) {
            this.rb.type = cc.RigidBodyType.Dynamic;
            this.rb.fixedRotation = true;
            this.rb.gravityScale = 1;
            this.rb.enabledContactListener = true;
        }
    }

    update(dt: number): void {
        if (!this.rb) {
            return;
        }

        if (this._launchTimer > 0) {
            this._launchTimer -= dt;
        }

        const velocity = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(this._direction * this.moveSpeed, velocity.y);
        this.applyFacing();
    }

    public launchFromBlock(blockNode?: cc.Node): void {
        if (!this.rb) {
            return;
        }

        this._pickupEnabled = false;
        this._launchTimer = this.launchDuration;
        this.rb.linearVelocity = cc.v2(this._direction * this.moveSpeed * 0.5, this.launchSpeed);
        this.scheduleOnce(() => {
            this._pickupEnabled = true;
        }, this.launchDuration);
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        if (!otherCollider || !otherCollider.node) {
            return;
        }

        if (this._pickupEnabled && (this.isPlayerCollider(otherCollider) || this.isPlayerNode(otherCollider.node))) {
            this.collectByPlayer(otherCollider.node);
            return;
        }

        if (this.isWallCollider(otherCollider) && this.isSideContact(contact, selfCollider, otherCollider)) {
            this.reverseDirection();
        }
    }

    private collectByPlayer(playerNode: cc.Node): void {
        AudioManager.instance?.playPowerUp();

        const player = playerNode.getComponent(PlayerController);
        if (player) {
            player.growUp();
        }

        this.node.destroy();
    }

    private reverseDirection(): void {
        this._direction *= -1;
    }

    private isWallCollider(collider: cc.Collider): boolean {
        return collider.node.group === GroupNames.Wall;
    }

    private isPlayerCollider(collider: cc.Collider): boolean {
        return collider.node.group === GroupNames.Player;
    }

    private isPlayerNode(node: cc.Node): boolean {
        return !!node.getComponent(PlayerController);
    }

    private isSideContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): boolean {
        const normal = this.resolveNormal(contact, selfCollider);
        return Math.abs(normal.x) > 0.5;
    }

    private resolveNormal(contact: cc.PhysicsContact, selfCollider: cc.Collider): cc.Vec2 {
        let normal = contact.getWorldManifold().normal;
        if (contact.colliderA === selfCollider) {
            normal = cc.v2(-normal.x, -normal.y);
        }
        return normal;
    }

    private applyFacing(): void {
        if (!this.sprite) {
            return;
        }

        this.sprite.node.scaleX = this._direction >= 0 ? 1 : -1;
    }

    private resolveSize(): cc.Size {
        if (this.sprite && this.sprite.spriteFrame) {
            return this.sprite.spriteFrame.getOriginalSize();
        }

        return cc.size(16, 16);
    }
}