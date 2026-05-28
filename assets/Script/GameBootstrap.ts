const { ccclass, property } = cc._decorator;

import AudioManager from "./AudioManager";
import GameManager from "./GameManager";
import LevelBuilder from "./LevelBuilder";
import CameraFollow from "./CameraFollow";
import { NodeNames } from "./GameTypes";

@ccclass
export default class GameBootstrap extends cc.Component {
	@property(cc.Node)
	playerNode: cc.Node | null = null;

	@property(cc.Node)
	cameraNode: cc.Node | null = null;

	@property(cc.Node)
	levelBuilderNode: cc.Node | null = null;

	@property(cc.Node)
	audioManagerNode: cc.Node | null = null;

	onLoad(): void {
		this.ensurePhysicsEnabled();
		this.resolveSceneNodes();
		this.ensureAudioManager();
	}

	start(): void {
		this.bindCameraTarget();
		this.registerPlayerSpawn();
		this.scheduleOnce(this.applySpawnPositionToPlayer, 0);
		this.scheduleOnce(this.applySpawnPositionToPlayer, 0.08);
	}

	private resolveSceneNodes(): void {
		if (!this.playerNode) {
			this.playerNode = cc.find(NodeNames.Player);
		}

		if (!this.cameraNode) {
			this.cameraNode = cc.find(NodeNames.MainCamera);
		}

		if (!this.levelBuilderNode) {
			this.levelBuilderNode = cc.find(NodeNames.LevelBuilder);
		}

		if (!this.audioManagerNode) {
			this.audioManagerNode = cc.find(NodeNames.AudioManager);
		}
	}

	private ensurePhysicsEnabled(): void {
		const physics = cc.director.getPhysicsManager();
		physics.enabled = true;
		physics.gravity = cc.v2(0, -980);
	}

	private ensureAudioManager(): void {
		if (!this.audioManagerNode) {
			return;
		}

		if (!this.audioManagerNode.getComponent(AudioManager)) {
			this.audioManagerNode.addComponent(AudioManager);
		}
	}

	private bindCameraTarget(): void {
		if (!this.cameraNode || !this.playerNode) {
			return;
		}

		const follow = this.cameraNode.getComponent(CameraFollow);
		if (follow) {
			follow.target = this.playerNode;
		}
	}

	private registerPlayerSpawn(): void {
		const manager = GameManager.instance;
		if (!manager || !this.playerNode) {
			return;
		}

		if (this.levelBuilderNode) {
			return;
		}

		if (manager.playerSpawn.x === 0 && manager.playerSpawn.y === 0) {
			manager.playerSpawn = cc.v2(this.playerNode.position.x, this.playerNode.position.y);
		}
	}

	private applySpawnPositionToPlayer(): void {
		const manager = GameManager.instance;
		if (!manager || !this.playerNode) {
			return;
		}

		const spawn = manager.playerSpawn;
		if (spawn.x === 0 && spawn.y === 0) {
			return;
		}

		this.playerNode.setPosition(spawn.x, spawn.y);
		const rb = this.playerNode.getComponent(cc.RigidBody);
		if (rb) {
			rb.linearVelocity = cc.v2(0, 0);
			rb.angularVelocity = 0;
		}
	}

}
