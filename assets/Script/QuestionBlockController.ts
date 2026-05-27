const { ccclass, property } = cc._decorator;

import GameManager from "./GameManager";
import { EventNames, GroupNames } from "./GameTypes";
import ItemController from "./ItemController";

@ccclass
export default class QuestionBlockController extends cc.Component {
    @property(cc.Sprite)
    sprite: cc.Sprite | null = null;

    @property(cc.SpriteFrame)
    usedSprite: cc.SpriteFrame | null = null;

    @property(cc.Prefab)
    itemPrefab: cc.Prefab | null = null;

    @property(cc.Node)
    gameManagerNode: cc.Node | null = null;

    @property
    scoreValue: number = 100;

    @property
    itemSpawnOffsetY: number = 18;

    private _isUsed: boolean = false;
    private _gameManager: cc.Node | null = null;
    private _originalY: number = 0;

    onLoad(): void {
        if (!this.sprite) {
            this.sprite = this.getComponent(cc.Sprite) || this.getComponentInChildren(cc.Sprite);
        }

        const rigidBody = this.getComponent(cc.RigidBody) || this.node.addComponent(cc.RigidBody);
        rigidBody.type = cc.RigidBodyType.Static;
        rigidBody.fixedRotation = true;
        rigidBody.gravityScale = 0;
        rigidBody.enabledContactListener = true;

        const collider = this.getComponent(cc.PhysicsBoxCollider) || this.node.addComponent(cc.PhysicsBoxCollider);
        const size = this.resolveSize();
        collider.size = size;
        collider.offset = cc.v2(0, 0);
        collider.apply();

        if (this.sprite) {
            this.sprite.sizeMode = cc.Sprite.SizeMode.RAW;
            this.sprite.node.setContentSize(size);
        }

        this._originalY = this.node.y;
        this.syncGameManagerReference();
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.Collider, otherCollider: cc.Collider): void {
        if (this._isUsed || !this.isPlayerCollider(otherCollider)) {
            return;
        }

        if (!this.isHitFromBelow(otherCollider)) {
            return;
        }

        this.triggerHit();
    }

    public triggerHit(): void {
        if (this._isUsed) {
            return;
        }

        this._isUsed = true;
        this.playUseAnimation();
        this.applyUsedSprite();
        this.spawnItem();
        this.addScore();
        this.node.emit(EventNames.QuestionBlockUsed, this.node);
    }

    private syncGameManagerReference(): void {
        const manager = GameManager.instance;
        if (manager) {
            this._gameManager = manager.node;
            return;
        }

        if (this.gameManagerNode) {
            this._gameManager = this.gameManagerNode;
        }
    }

    private addScore(): void {
        const manager = GameManager.instance;
        if (manager) {
            manager.addScore(this.scoreValue);
        }
    }

    private spawnItem(): void {
        if (!this.itemPrefab) {
            cc.warn("QuestionBlockController: itemPrefab is not assigned yet");
            return;
        }

        const itemNode = cc.instantiate(this.itemPrefab);
        const parent = this.node.parent || this.node;
        itemNode.parent = parent;

        if (!itemNode.getComponent(ItemController)) {
            itemNode.addComponent(ItemController);
        }

        const itemSize = this.getNodeSize(itemNode);
        const blockSize = this.resolveSize();
        itemNode.setPosition(this.node.x, this.node.y + blockSize.height * 0.5 + itemSize.height * 0.5 + this.itemSpawnOffsetY);

        const itemController = itemNode.getComponent(ItemController);
        if (itemController) {
            itemController.launchFromBlock(this.node);
        }
    }

    private playUseAnimation(): void {
        const riseBy = 6;
        cc.tween(this.node)
            .to(0.08, { y: this._originalY + riseBy })
            .to(0.08, { y: this._originalY })
            .start();
    }

    private applyUsedSprite(): void {
        if (!this.sprite || !this.usedSprite) {
            return;
        }

        this.sprite.spriteFrame = this.usedSprite;
    }

    private isPlayerCollider(otherCollider: cc.Collider): boolean {
        return !!otherCollider && !!otherCollider.node && otherCollider.node.group === GroupNames.Player;
    }

    private isHitFromBelow(otherCollider: cc.Collider): boolean {
        return otherCollider.node.y < this.node.y - 2;
    }

    private resolveSize(): cc.Size {
        if (this.sprite && this.sprite.spriteFrame) {
            return this.sprite.spriteFrame.getOriginalSize();
        }

        return cc.size(16, 16);
    }

    private getNodeSize(node: cc.Node): cc.Size {
        const sprite = node.getComponent(cc.Sprite) || node.getComponentInChildren(cc.Sprite);
        if (sprite && sprite.spriteFrame) {
            return sprite.spriteFrame.getOriginalSize();
        }

        return node.getContentSize();
    }
}