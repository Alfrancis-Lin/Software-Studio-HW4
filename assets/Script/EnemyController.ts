const { ccclass, property } = cc._decorator;

import { GroupNames } from "./GameTypes";

@ccclass
export default class EnemyController extends cc.Component {
    @property(cc.RigidBody)
    rb: cc.RigidBody | null = null;

    @property(cc.Sprite)
    sprite: cc.Sprite | null = null;

    @property
    moveSpeed: number = 60;

    @property
    stompDestroyDelay: number = 0.35;

    private _direction: number = -1;
    private _isStomped: boolean = false;

    onLoad(): void {
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
            this.rb.gravityScale = 0;
            this.rb.enabledContactListener = true;
        }
    }

    update(dt: number): void {
        if (!this.rb || this._isStomped) {
            return;
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

        if (this.isWallCollider(otherCollider) && this.isSideContact(contact, selfCollider)) {
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
            this.rb.gravityScale = 0;
            this.rb.enabledContactListener = false;
        }

        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (collider) {
            collider.enabled = false;
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
    }

    private isWallCollider(collider: cc.Collider): boolean {
        return collider.node.group === GroupNames.Wall;
    }

    private isSideContact(contact: cc.PhysicsContact, selfCollider: cc.Collider): boolean {
        let normal = contact.getWorldManifold().normal;
        if (contact.colliderA === selfCollider) {
            normal = cc.v2(-normal.x, -normal.y);
        }

        return Math.abs(normal.x) > 0.5;
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

        const atlas = (this.sprite as any)._atlas as cc.SpriteAtlas | null;
        if (!atlas) {
            return;
        }

        const stomped = atlas.getSpriteFrame("Goomba_1");
        if (stomped) {
            this.sprite.spriteFrame = stomped;
        }
    }

    private resolveSize(): cc.Size {
        if (this.sprite && this.sprite.spriteFrame) {
            return this.sprite.spriteFrame.getOriginalSize();
        }

        return cc.size(20, 24);
    }
}