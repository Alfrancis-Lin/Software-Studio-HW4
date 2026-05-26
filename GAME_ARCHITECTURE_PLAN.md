# Game Architecture Plan (Cocos Creator 2.4.8)

## Status
- [x] Plan drafted and saved before gameplay code changes.
- [ ] Plan reviewed and approved for implementation.
- [ ] Minimal movement test scene verified in-editor.

## Development Rules (Must Follow)
- Update this document before any gameplay code changes.
- Work step-by-step; do not implement everything at once.
- After each step, record: what changed, how to test, and any Cocos settings or asset wiring needed.
- Mark completed steps and keep the checklist current for tracking.
- Use `atlas.txt` as the source of truth for sprite frame names and state mapping.
- When a movement or physics issue appears, add debug logs and validate RigidBody type, collider, physics manager, and prefab wiring.

## Scope Summary
Build a modular gameplay layer with clear ownership: one global state manager, one audio manager, and small actor components for player, enemy, blocks, camera, and UI. All scripts must use Cocos Creator 2.4.x APIs (cc.systemEvent, cc.audioEngine, physics onBeginContact, cc.v2, cc.director.loadScene).

## Atlas Rules
- Player movement visuals should use `assets/Art/player/mario_small.plist` as the default sprite atlas.
- If the player is upgraded later, use `assets/Art/player/mario_big.plist`.
- Use the names in `atlas.txt` exactly:
	- `mario_small_1~2` for running
	- `mario_small_3~5` for jump
	- `mario_big_10~11` for running
	- `mario_big_7~8` for jump
- Use `Goomba_0` and `Goomba_1` for enemy normal/stomped states.
- Use `item_10~14` for question blocks and `item_46~51` for spawned items.

## Level Layout Rules
- Anchor the playable map so the bottom ground row is visible in the camera view.
- Prefer a configurable world origin in the level builder instead of hardcoding negative-only positions.
- Keep the camera Y fixed and move the world / player spawn so the first playable ground row is near the viewport bottom.

## Scene Wiring Assumptions
- StartMenu: Canvas -> Main Camera, Background, GameTitle, Btn_Start
- LevelSelect: Canvas -> Main Camera, Background, SceneTitle, Btn_World_1_1, Btn_Back
- Game: Canvas -> Game_World -> Background_Layer/BG_Sprite, Static_Walls/Ground_Block_01, Question_Blocks/QBlock_01, Enemies/Goomba_01, Player
- Game: Main Camera -> UI_Layer -> Score_Label, Life_Label, Timer_Label, GameOver_Panel (Btn_Restart)
- Game: AudioManager (empty node)

## Scripts to Create (Complete List)
1. GameManager.ts
2. AudioManager.ts
3. StartMenuController.ts
4. LevelSelectController.ts
5. GameBootstrap.ts
6. LevelBuilder.ts
7. PlayerController.ts
8. EnemyController.ts
9. QuestionBlockController.ts
10. ItemController.ts (optional, only if item needs its own logic)
11. CameraFollow.ts
12. UIHUDController.ts
13. GameOverPanelController.ts
14. GameTypes.ts (shared enums/constants)

## Architectural Blueprint (Per Script)

### 1) GameManager.ts
**Role**: Global state owner for score, life, timer, respawn logic, and scene flow.
**Properties (@property)**
- @property({ type: cc.Integer }) startLife = 3
- @property({ type: cc.Integer }) startScore = 0
- @property({ type: cc.Integer }) startTimer = 300
- @property({ type: cc.Float }) respawnDelay = 0.5
- @property({ type: cc.Vec2 }) playerSpawn = cc.v2(0, 0) (or set in editor)
**Key Methods / Events**
- onLoad(): singleton setup, persist if needed
- start(): initialize score/life/timer
- update(dt): timer countdown and timeout check
- addScore(points)
- loseLife(reason)
- requestRespawn()
- resetGameState()
- showGameOver()
- loadSceneStartMenu(), loadSceneLevelSelect(), loadSceneGame()

### 2) AudioManager.ts
**Role**: Central audio playback using cc.audioEngine.
**Properties (@property)**
- @property({ type: cc.AudioClip }) bgm
- @property({ type: cc.AudioClip }) sfxJump
- @property({ type: cc.AudioClip }) sfxStomp
- @property({ type: cc.AudioClip }) sfxHurt
- @property({ type: cc.AudioClip }) sfxGameOver
**Key Methods / Events**
- playBgm(loop = true)
- stopBgm()
- playSfx(clip)
- playJump(), playStomp(), playHurt(), playGameOver()

