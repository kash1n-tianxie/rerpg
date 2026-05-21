import { Character, Boss, QueuedAction, BossMove, BattleEvent } from '../types';
import { BOSS_SCRIPT, MAX_AP } from '../constants';

// Deep copy helper to ensure immutability during simulation
const cloneState = (characters: Character[], boss: Boss) => {
    return {
        characters: JSON.parse(JSON.stringify(characters)) as Character[],
        boss: JSON.parse(JSON.stringify(boss)) as Boss
    };
};

export interface BattleState {
    characters: Character[];
    boss: Boss;
    turn: number;
    isGameOver: boolean;
    outcome: 'WIN' | 'LOSS' | 'ONGOING';
    totalDamageDealt: number; // Track for RL reward
    totalHealingDone: number; // Track for RL reward
    events: BattleEvent[];
}

export class BattleEngine {
    // Simulate a full turn (All characters -> Boss)
    static simulateTurn(
        initialChars: Character[],
        initialBoss: Boss,
        actions: QueuedAction[],
        turn: number
    ): BattleState {
        let { characters, boss } = cloneState(initialChars, initialBoss);
        let totalDamageDealt = 0;
        let totalHealingDone = 0;
        const events: BattleEvent[] = [];

        // 1. Arthur's Action
        const arthurResult = this.executeCharacterAction('Arthur', actions, characters, boss, events);
        totalDamageDealt += arthurResult.damage;
        totalHealingDone += arthurResult.healing;

        // 2. Merlin's Action
        const merlinResult = this.executeCharacterAction('Merlin', actions, characters, boss, events);
        totalDamageDealt += merlinResult.damage;
        totalHealingDone += merlinResult.healing;

        // 3. Boss Action
        this.executeBossTurn(characters, boss, events);
        if (this.checkGameOver(characters)) return this.createResult(characters, boss, turn, 'LOSS', totalDamageDealt, totalHealingDone, events);

        // 4. Ellie's Action
        const ellieResult = this.executeCharacterAction('Ellie', actions, characters, boss, events);
        totalDamageDealt += ellieResult.damage;
        totalHealingDone += ellieResult.healing;
        if (this.checkGameOver(characters)) return this.createResult(characters, boss, turn, 'LOSS', totalDamageDealt, totalHealingDone, events);

        // End of Turn Updates
        characters.forEach(c => {
            c.ap = c.status.isDead ? 0 : Math.min(MAX_AP, c.ap + 1);
            c.status.taunt = false;
            c.status.shield = 0;
        });
        boss.patternIndex = (boss.patternIndex + 1) % 4;

        return {
            characters,
            boss,
            turn: turn + 1,
            isGameOver: false,
            outcome: 'ONGOING',
            totalDamageDealt,
            totalHealingDone,
            events
        };
    }

    private static createResult(chars: Character[], boss: Boss, turn: number, outcome: 'WIN' | 'LOSS', dmg: number, heal: number, events: BattleEvent[]): BattleState {
        return {
            characters: chars,
            boss: boss,
            turn,
            isGameOver: true,
            outcome,
            totalDamageDealt: dmg,
            totalHealingDone: heal,
            events
        };
    }

    private static checkGameOver(characters: Character[]): boolean {
        return characters.every(c => c.status.isDead);
    }

