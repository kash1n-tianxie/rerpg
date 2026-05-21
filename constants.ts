
import { Character, Skill, Boss, GameSettings, BossMove } from './types';

export const MAX_AP = 3;
export const STORAGE_KEY = 'abyssal_tactics_save_v1';

// Asset Paths
export const ASSETS = {
  portraits: {
    warrior: '/assets/portraits/warrior.gif',
    healer: '/assets/portraits/healer.gif',
    mage: '/assets/portraits/mage.gif',
    boss: '/assets/portraits/dragon.gif',
  },
  backgrounds: {
    battle: '/assets/portraits/ground.gif',
  },
  audio: {
    bgm: '/assets/audio/bgm/bgm.mp3',
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  bossDamageMultiplier: 1.0,
  bossMaxHp: 5000,
  gameSpeed: 1000, // Slower for JRPG Feel
  bgmVolume: 0.3,
  sfxVolume: 0.5,
};

export const GEN0_STRATEGY = `You are playing a simple RPG. 
You control 3 characters: Arthur (Tank), Ellie (Healer), Merlin (Mage).
Goal: Defeat the Boss.
You have limited AP. Using a skill costs AP. Waiting ('WAIT') saves AP for next turn (max 3).
Just pick any available skill that you have AP for. Do not try to save AP. Do not worry about future turns.
`;

export const GEN5_STRATEGY = `You are a Grandmaster RPG Tactician. You are playing "The 1 AP Puzzle".
Optimization is key. Resources are scarce.
Team:
- Arthur (Tank, 450 HP): Can Taunt (2AP). Has 'Self Destruct' (0AP) which deals dmg based on BOSS MISSING HP.
- Ellie (Healer, 250 HP): Acts AFTER the Boss. Can 'Transfusion' (0AP) for massive heal but hurts self.
- Merlin (Mage, 200 HP): High Damage glass cannon. 'Soul Burn' (3AP) hurts self.

TURN ORDER: Tank -> Mage -> BOSS -> Healer.
This means Ellie heals damage taken *this* turn.

BOSS PATTERN (CYCLES EVERY 4 TURNS):
1. Random Attack (60 Dmg)
2. Sweep (AOE 40 Dmg)
3. Telegraph (Locks onto LOWEST HP). ***BEST WINDOW FOR MAGE BURST***
4. Execute (999 TRUE DMG). ***TANK MUST TAUNT OR TARGET DIES***

STRATEGY:
- Arthur needs 2 AP on Turn 4 (Execute).
- Merlin needs 3 AP on Turn 3 (Telegraph) to use Soul Burn safely (Boss does 0 dmg that turn).
- Ellie's Transfusion (0AP) is critical if you are out of AP, but don't kill her.
- Arthur's Self Destruct deals more damage when boss is low HP. Use it only as a finisher or last resort.

Calculate the math. Survive. Kill.`;

export const SKILLS: Record<string, Skill[]> = {
  Arthur: [
    {
      id: 'shield_bash',
      name: {
        EN: 'Shield Bash',
        ZH: '盾击',
        JP: 'シールドバッシュ'
      },
      apCost: 1,
      description: {
        EN: 'Deal 20 Dmg + Gain 30 Shield',
        ZH: '造成 20 伤害 + 获得 30 护盾',
        JP: '20ダメージ + 30シールド獲得'
      },
      targetType: 'ENEMY',
      effectType: 'SHIELD',
      value: 20
    },
    {
      id: 'taunt',
      name: {
        EN: 'Taunt',
        ZH: '嘲讽',
        JP: '挑発'
      },
      apCost: 2,
      description: {
        EN: 'Taunt + 70% Dmg Reduction',
        ZH: '嘲讽敌人 + 70% 伤害减免',
        JP: '挑発 + 70% ダメージ軽減'
      },
      targetType: 'SELF',
      effectType: 'TAUNT'
    },
    {
      id: 'self_destruct',
      name: {
        EN: 'Self Destruct',
        ZH: '自爆',
        JP: '自爆'
      },
      apCost: 0,
      description: {
        EN: 'Die to deal 25% of Boss Missing HP as Dmg',
        ZH: '自爆: 对Boss造成Boss已损失血量25%的伤害 (自身死亡)',
        JP: '自爆: ボスの失ったHPの25%のダメージを与える (自身死亡)'
      },
      targetType: 'ENEMY',
      effectType: 'SPECIAL',
    },
  ],
  Ellie: [
    {
      id: 'heal',
      name: {
        EN: 'Heal',
        ZH: '治疗',
        JP: 'ヒール'
      },
      apCost: 1,
      description: {
        EN: 'Restore 60 HP to target',
        ZH: '为目标恢复 60 HP',
        JP: '対象のHPを60回復'
      },
      targetType: 'ALLY',
      effectType: 'HEAL',
      value: 60
    },
    {
      id: 'pray',
      name: {
        EN: 'Pray',
        ZH: '祈祷',
        JP: 'プレイ'
      },
      apCost: 2,
      description: {
        EN: 'Restore 40 HP to all allies',
        ZH: '全体恢复 40 HP',
        JP: '味方全体を40回復'
      },
      targetType: 'ALL_ALLIES',
      effectType: 'HEAL',
      value: 40
    },
    {
      id: 'transfusion',
      name: {
        EN: 'Transfusion',
        ZH: '输血',
        JP: '輸血'
      },
      apCost: 0,
      description: {
        EN: 'Heal Ally 150 HP, Self -60 HP',
        ZH: '输血: 目标回复 150 HP, 自身受到 60 伤害',
        JP: '輸血: 味方を150回復, 自身に60ダメージ'
      },
      targetType: 'ALLY_EXCEPT_SELF',
      effectType: 'HEAL',
      value: 150,
      selfDamage: 60
    },
  ],
  Merlin: [
    {
      id: 'missile',
      name: {
        EN: 'Missile',
        ZH: '飞弹',
        JP: 'ミサイル'
      },
      apCost: 1,
      description: {
        EN: 'Deal 60 Magic Dmg',
        ZH: '造成 60 魔法伤害',
        JP: '60 魔法ダメージ'
      },
      targetType: 'ENEMY',
      effectType: 'DAMAGE',
      value: 60
    },
    {
      id: 'fireball',
      name: {
        EN: 'Fireball',
        ZH: '火球术',
        JP: 'ファイアボール'
      },
      apCost: 2,
      description: {
        EN: 'Deal 150 Magic Dmg',
        ZH: '造成 150 魔法伤害',
        JP: '150 魔法ダメージ'
      },
      targetType: 'ENEMY',
      effectType: 'DAMAGE',
      value: 150
    },
    {
      id: 'soul_burn',
      name: {
        EN: 'Soul Burn',
        ZH: '燃魂',
        JP: 'ソウルバーン'
      },
      apCost: 3,
      description: {
        EN: 'Deal 280 Dmg, Self -40 HP',
        ZH: '造成 280 伤害, 自身扣除 40 HP',
        JP: '280 ダメージ, 自身に40ダメージ'
      },
      targetType: 'ENEMY',
      effectType: 'DAMAGE',
      value: 280,
      selfDamage: 40
    },
  ],
};

export const INITIAL_CHARACTERS: Character[] = [
  {
    id: 'Arthur',
    name: 'Arthur',
    role: 'TANK',
    maxHp: 450,
    currentHp: 450,
    ap: 3,
    skills: SKILLS.Arthur,
    status: { taunt: false, shield: 0, isDead: false },
    avatar: '🛡️',
    portrait: ASSETS.portraits.warrior,
  },
  {
    id: 'Ellie',
    name: 'Ellie',
    role: 'HEALER',
    maxHp: 250,
    currentHp: 250,
    ap: 3,
    skills: SKILLS.Ellie,
    status: { taunt: false, shield: 0, isDead: false },
    avatar: '⚕️',
    portrait: ASSETS.portraits.healer,
  },
  {
    id: 'Merlin',
    name: 'Merlin',
    role: 'MAGE',
    maxHp: 200,
    currentHp: 200,
    ap: 3,
    skills: SKILLS.Merlin,
    status: { taunt: false, shield: 0, isDead: false },
    avatar: '🔥',
    portrait: ASSETS.portraits.mage,
  },
];

export const INITIAL_BOSS: Boss = {
  name: {
    EN: 'Abyssal Demon',
    ZH: '深渊恶魔',
    JP: '深淵の悪魔'
  },
  maxHp: 5000,
  currentHp: 5000,
  patternIndex: 0,
  actionLog: '',
  portrait: ASSETS.portraits.boss,
};

export const BOSS_SCRIPT: BossMove[] = [
  {
    name: { EN: 'Random Strike', ZH: '随机攻击', JP: 'ランダム攻撃' },
    damage: 60,
    type: 'RANDOM',
    descTemplate: {
      EN: 'Random target {dmg} damage',
      ZH: '随机攻击单体造成 {dmg} 点伤害',
      JP: 'ランダムな対象に {dmg} ダメージ'
    }
  },
  {
    name: { EN: 'Sweep', ZH: '横扫', JP: 'なぎ払い' },
    damage: 40,
    type: 'AOE',
    descTemplate: {
      EN: 'AOE {dmg} damage to all',
      ZH: '全体造成 {dmg} 点伤害',
      JP: '全体に {dmg} ダメージ'
    }
  },
  {
    name: { EN: 'Gaze', ZH: '凝视', JP: '凝視' },
    damage: 0,
    type: 'NONE',
    descTemplate: {
      EN: 'Locks onto LOWEST HP.',
      ZH: '锁定生命值最低的目标。',
      JP: 'HPが最も低い敵をロックオン。'
    }
  },
  {
    name: { EN: 'Execute', ZH: '处决', JP: '処刑' },
    damage: 999,
    type: 'FATAL',
    descTemplate: {
      EN: 'Lethal blow ({dmg} True Dmg)',
      ZH: '致命一击 ({dmg} 真实伤害)',
      JP: '必殺の一撃 ({dmg} 確定ダメージ)'
    }
  },
];

export const UI_TEXT = {
  EN: {
    turn: 'TURN',
    ap: 'AP',
    hp: 'HP',
    boss: 'BOSS',
    logs: 'BATTLE LOGS',
    auto: 'AI AUTO',
    manual: 'MANUAL',
    growth: 'EVOLUTION',
    start: 'START BATTLE',
    reset: 'RESET',
    wait: 'WAIT (+AP)',
    win: 'VICTORY',
    loss: 'DEFEAT',
    cancel: 'CANCEL',
    selectTarget: 'SELECT TARGET',
    settings: 'SETTINGS',
    stats: 'STATS',
    bossDmg: 'Boss Dmg Multiplier',
    bossHp: 'Boss Max HP',
    analyze: '🧠 ANALYZE & EVOLVE',
    analyzing: 'TACTICAL ANALYST THINKING...',
    nextGen: 'START NEXT GENERATION',
    lesson: 'NEW STRATEGY ACQUIRED',
    status: 'Status',
    next: 'Next',
    gen0: 'Gen 0',
    gen5: 'Gen 5',
    executeTurn: 'EXECUTE TURN',
    executing: 'EXECUTING...',
    analyzingBaseline: 'Analyzing baseline (Random)...',
    optimized: 'Optimized Strategy Active.',
    clickToStart: 'CLICK TO START AI BATTLE',
    missionFailed: 'Mission Failed. All agents lost.',
    missionAccomplished: 'Target Neutralized. Mission Accomplished.',
    collapsed: 'collapsed from exertion!',
    fallen: 'Has fallen!',
    strategyConsole: 'TACTICAL TERMINAL',
    currentLogic: 'CURRENT LOGIC KERNEL',
    locked: 'LOCKED',
    passiveTrigger: 'REVENGE TRIGGERED!',
    menuTitle: 'ABYSSAL TACTICS',
    menuNewGame: 'NEW SIMULATION',
    menuContinue: 'CONTINUE SIMULATION',
    autoLoop: 'AUTO LOOP',
    stopAuto: 'STOP AUTO',
    save: 'SAVE GAME',
    saving: 'Saving...',
    saveLoaded: 'Data Loaded',
    volume: 'AUDIO VOLUME',
    bgm: 'BGM',
    sfx: 'SFX',
    strategy: 'CURRENT STRATEGY',
    howToPlay: 'HOW TO PLAY',
    gameRules: 'GAME RULES',
    close: 'CLOSE',
  },
  ZH: {
    turn: '回合',
    ap: '行动点',
    hp: '生命值',
    boss: '深渊恶魔',
    logs: '战斗日志',
    auto: 'AI 托管',
    manual: '手动操作',
    growth: '进化模式',
    start: '开始战斗',
    reset: '重新开始',
    wait: '空过 (存AP)',
    win: '胜利',
    loss: '战败',
    cancel: '取消',
    selectTarget: '选择目标',
    settings: '设置',
    stats: '胜率统计',
    bossDmg: 'Boss 伤害倍率',
    bossHp: 'Boss 血量上限',
    analyze: '🧠 反思与进化',
    analyzing: '战术分析师思考中...',
    nextGen: '开启下一世代',
    lesson: '已获取新战术',
    status: '当前状态',
    next: '下回合',
    gen0: '初级 AI',
    gen5: '大师 AI',
    executeTurn: '执行回合',
    executing: '执行中...',
    analyzingBaseline: '正在分析基准数据 (随机策略)...',
    optimized: '优化策略已激活',
    clickToStart: '点击开始 AI 对战',
    missionFailed: '任务失败，全员阵亡。',
    missionAccomplished: '目标已清除，任务完成。',
    collapsed: '力竭倒下！',
    fallen: '已阵亡！',
    strategyConsole: '战术终端',
    currentLogic: '当前逻辑核心',
    locked: '被锁定',
    passiveTrigger: '复仇被动触发！',
    menuTitle: '深渊战术',
    menuNewGame: '新模拟',
    menuContinue: '继续模拟',
    autoLoop: '自动循环',
    stopAuto: '停止循环',
    save: '保存游戏',
    saving: '保存中...',
    saveLoaded: '存档已读取',
    volume: '音量设置',
    bgm: '背景音乐',
    sfx: '音效',
    strategy: '当前策略',
    howToPlay: '游戏规则',
    gameRules: '游戏规则',
    close: '关闭',
  },
  JP: {
    turn: 'ターン',
    ap: 'AP',
    hp: 'HP',
    boss: 'ボス',
    logs: 'バトルログ',
    auto: 'AI オート',
    manual: '手動',
    growth: '進化モード',
    start: '戦闘開始',
    reset: 'リセット',
    wait: '待機 (AP貯め)',
    win: '勝利',
    loss: '敗北',
    cancel: 'キャンセル',
    selectTarget: '対象選択',
    settings: '設定',
    stats: '勝率統計',
    bossDmg: 'ボス攻撃倍率',
    bossHp: 'ボス最大HP',
    analyze: '🧠 分析と進化',
    analyzing: '戦術分析中...',
    nextGen: '次世代を開始',
    lesson: '新戦術を獲得',
    status: 'ステータス',
    next: '次ターン',
    gen0: '初級 AI',
    gen5: '達人 AI',
    executeTurn: 'ターン実行',
    executing: '実行中...',
    analyzingBaseline: 'ベースライン分析中 (ランダム)...',
    optimized: '最適化戦略アクティブ',
    clickToStart: 'AIバトル開始',
    missionFailed: '任務失敗。全滅しました。',
    missionAccomplished: '目標排除。任務完了。',
    collapsed: 'が力尽きた！',
    fallen: 'が倒れた！',
    strategyConsole: '戦術ターミナル',
    currentLogic: '現在ロジックカーネル',
    locked: 'ロックオン',
    passiveTrigger: '復讐パッシブ発動！',
    menuTitle: 'アビス・タクティクス',
    menuNewGame: 'ニューゲーム',
    menuContinue: 'コンティニュー',
    autoLoop: 'オート周回',
    stopAuto: '停止',
    save: 'セーブ',
    saving: '保存中...',
    saveLoaded: 'ロード完了',
    volume: '音量設定',
    bgm: 'BGM',
    sfx: '効果音',
    strategy: '現在の戦略',
    howToPlay: '遊び方',
    gameRules: 'ゲームルール',
    close: '閉じる',
  },
};

export const GAME_RULES_CONTENT = {
  EN: {
    title: 'GAME RULES',
    bossSection: {
      title: '🐉 BOSS MECHANICS',
      hp: 'Boss HP: 5000',
      pattern: 'Boss Pattern (4-Turn Cycle):',
      turn1: 'Turn 1: Random Strike - Attacks random character (60 DMG)',
      turn2: 'Turn 2: Sweep - AOE damage to all characters (40 DMG)',
      turn3: 'Turn 3: Gaze - Locks onto LOWEST HP target (No Damage)',
      turn4: 'Turn 4: Execute - Deals 999 TRUE DAMAGE to locked target'
    },
    charactersSection: {
      title: '⚔️ CHARACTER ROSTER',
      tank: {
        name: 'TANK (Arthur) - 450 HP',
        skill1: '1 AP - Shield Bash: Deal 20 DMG + Gain 30 Shield',
        skill2: '2 AP - Taunt: Draw enemy attention + 70% DMG Reduction',
        skill3: '0 AP - Self Destruct: Sacrifice life to deal 25% of Boss Missing HP as DMG'
      },
      mage: {
        name: 'MAGE (Merlin) - 200 HP',
        skill1: '1 AP - Missile: Deal 60 Magic DMG',
        skill2: '2 AP - Fireball: Deal 150 Magic DMG',
        skill3: '3 AP - Soul Burn: Deal 280 DMG, take 40 self-damage'
      },
      healer: {
        name: 'HEALER (Ellie) - 250 HP',
        skill1: '1 AP - Heal: Restore 60 HP to target (can target self)',
        skill2: '2 AP - Pray: Restore 40 HP to all allies',
        skill3: '0 AP - Transfusion: Heal ally 150 HP, take 60 self-damage (cannot target self)'
      }
    },
    gameplaySection: {
      title: '🎮 GAMEPLAY',
      turnOrder: 'Turn Order: Tank → Mage → Boss → Healer',
      howToPlay: 'Select actions for Tank, Mage, and Healer, then watch them execute in turn order.',
      apSystem: 'Each character starts with 3 AP. Waiting grants +1 AP (max 3 AP).'
    }
  },
  ZH: {
    title: '游戏规则',
    bossSection: {
      title: '🐉 Boss 机制',
      hp: 'Boss 血量: 5000',
      pattern: 'Boss 行动模式 (4回合循环):',
      turn1: '第1回合: 随机攻击 - 对随机角色造成 60 伤害',
      turn2: '第2回合: 横扫 - 对全体角色造成 40 伤害',
      turn3: '第3回合: 凝视 - 锁定生命值最低的目标 (无伤害)',
      turn4: '第4回合: 处决 - 对锁定目标造成 999 真实伤害'
    },
    charactersSection: {
      title: '⚔️ 角色阵容',
      tank: {
        name: '坦克 (Arthur) - 450 HP',
        skill1: '1 AP - 盾击: 造成 20 伤害 + 获得 30 护盾',
        skill2: '2 AP - 嘲讽: 吸引敌人注意 + 70% 伤害减免',
        skill3: '0 AP - 自爆: 牺牲生命，对Boss造成Boss已损失血量25%的伤害'
      },
      mage: {
        name: '法师 (Merlin) - 200 HP',
        skill1: '1 AP - 飞弹: 造成 60 魔法伤害',
        skill2: '2 AP - 火球: 造成 150 魔法伤害',
        skill3: '3 AP - 燃魂: 造成 280 伤害，自身受到 40 伤害'
      },
      healer: {
        name: '治疗师 (Ellie) - 250 HP',
        skill1: '1 AP - 治疗: 为目标恢复 60 HP (可对自己释放)',
        skill2: '2 AP - 祈祷: 为全体恢复 40 HP',
        skill3: '0 AP - 输血: 为队友恢复 150 HP，自身受到 60 伤害 (无法对自己释放)'
      }
    },
    gameplaySection: {
      title: '🎮 游戏玩法',
      turnOrder: '行动顺序: 坦克 → 法师 → Boss → 治疗师',
      howToPlay: '为坦克、法师和治疗师选择行动，然后观看他们按顺序执行。',
      apSystem: '每个角色起始拥有 3 AP。等待可获得 +1 AP (最多 3 AP)。'
    }
  },
  JP: {
    title: 'ゲームルール',
    bossSection: {
      title: '🐉 ボスメカニクス',
      hp: 'ボスHP: 5000',
      pattern: 'ボス行動パターン (4ターン周期):',
      turn1: 'ターン1: ランダム攻撃 - ランダムなキャラに 60 ダメージ',
      turn2: 'ターン2: なぎ払い - 全体に 40 ダメージ',
      turn3: 'ターン3: 凝視 - HPが最も低い対象をロックオン (ダメージなし)',
      turn4: 'ターン4: 処刑 - ロックオンした対象に 999 確定ダメージ'
    },
    charactersSection: {
      title: '⚔️ キャラクター編成',
      tank: {
        name: 'タンク (Arthur) - 450 HP',
        skill1: '1 AP - シールドバッシュ: 20 ダメージ + 30 シールド獲得',
        skill2: '2 AP - 挑発: 敵の注意を引く + 70% ダメージ軽減',
        skill3: '0 AP - 自爆: 生命を犠牲にしてボスの失ったHPの25%のダメージを与える'
      },
      mage: {
        name: 'メイジ (Merlin) - 200 HP',
        skill1: '1 AP - ミサイル: 60 魔法ダメージ',
        skill2: '2 AP - ファイアボール: 150 魔法ダメージ',
        skill3: '3 AP - ソウルバーン: 280 ダメージ、自身に 40 ダメージ'
      },
      healer: {
        name: 'ヒーラー (Ellie) - 250 HP',
        skill1: '1 AP - ヒール: 対象を 60 回復 (自分にも使用可)',
        skill2: '2 AP - プレイ: 味方全体を 40 回復',
        skill3: '0 AP - 輸血: 味方を 150 回復、自身に 60 ダメージ (自分には使用不可)'
      }
    },
    gameplaySection: {
      title: '🎮 ゲームプレイ',
      turnOrder: 'ターン順序: タンク → メイジ → ボス → ヒーラー',
      howToPlay: 'タンク、メイジ、ヒーラーの行動を選択し、順番に実行されるのを見守ります。',
      apSystem: '各キャラクターは3APでスタート。待機すると+1AP獲得 (最大3AP)。'
    }
  }
};