### 3) StartMenuController.ts
**Role**: StartMenu scene button wiring.
**Properties (@property)**
- @property({ type: cc.Button }) btnStart
**Key Methods / Events**
- onLoad(): bind btnStart click
- onStartClicked(): cc.director.loadScene("LevelSelect")

### 4) LevelSelectController.ts
**Role**: Level selection and back navigation.
**Properties (@property)**
- @property({ type: cc.Button }) btnWorld11
- @property({ type: cc.Button }) btnBack
**Key Methods / Events**
- onLoad(): bind both buttons
- onWorld11Clicked(): cc.director.loadScene("Game")
- onBackClicked(): cc.director.loadScene("StartMenu")

### 5) GameBootstrap.ts
**Role**: Game scene wiring and cached references.
**Properties (@property)**
- @property({ type: cc.Node }) playerNode
- @property({ type: cc.Node }) cameraNode
- @property({ type: cc.Node }) uiLayer
- @property({ type: cc.Node }) audioManagerNode
**Key Methods / Events**
- onLoad(): validate node refs, init physics/collision state if needed
- start(): bind UI controller and camera follow
- resetScene(): respawn player and reset local scene state

### 6) PlayerController.ts
**Role**: Player movement, jump, fall death, and contact interpretation.
**Properties (@property)**
- @property({ type: cc.RigidBody }) rb
- @property({ type: cc.Float }) moveSpeed = 220
- @property({ type: cc.Float }) jumpImpulse = 520
- @property({ type: cc.Float }) fallDeathY = -400
- @property({ type: cc.Node }) gameManagerNode
- @property({ type: cc.Node }) audioManagerNode
**Key Methods / Events**
- onLoad(): cache manager refs, register keyboard listeners (cc.systemEvent)
- onEnable()/onDisable(): add/remove input listeners
- update(dt): apply horizontal velocity, check fall death
- tryJump(): only if rb.linearVelocity.y == 0
- onBeginContact(contact, selfCollider, otherCollider): stomp vs hurt routing
- requestRespawn(): call GameManager

### 7) EnemyController.ts
**Role**: Simple patrol, wall turn-around, and stomp death.
**Properties (@property)**
- @property({ type: cc.RigidBody }) rb
- @property({ type: cc.Float }) moveSpeed = 120
- @property({ type: cc.Node }) gameManagerNode
- @property({ type: cc.Node }) audioManagerNode
**Key Methods / Events**
- start(): initial patrol direction
- update(dt): keep velocity on x
- onBeginContact(contact, self, other): if wall then flip direction
- dieByStomp(): play anim/sfx and destroy

### 8) QuestionBlockController.ts
**Role**: Hit-from-below detection, one-time use state, item drop, and score.
**Properties (@property)**
- @property({ type: cc.SpriteFrame }) usedSprite
- @property({ type: cc.Prefab }) itemPrefab
- @property({ type: cc.Node }) gameManagerNode
- @property({ type: cc.Node }) audioManagerNode
- @property({ type: cc.Integer }) scoreValue = 100
**Key Methods / Events**
- onBeginContact(contact, self, other): check hit from below
- triggerHit(): swap sprite, spawn item, add score

### 9) ItemController.ts (Optional)
**Role**: Movement/collection for spawned items (mushroom).
**Properties (@property)**
- @property({ type: cc.RigidBody }) rb
- @property({ type: cc.Float }) moveSpeed = 80
**Key Methods / Events**
- update(dt): simple horizontal movement
- onBeginContact(contact, self, other): if player, apply effect and destroy

### 10) CameraFollow.ts
**Role**: Follow Player.x with constant Y.
**Properties (@property)**
- @property({ type: cc.Node }) target
- @property({ type: cc.Float }) fixedY = 0
**Key Methods / Events**
- lateUpdate(): set cameraNode.x = target.x, keep Y