    private static executeCharacterAction(
        charId: string,
        actions: QueuedAction[],
        characters: Character[],
        boss: Boss,
        events: BattleEvent[]
    ): { damage: number, healing: number } {
        const act = actions.find(a => a.characterId === charId);
        const char = characters.find(c => c.id === charId);
        if (!char || char.status.isDead || !act) return { damage: 0, healing: 0 };

        if (act.skillId === 'WAIT') {
            events.push({ sourceId: charId, targetId: charId, type: 'WAIT', value: 0, message: 'Wait' });
            return { damage: 0, healing: 0 };
        }

        const skill = char.skills.find(s => s.id === act.skillId);
        if (!skill) return { damage: 0, healing: 0 };

        // Deduct AP
        char.ap -= skill.apCost;

        let damageDealt = 0;
        let healingDone = 0;

        // Apply Effects
        if (skill.effectType === 'DAMAGE' || skill.effectType === 'SPECIAL') {
            let dmg = skill.value || 0;
            if (skill.id === 'self_destruct') {
                dmg = Math.floor((boss.maxHp - boss.currentHp) * 0.25);
                char.currentHp = 0;
                char.status.isDead = true;
                events.push({ sourceId: charId, targetId: charId, type: 'DEATH', value: 0, message: 'Self Destructed' });
            }

            boss.currentHp -= dmg;
            damageDealt += dmg;
            events.push({ sourceId: charId, targetId: 'boss', type: 'DAMAGE', value: dmg, skillId: skill.id });
        }
        else if (skill.effectType === 'TAUNT') {
            char.status.taunt = true;
            events.push({ sourceId: charId, targetId: charId, type: 'TAUNT', value: 0, skillId: skill.id });
        }
        else if (skill.effectType === 'SHIELD') {
            let dmg = skill.value || 0; // Shield Bash deals damage too
            boss.currentHp -= dmg;
            damageDealt += dmg;
            char.status.shield += 30; // Hardcoded shield value from constants
            events.push({ sourceId: charId, targetId: 'boss', type: 'DAMAGE', value: dmg, skillId: skill.id });
            events.push({ sourceId: charId, targetId: charId, type: 'SHIELD', value: 30, skillId: skill.id });
        }
        else if (skill.effectType === 'HEAL') {
            // Smart target selection if no target specified
            let target = null;
            if (act.targetId) {
                target = characters.find(c => c.id === act.targetId);
            } else {
                // Auto-select lowest HP ally
                if (skill.targetType === 'ALLY') {
                    // === USER RULE: Ellie prioritizes Mage if Tank HP > 300 ===
                    if (charId === 'Ellie') {
                        const arthur = characters.find(c => c.id === 'Arthur');
                        const merlin = characters.find(c => c.id === 'Merlin');

                        if (arthur && !arthur.status.isDead && arthur.currentHp > 300 && merlin && !merlin.status.isDead) {
                            target = merlin;
                        } else if (arthur && !arthur.status.isDead) {
                            target = arthur;
                        } else {
                            // Fallback to lowest HP
                            target = characters
                                .filter(c => !c.status.isDead)
                                .sort((a, b) => a.currentHp - b.currentHp)[0];
                        }
                    } else {
                        // Standard logic for others
                        target = characters
                            .filter(c => !c.status.isDead)
                            .sort((a, b) => a.currentHp - b.currentHp)[0];
                    }
                } else if (skill.targetType === 'ALLY_EXCEPT_SELF') {
                    // Cannot heal self (e.g., Transfusion)
                    target = characters
                        .filter(c => !c.status.isDead && c.id !== charId)
                        .sort((a, b) => a.currentHp - b.currentHp)[0];
                }
            }

            // Execute heal
            if (skill.targetType === 'ALL_ALLIES') {
                characters.forEach(c => {
                    if (!c.status.isDead) {
                        const healAmt = Math.min(c.maxHp - c.currentHp, skill.value || 0);
                        c.currentHp += healAmt;
                        healingDone += healAmt;
                        events.push({ sourceId: charId, targetId: c.id, type: 'HEAL', value: healAmt, skillId: skill.id });
                    }
                });
            } else if (target && !target.status.isDead) {
                const healAmt = Math.min(target.maxHp - target.currentHp, skill.value || 0);
                target.currentHp += healAmt;
                healingDone += healAmt;
                events.push({ sourceId: charId, targetId: target.id, type: 'HEAL', value: healAmt, skillId: skill.id });
            }
        }

        // Self Damage (Recoil)
        if (skill.selfDamage) {
            char.currentHp -= skill.selfDamage;
            events.push({ sourceId: charId, targetId: charId, type: 'DAMAGE', value: skill.selfDamage, message: 'Recoil' });
            if (char.currentHp <= 0) {
                char.currentHp = 0;
                char.status.isDead = true;
                events.push({ sourceId: charId, targetId: charId, type: 'DEATH', value: 0 });
            }
        }

        return { damage: damageDealt, healing: healingDone };
    }

    private static executeBossTurn(characters: Character[], boss: Boss, events: BattleEvent[]) {
        const move = BOSS_SCRIPT[boss.patternIndex];
        // Assuming 1.0 multiplier for RL training to keep it standard
        const damageMult = 1.0;

        if (move.type === 'NONE') {
            // Gaze / Telegraph
            const livingChars = characters.filter(c => !c.status.isDead);
            if (livingChars.length > 0) {
                const lowestHpChar = livingChars.sort((a, b) => a.currentHp - b.currentHp)[0];
                boss.targetId = lowestHpChar.id;
                events.push({ sourceId: 'boss', targetId: lowestHpChar.id, type: 'INFO', value: 0, message: 'Gaze (Lock On)' });
            }
        } else if (move.type === 'AOE') {
            characters.forEach(c => {
                if (!c.status.isDead) {
                    let dmg = Math.floor(move.damage * damageMult);
                    if (c.status.shield > 0) {
                        const absorbed = Math.min(c.status.shield, dmg);
                        c.status.shield -= absorbed;
                        dmg -= absorbed;
                    }
                    c.currentHp -= dmg;
                    events.push({ sourceId: 'boss', targetId: c.id, type: 'DAMAGE', value: dmg, message: 'Sweep' });

                    if (c.currentHp <= 0) {
                        c.currentHp = 0;
                        c.status.isDead = true;
                        events.push({ sourceId: 'boss', targetId: c.id, type: 'DEATH', value: 0 });
                    }
                }
            });
        } else {
            // Single Target
            let target = null;
            const taunter = characters.find(c => c.status.taunt && !c.status.isDead);

            if (taunter) {
                target = taunter;
            } else if (boss.targetId) {
                target = characters.find(c => c.id === boss.targetId && !c.status.isDead);
            }

            if (!target) {
                const living = characters.filter(c => !c.status.isDead);
                if (living.length > 0) target = living[Math.floor(Math.random() * living.length)];
            }

            if (target) {
                let dmg = Math.floor(move.damage * damageMult);
                if (target.status.taunt) dmg = Math.floor(dmg * 0.3);

                if (target.status.shield > 0) {
                    const absorbed = Math.min(target.status.shield, dmg);
                    target.status.shield -= absorbed;
                    dmg -= absorbed;
                }

                target.currentHp -= dmg;
                events.push({ sourceId: 'boss', targetId: target.id, type: 'DAMAGE', value: dmg, message: move.name['EN'] });

                if (target.currentHp <= 0) {
                    target.currentHp = 0;
                    target.status.isDead = true;
                    events.push({ sourceId: 'boss', targetId: target.id, type: 'DEATH', value: 0 });
                }
            }
            boss.targetId = undefined;
        }
    }
}
