export type Role = 'TANK' | 'HEALER' | 'MAGE';

export type Language = 'EN' | 'ZH' | 'JP';

export interface Skill {
  id: string;
  name: Record<Language, string>;
  apCost: number;
  description: Record<Language, string>;
  targetType: 'SELF' | 'ALLY' | 'ALL_ALLIES' | 'ENEMY' | 'PASSIVE' | 'ALLY_EXCEPT_SELF';
  effectType: 'DAMAGE' | 'HEAL' | 'SHIELD' | 'TAUNT' | 'BUFF' | 'PASSIVE' | 'SPECIAL';
  value?: number;
  selfDamage?: number; // For Mage/Healer sacrifice
}

export interface Character {
  id: string;
  name: string;
  role: Role;
  maxHp: number;
  currentHp: number;
  ap: number;
  skills: Skill[];
  status: {
    taunt: boolean;
    shield: number;
    isDead: boolean;
  };
  avatar: string;
  portrait?: string; // Path to character portrait image
}

export interface Boss {
  name: Record<Language, string>;
  maxHp: number;
  currentHp: number;
  patternIndex: number; // 0-3 loop
  actionLog: string;
  targetId?: string; // ID of the character locked onto
  portrait?: string; // Path to boss portrait image
}

export interface BossMove {
  name: Record<Language, string>;
  damage: number;
  type: 'SINGLE' | 'AOE' | 'NONE' | 'FATAL' | 'RANDOM';
  descTemplate: Record<Language, string>;
}

export type GameMode = 'MANUAL' | 'AI_GEN0' | 'AI_GEN5' | 'EVOLUTION' | 'EVOLUTION_V2';

export type Phase = 'PLANNING' | 'EXECUTING' | 'BOSS_TURN' | 'GAME_OVER' | 'REFLEXION' | 'MENU';

export type MetaStrategy = 'PREPARE_BURST' | 'EXECUTE_BURST' | 'SURVIVE_EXECUTE' | 'EMERGENCY';

export interface LogEntry {
  turn: number;
  source: string; // Character or AI System
  message: string;
  type: 'INFO' | 'ACTION' | 'DAMAGE' | 'HEAL' | 'THOUGHT' | 'CRITICAL';
  thought?: string; // AI reasoning
}

export interface WinRateData {
  generation: number;
  winRate: number;
  battles: number;
}

export interface QueuedAction {
  characterId: string;
  skillId: string; // 'WAIT' is a valid skillId
  targetId?: string; // Optional specific target
}

export interface GameSettings {
  bossDamageMultiplier: number;
  bossMaxHp: number;
  gameSpeed: number; // ms delay
  bgmVolume: number; // 0.0 to 1.0
  sfxVolume: number; // 0.0 to 1.0
}

export interface CharacterStats {
  characterId: string;
  characterName: string;
  damageDealt: number;
  healingDone: number;
  damageTaken: number;
  skillsUsed: Record<string, number>; // skillId -> count
  turnsSurvived: number;
  apSpent: number;
}

export interface BattleStatistics {
  battleId: string;
  generation: number;
  timestamp: number;
  outcome: 'WIN' | 'LOSS';
  totalTurns: number;
  characterStats: CharacterStats[];
  bossHpRemaining: number;
}

export interface StrategyAnalysis {
  generation: number;
  timestamp: number;
  analysisText: string;
  battleStats: BattleStatistics;
}

export interface SaveData {
  generation: number;
  winRates: WinRateData[];
  settings: GameSettings;
  strategyText: string;
  battleHistory?: BattleStatistics[];
  lastAnalysis?: StrategyAnalysis;
}

export interface VisualEffect {
  id: string;
  type: 'PROJECTILE' | 'FLASH' | 'HEAL_BEAM';
  sourceId: string; // DOM ID
  targetId: string; // DOM ID
  color: string;
  icon?: string;
  duration: number;
}

export interface BattleEvent {
  sourceId: string;
  targetId: string;
  type: 'DAMAGE' | 'HEAL' | 'SHIELD' | 'TAUNT' | 'INFO' | 'DEATH' | 'WAIT';
  value: number;
  skillId?: string;
  message?: string;
}