### 11) LevelBuilder.ts
**Role**: Build the level from a string map using prefabs for ground, blocks, and enemies.
**Properties (@property)**
- @property({ type: cc.Prefab }) groundPrefab
- @property({ type: cc.Prefab }) blockPrefab
- @property({ type: cc.Prefab }) enemyPrefab
- @property({ type: cc.Integer }) tileSize = 64
**Key Methods / Events**
- start(): iterate the map and instantiate prefabs for 'G', 'B', and 'E'

### 11) UIHUDController.ts
**Role**: Bind score/life/timer to labels and toggle game-over panel.
**Properties (@property)**
- @property({ type: cc.Label }) scoreLabel
- @property({ type: cc.Label }) lifeLabel
- @property({ type: cc.Label }) timerLabel
- @property({ type: cc.Node }) gameOverPanel
- @property({ type: cc.Node }) gameManagerNode
**Key Methods / Events**
- start(): refresh labels
- updateHUD(score, life, timer)
- showGameOver(show)

### 12) GameOverPanelController.ts
**Role**: Restart button and game-over state handling.
**Properties (@property)**
- @property({ type: cc.Button }) btnRestart
**Key Methods / Events**
- onLoad(): bind restart button
- onRestartClicked(): cc.director.loadScene("Game") or call GameManager.reset

### 13) GameTypes.ts
**Role**: Shared enums/constants for node names, groups, and event keys.
**Contents**
- const NodeNames, GroupNames
- enum Direction
- const EventNames

## Implementation Order (3-Day Deadline)

### Day 1: Scene Flow and Global State
1. [x] Create GameTypes.ts with group and node name constants.
2. [x] Implement StartMenuController.ts and LevelSelectController.ts and wire buttons.
3. [x] Implement GameManager.ts core state (score/life/timer) and scene flow.
4. Implement AudioManager.ts and verify BGM/SFX play hooks.

### Day 2: Gameplay Core
5. Implement GameBootstrap.ts to cache nodes and validate scene references.
6. Implement LevelBuilder.ts: prefab-based map generation for ground/blocks/enemies.
7. Implement PlayerController.ts: input, movement, jump gating, fall death, contact routing.
8. Implement EnemyController.ts: patrol, wall turn-around, stomp death.

### Day 3: Interactions and UI
8. Implement QuestionBlockController.ts: hit detection, used state, item spawn, score.
9. Implement ItemController.ts if needed for movement/collection.
10. Implement CameraFollowController.ts and UIHUDController.ts.
11. Implement GameOverPanelController.ts and test restart flow.

## Verification Checklist
- [ ] Menu navigation: StartMenu -> LevelSelect -> Game (validate after adding safe loaders)
- [ ] GameManager core state: score, life, timer, respawn, and game-over
- [ ] Player movement: left/right, jump gating by vertical velocity
- [ ] Fall death: below Y = -400 triggers respawn and life loss
- [ ] Ground prefabs: visible, collidable, and aligned in the map
- [ ] Question block prefabs: visible and collidable in the map
- [ ] Goomba prefabs: visible at map positions
- [ ] Enemy AI: patrol and wall turn-around
- [ ] Stomp logic: from above kills enemy; otherwise player hurt
- [ ] Question block: hit from below, score added, item spawn
- [ ] HUD: score/life/timer updates, game-over panel shows at life 0

## Progress Log

### Horizontal Base Architecture (In Progress)
**What is changing**
- Add `GameMaster.ts` as the minimal physics initializer and visible map generator.
- Add `HeroController.ts` as a defensive movement-only controller with safe view hooks.
- Normalize tile size and collider size so blocks are visible at 64x64 and match physics.
- Align ground group usage with the `wall` collision group so Mario can stand on tiles.
- Center the horizontal map so tiles appear on both sides of the camera.
- Match collider size to the actual sprite node size to eliminate oversized hitboxes.
- Enable contact callbacks on the player so jump gating works reliably.
- Use atlas pixel sizes (16x16 tiles) for collider sizing without scaling sprites.
- Disable physics debug draw so the green line disappears.
- For now, generate a single flat ground row at the bottom for movement testing.
- Tighten grid spacing to a fixed 16x16 layout based on atlas pixels.
- Compute collider size from spriteFrame original size to match atlas pixels (no sprite scaling).
- Set jump height to ~100px using gravity-based velocity.
- Ensure tile spacing is derived from the ground prefab atlas size (no gaps between tiles).
- Disable `LevelBuilder` and `GameBootstrap` map generation when `GameMaster` is present to prevent duplicate 64px grids.
- Switch back to `LevelBuilder` as the active generator and make `GameMaster` inert while fixing tile spacing.
- Derive LevelBuilder's tile step from the ground prefab atlas size (16x16) to eliminate gaps.
- Load `Map.txt` via `cc.TextAsset` and align map origin to the 960x640 view so tiles render across the full screen.

