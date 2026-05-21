import { GoogleGenAI, Type } from "@google/genai";
import { Character, Boss, Skill, QueuedAction, BattleStatistics } from '../types';
import { BOSS_SCRIPT } from '../constants';

// Safety check for API key
// Vite requires VITE_ prefix for environment variables exposed to client
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const getAITurn = async (
  turn: number,
  characters: Character[],
  boss: Boss,
  strategy: string,
  aiLang: 'EN' | 'ZH' | 'JP' = 'EN'
): Promise<{ actions: QueuedAction[], thought: string }> => {

  if (!ai) {
    console.warn("No API Key - Using Local Fallback (WAIT)");
    return {
      actions: characters.filter(c => !c.status.isDead).map(c => ({ characterId: c.id, skillId: 'WAIT' })),
      thought: "⚠️ 没有正确连接到API - 未配置API密钥"
    };
  }

  const nextMove = BOSS_SCRIPT[boss.patternIndex];
  const nextMoveDesc = nextMove.descTemplate['EN'].replace('{dmg}', nextMove.damage.toString());

  const gameStateDesc = `
    TURN: ${turn}
    BOSS: ${boss.name['EN']} | HP: ${boss.currentHp}/${boss.maxHp} | Next Move: ${nextMove.name['EN']} (${nextMoveDesc})
    
    CHARACTERS:
    ${characters.map(c =>
    `- ${c.name} (${c.role}): HP ${c.currentHp}/${c.maxHp} | AP ${c.ap} | Dead: ${c.status.isDead}`
  ).join('\n')}
    
    AVAILABLE SKILLS (ID - Cost):
    Arthur: shield_bash (1), taunt (2), guardian (3)
    Ellie: heal (1), pray (2), sacrifice (3)
    Merlin: missile (1), fireball (2), soul_burn (3)
    Universal: WAIT (0) - Restores AP
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: `Current Game State:\n${gameStateDesc}\n\nDecide the action for each living character.`,
      config: {
        systemInstruction: strategy + `\n\nIMPORTANT: Output your 'thought' field in ${aiLang === 'ZH' ? 'Chinese (中文)' : aiLang === 'JP' ? 'Japanese (日本語)' : 'English'}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            thought: { type: Type.STRING, description: "Your tactical reasoning." },
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  characterId: { type: Type.STRING },
                  skillId: { type: Type.STRING },
                  targetId: { type: Type.STRING, description: "Optional target ID if skill requires it" }
                }
              }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}");
    return {
      actions: json.actions || [],
      thought: json.thought || "✓ AI决策完成"
    };

  } catch (error) {
    console.error("Gemini AI Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Fallback: everyone waits
    return {
      actions: characters.filter(c => !c.status.isDead).map(c => ({ characterId: c.id, skillId: 'WAIT' })),
      thought: `⚠️ 没有正确连接到API - 连接失败: ${errorMessage}`
    };
  }
};

export const analyzeDefeat = async (logs: string[]): Promise<string> => {
  if (!ai) return "Local Mode: No Analysis Available.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `
      GAME CONTEXT:
      A 3-person RPG party fought a Boss.
      Constraint: 1 AP regen per turn.
      Boss Pattern: 1. Attack -> 2. AOE -> 3. Charge (Safe) -> 4. Execute (Fatal if not Taunted).
      
      LOGS:
      ${logs.slice(-20).join('\n')}
      
      TASK:
      Identify exactly why they lost. 
      Did the Tank fail to Taunt on Turn 4? 
      Did the Mage attack at the wrong time?
      
      OUTPUT:
      Provide a single, strict tactical rule (starts with "RULE: ") to prevent this specific failure next time. 
      Keep it under 20 words.
      `,
      config: {
        temperature: 0.4,
      }
    });
    return response.text || "Play safer.";
  } catch (e) {
    return "Analysis failed.";
  }
};

export const analyzeStrategy = async (
  battleStats: BattleStatistics,
  logs: string[],
  currentStrategy: string,
  aiLang: 'EN' | 'ZH' | 'JP' = 'EN'
): Promise<string> => {
  if (!ai) return "Local Mode: No Analysis Available.";

  const statsText = battleStats.characterStats.map(cs => {
    const skillUsageText = Object.entries(cs.skillsUsed)
      .map(([skillId, count]) => `${skillId}: ${count}x`)
      .join(', ');
    return `
    ${cs.characterName}:
    - Damage Dealt: ${cs.damageDealt}
    - Healing Done: ${cs.healingDone}
    - Damage Taken: ${cs.damageTaken}
    - Skills Used: ${skillUsageText}
    - AP Spent: ${cs.apSpent}
    - Turns Survived: ${cs.turnsSurvived}/${battleStats.totalTurns}
    `;
  }).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: `
      BATTLE OUTCOME: ${battleStats.outcome}
      GENERATION: ${battleStats.generation}
      TOTAL TURNS: ${battleStats.totalTurns}
      BOSS HP REMAINING: ${battleStats.bossHpRemaining}
      
      CHARACTER PERFORMANCE:
      ${statsText}
      
      RECENT BATTLE LOGS:
      ${logs.slice(-30).join('\n')}
      
      CURRENT STRATEGY:
      ${currentStrategy}
      
      TASK:
      You are analyzing an RPG battle where a 3-person party fought a Boss with a 4-turn pattern:
      1. Single Attack → 2. AOE → 3. Charge (Safe, telegraphs target) → 4. Execute (Fatal if not taunted)
      
      Constraint: 1 AP regenerates per turn.
      
      Analyze:
      1. Each character's performance (damage efficiency, healing timing, skill usage)
      2. Overall team tactics and coordination
      3. ${battleStats.outcome === 'LOSS' ? 'What went wrong? Which character failed at their role?' : 'What worked well? Which tactics led to victory?'}
      4. Specific actionable improvements for the NEXT battle
      
      Provide a detailed tactical analysis in ${aiLang === 'ZH' ? 'Chinese (中文)' : aiLang === 'JP' ? 'Japanese (日本語)' : 'English'}, structured as:
      
      ## ${aiLang === 'ZH' ? '角色表现分析' : aiLang === 'JP' ? 'キャラクター分析' : 'Character Analysis'}
      [Analysis per character]
      
      ## ${aiLang === 'ZH' ? '整体战术评估' : aiLang === 'JP' ? '戦術評価' : 'Tactical Evaluation'}
      [Team coordination]
      
      ## ${battleStats.outcome === 'LOSS' ? (aiLang === 'ZH' ? '失败原因' : aiLang === 'JP' ? '敗因' : 'Cause of Defeat') : (aiLang === 'ZH' ? '成功要点' : aiLang === 'JP' ? '勝因' : 'Key to Victory')}
      [Key factors]
      
      ## ${aiLang === 'ZH' ? '下次战斗策略建议' : aiLang === 'JP' ? '次回の戦略提案' : 'Next Battle Strategy'}
      [Actionable advice]
      `,
      config: {
        temperature: 0.7,
      }
    });
    return response.text || "分析生成失败。";
  } catch (e) {
    console.error('Strategy Analysis Error:', e);
    return "策略分析失败，请检查 API 配置。";
  }
};