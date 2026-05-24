# Game Architecture Plan (Cocos Creator 2.4.8)

## Status
- [x] Plan drafted and saved before gameplay code changes.
- [ ] Plan reviewed and approved for implementation.

## Development Rules (Must Follow)
- Update this document before any gameplay code changes.
- Work step-by-step; do not implement everything at once.
- After each step, record: what changed, how to test, and any Cocos settings or asset wiring needed.
- Mark completed steps and keep the checklist current for tracking.

## Scope Summary
Build a modular gameplay layer with clear ownership: one global state manager, one audio manager, and small actor components for player, enemy, blocks, camera, and UI. All scripts must use Cocos Creator 2.4.x APIs (cc.systemEvent, cc.audioEngine, physics onBeginContact, cc.v2, cc.director.loadScene).

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
6. PlayerController.ts
7. EnemyController.ts
8. QuestionBlockController.ts
9. ItemController.ts (optional, only if item needs its own logic)
10. CameraFollowController.ts
11. UIHUDController.ts
12. GameOverPanelController.ts
13. GameTypes.ts (shared enums/constants)

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

### 10) CameraFollowController.ts
**Role**: Follow Player.x with constant Y.
**Properties (@property)**
- @property({ type: cc.Node }) target
- @property({ type: cc.Float }) fixedY = 0
**Key Methods / Events**
- lateUpdate(): set cameraNode.x = target.x, keep Y

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
6. Implement PlayerController.ts: input, movement, jump gating, fall death, contact routing.
7. Implement EnemyController.ts: patrol, wall turn-around, stomp death.

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
- [ ] Enemy AI: patrol and wall turn-around
- [ ] Stomp logic: from above kills enemy; otherwise player hurt
- [ ] Question block: hit from below, score added, item spawn
- [ ] HUD: score/life/timer updates, game-over panel shows at life 0

## Progress Log

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

## Notes
- Keep all gameplay logic in actor scripts; UI scripts only display state.
- Use cc.systemEvent for input and onBeginContact for physics callbacks.
- Keep Y for camera fixed; follow only Player.x.