**How to test**
- Attach `GameMaster.ts` to a node named `GameMaster` and assign prefabs and player.
- Attach `HeroController.ts` to the Player node.
- Run the scene and confirm the map is visible and the player lands on the baseline.

**Cocos settings to apply**
- Ensure physics is enabled in the Game scene (this will also be forced by `GameMaster.ts`).
- Confirm prefab groups match the `Wall` group used by `HeroController`.

### Minimal Movement Slice (In Progress)
**What changed**
- Restored `GameBootstrap.ts` and `AudioManager.ts` so the scene import chain is valid again.
- Moved the first playable test into `GameManager.ts`, which now creates a simple ground platform directly in the Game scene.
- Cleared `LevelBuilder` prefab references in `Game.fire` so the first check does not depend on broken map assets.

**How to test**
- Open `Game.fire` and run the scene.
- Confirm a visible flat ground appears below the player.
- Confirm Mario can move left/right and jump on the ground.

**Cocos settings to apply**
- Keep `GameManager` active in the Game scene so its bootstrap runs.
- Keep the `Player` node's Rigidbody and Collider attached.
- Keep `Main Camera` present so the scene remains viewable.

### Step 1-2: Menu Flow Scaffolding (Completed)
**What changed**
- Added GameTypes.ts with scene, group, and node name constants.
- Added StartMenuController.ts and LevelSelectController.ts with button click wiring.

**How to test**
- StartMenu: click Btn_Start -> should load LevelSelect.
- LevelSelect: click Btn_Back -> should load StartMenu.
- LevelSelect: click Btn_World_1_1 -> should load Game.

**Cocos settings to apply**
- StartMenu scene: add StartMenuController to Canvas (or a dedicated empty node).
- Drag Btn_Start node into StartMenuController.btnStart.
- LevelSelect scene: add LevelSelectController to Canvas (or a dedicated empty node).
- Drag Btn_World_1_1 into LevelSelectController.btnWorld11.
- Drag Btn_Back into LevelSelectController.btnBack.

**Asset configuration**
- No new art or audio assets required for this step.

### Step 3: GameManager Core State (In Progress)
**What is being added**
- Central state manager for score, life, timer, respawn, and scene flow.

**Why this step comes next**
- Player, HUD, enemies, and blocks all need a single source of truth for score/life/timer before their own scripts are built.

**Testing target after implementation**
- Confirm the manager initializes with life 3, score 0, and timer 300.
- Confirm `addScore`, `loseLife`, and `requestRespawn` update internal state without needing any other gameplay script.

### Step 3: GameManager Core State (Completed)
**What changed**
- Added `assets/Script/GameManager.ts` as a persistent singleton.
- Added runtime state for score, life, timer, respawn delay, and game-over.
- Added scene-loading helpers for StartMenu, LevelSelect, and Game.
- Added emitted events for later HUD and respawn wiring.

**How to test**
- Add `GameManager` to the `Game` scene on an empty node named `GameManager`.
- Enter Play Mode and check the Console for `GameManager: game state reset` and `GameManager: ready`.
- From the Console or a temporary script, call `GameManager.instance.addScore(100)` and verify the score changes in logs.
- Call `GameManager.instance.loseLife("test")` and verify life decreases, respawn is queued, and game over triggers at 0.

**Cocos settings to apply**
- In the `Game` scene, create an empty node named `GameManager` and attach `GameManager.ts`.
- Set `playerSpawn` in the Inspector to your player's spawn coordinates.
- Keep this node active at scene start so `cc.game.addPersistRootNode` can persist it.

**Asset configuration**
- No new image or sound files are required for `GameManager` itself.

### Step 4: Player Atlas Wiring (Completed)
**What changed**
- Replaced the placeholder `Player controller.ts` script with a real `PlayerController`.
- Added horizontal movement, jump handling, fall-death checking, and sprite flipping.
- Added atlas-based sprite frame lookup using the names documented in `atlas.txt`.
- Wired respawn handling through `GameManager` so life loss is owned by the global state manager.

