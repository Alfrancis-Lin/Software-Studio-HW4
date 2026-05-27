export const SceneNames = {
    StartMenu: "StartMenu",
    LevelSelect: "LevelSelect",
    Game: "Game",
} as const;

export const GroupNames = {
    Default: "default",
    Player: "Player",
    Wall: "wall",
    Enemy: "Enemy",
    Item: "Item",
} as const;

export enum Direction {
    Left = -1,
    Right = 1,
}

export const EventNames = {
    PlayerGrow: "player-grow",
    PlayerShrink: "player-shrink",
    PlayerHitEnemy: "player-hit-enemy",
    QuestionBlockUsed: "question-block-used",
    ItemCollected: "item-collected",
    EnemyStomped: "enemy-stomped",
} as const;

export const NodeNames = {
    BtnStart: "Btn_Start",
    BtnWorld11: "Btn_World_1_1",
    BtnBack: "Btn_Back",
    GameManager: "GameManager",
    GameBootstrap: "GameBootTrap",
    GameWorld: "GameWorld",
    LevelBuilder: "LevelBuilder",
    AudioManager: "AudioManager",
    Player: "Player",
    QuestionBlock: "QuestionBlock",
    Enemy: "Enemy",
    Item: "Item",
    GameMaster: "GameMaster",
    MainCamera: "Main Camera",
    GameOverPanel: "GameOver_Panel",
} as const;
