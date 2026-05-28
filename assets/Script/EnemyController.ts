const { ccclass, property } = cc._decorator;

import { GroupNames } from "./GameTypes";

@ccclass
export default class EnemyController extends cc.Component {
    @property(cc.RigidBody)
    rb: cc.RigidBody | null = null;

    @property(cc.Sprite)
    sprite: cc.Sprite | null = null;

    @property(cc.SpriteAtlas)
    goombaAtlas: cc.SpriteAtlas | null = null;

    @property
    moveSpeed: number = 60;

    @property
    stompDestroyDelay: number = 0.35;

    @property
    turnCooldown: number = 0.08;

    private _direction: number = -1;
    private _isStomped: boolean = false;
    private _turnCooldownTimer: number = 0;

    onLoad(): void {
        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite) || this.getComponentInChildren(cc.Sprite);
        }

        if (!this.goombaAtlas && this.sprite) {
            this.goombaAtlas = (this.sprite as any)._atlas as cc.SpriteAtlas | null;
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
        collider.radius = Math.max(6, Math.min(size.width, size.height) * 0.45);
        collider.offset = cc.v2(0, 0);
        collider.apply();

        if (this.sprite) {
            this.sprite.sizeMode = cc.Sprite.SizeMode.RAW;
            this.sprite.node.setContentSize(size);
        }

        if (this.rb) {
            this.rb.type = cc.RigidBodyType.Dynamic;
            this.rb.fixedRotation = true;
            this.rb.enabledContactListener = true;
        }
    }

    update(dt: number): void {
        if (!this.rb || this._isStomped) {
            return;
        }

        if (this._turnCooldownTimer > 0) {
            this._turnCooldownTimer -= dt;
        }

        const velocity = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(this._direction * this.moveSpeed, velocity.y);
        this.applyFacing();
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        if (!otherCollider || !otherCollider.node) {
            return;
        }

        if (this._isStomped) {
            return;
        }

        if (this.isWallCollider(otherCollider) && this.shouldTurnAround(contact, selfCollider)) {
            this.reverseDirection();
        }
    }

    onPreSolve(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        if (!otherCollider || !otherCollider.node || this._isStomped) {
            return;
        }

        if (this.isWallCollider(otherCollider) && this.shouldTurnAround(contact, selfCollider)) {
            this.reverseDirection();
        }
    }

    public stomp(): void {
        if (this._isStomped) {
            return;
        }

        this._isStomped = true;
        this.moveSpeed = 0;

        if (this.rb) {
            this.rb.linearVelocity = cc.v2(0, 0);
            this.rb.enabledContactListener = false;
        }

        const boxCollider = this.getComponent(cc.PhysicsBoxCollider);
        if (boxCollider) {
            boxCollider.enabled = false;
        }

        const circleCollider = this.getComponent(cc.PhysicsCircleCollider);
        if (circleCollider) {
            circleCollider.enabled = false;
        }

        this.applyStompedSprite();
        this.scheduleOnce(() => {
            if (this.node && this.node.isValid) {
                this.node.destroy();
            }
        }, this.stompDestroyDelay);
    }

    private reverseDirection(): void {
        this._direction *= -1;
        this._turnCooldownTimer = this.turnCooldown;
    }

    private isWallCollider(collider: cc.Collider): boolean {
        return collider.node.group === GroupNames.Wall;
    }

    private shouldTurnAround(contact: cc.PhysicsContact, selfCollider: cc.Collider): boolean {
        if (this._turnCooldownTimer > 0) {
            return false;
        }

        let normal = contact.getWorldManifold().normal;
        if (contact.colliderA === selfCollider) {
            normal = cc.v2(-normal.x, -normal.y);
        }

        return Math.abs(normal.x) > 0.2;
    }

    private applyFacing(): void {
        if (!this.sprite) {
            return;
        }

        this.sprite.node.scaleX = this._direction >= 0 ? 1 : -1;
    }

    private applyStompedSprite(): void {
        if (!this.sprite) {
            return;
        }

        const atlas = this.goombaAtlas || (this.sprite as any)._atlas as cc.SpriteAtlas | null;
        if (!atlas) {
            return;
        }

        const stomped = atlas.getSpriteFrame("Goomba_1");
        if (stomped) {
            this.sprite.spriteFrame = stomped;
            return;
        }

        cc.warn("EnemyController: Goomba_1 frame not found in assigned atlas");
    }

    private resolveSize(): cc.Size {
        if (this.sprite && this.sprite.spriteFrame) {
            return this.sprite.spriteFrame.getOriginalSize();
        }

        return cc.size(20, 24);
    }
}