**How to test**
- Attach `Player controller.ts` to the `Player` node.
- Drag the `cc.Sprite` and `cc.RigidBody` components into the script fields if they are not auto-filled.
- Assign `assets/Art/player/mario_small.plist` to `smallAtlas` in the Inspector.
- Press `A/D` or Left/Right Arrow to move.
- Press `Space` to jump.
- Verify the sprite changes between run and jump frames while moving.

**Cocos settings to apply**
- On the `Player` node, keep `RigidBody` as `Dynamic` and `Fixed Rotation` enabled.
- Add or keep a `cc.Sprite` component on the player.
- Drag the small player atlas into `smallAtlas`.
- If you later add the big player state, drag `mario_big.plist` into `bigAtlas`.

**Asset configuration**
- Use the frame names from `atlas.txt` exactly.
- Do not rename the imported atlas frames if you want the runtime lookup to work.
- The player movement test does not require new art; it uses existing atlas assets only.

### Step 5: Prefab Level Map (Completed)
**What changed**
- Added `assets/Script/LevelBuilder.ts` to generate a level from the string map using prefabs.
- Instantiates ground, block, and goomba prefabs at `tileSize` grid positions.
- Added configurable `originX` and `originY` so the level can be anchored into view.

**How to test**
- Attach `LevelBuilder.ts` to `Game_World` (or `GameBuilder` if you created it under `GameWorld`).
- Assign prefabs in Inspector:
	- `groundPrefab` -> GroundBlock prefab
	- `blockPrefab` -> QuestionBlock prefab
	- `enemyPrefab` -> Goomba prefab
- Keep `originY` around `768` for the provided map so the ground row appears on screen.
- Enter Play Mode and confirm ground/blocks/enemies appear.
- The player should stand on ground and be able to jump.

### Step 6: Movement Debug Pass (Completed)
**What changed**
- Added stricter runtime checks and logs for `PlayerController` and `LevelBuilder` to surface missing RigidBody, colliders, and prefab wiring issues.
- Ensured the player can jump while standing still (no movement required).

**How to test**
- Enter Play Mode and check the Console for warnings like `PlayerController: missing RigidBody` or `LevelBuilder: spawned 0 nodes`.
- If logs indicate missing setup, fix the corresponding Inspector assignments.

**Cocos settings to apply**
- Ensure `Physics Manager` is enabled and gravity is (0, -980).
- Confirm collision groups allow Player vs Wall and Player vs Item.

**Asset configuration**
- Use the prefabs you already created (GroundBlock, QB1, Goomba1).

### Step 6: Movement Debug Pass (Completed)
**What changed**
- Enabled Physics Manager at runtime in `GameManager` so physics works even if Project Settings were not configured yet.
- Changed `PlayerController` to auto-create its own `RigidBody` and `PhysicsBoxCollider` if they were missing.
- Allowed the player sprite to be found in children, so the script works whether the visible Mario is on the root node or a child node.

**What was found**
- Console proved the current blockers were scene setup issues: Physics Manager disabled, missing player components, and GameManager not at the root node.

**How to test**
- Run the scene again and confirm the Physics Manager warning is gone.
- Confirm the player can jump without needing to move first.
- Confirm the player is no longer stuck because a collider and rigidbody exist on the player node.

**Cocos settings to apply**
- If you want to keep everything explicit instead of auto-filling, still prefer setting `RigidBody`, `PhysicsCollider`, and `Sprite` manually on the Player node.
- Put `GameManager` on a scene-root node if you want persist-root behavior.

### Step 4: Player Atlas Wiring (In Progress)
**What is being added**
- A playable player controller that reads sprite frames from the atlas and swaps between running and jumping visuals.

**Why this step comes now**
- You need visible player motion before testing physics, jump timing, and collision behavior.

**Testing target after implementation**
- Player should move left/right with running animation.
- Player should jump with jump animation.
- Missing atlas frames should fail softly with warnings instead of crashing.

## Notes
- Keep all gameplay logic in actor scripts; UI scripts only display state.
- Use cc.systemEvent for input and onBeginContact for physics callbacks.
- Keep Y for camera fixed; follow only Player.x.
