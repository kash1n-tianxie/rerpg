
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Character, Boss, GameMode, LogEntry, QueuedAction, Language, WinRateData, GameSettings, SaveData, VisualEffect, BattleStatistics, CharacterStats, BattleEvent
} from './types';
import { BattleEngine } from './services/BattleEngine';
import {
    INITIAL_CHARACTERS, INITIAL_BOSS, BOSS_SCRIPT, UI_TEXT, MAX_AP, DEFAULT_SETTINGS, GEN0_STRATEGY, GEN5_STRATEGY, STORAGE_KEY, ASSETS, GAME_RULES_CONTENT
} from './constants';
import CharacterCard from './components/CharacterCard';
import EvolutionChart from './components/EvolutionChart';
import SettingsModal from './components/SettingsModal';
import StrategyAnalysisModal from './components/StrategyAnalysisModal';
import EffectsLayer from './components/EffectsLayer';
import FloatingText, { FloatingTextData } from './components/FloatingText';
// Imports removed
// State removed
// Rendering removed
import { getAITurn, analyzeStrategy } from './services/geminiService';
import { audio } from './services/audioService';
import { Play, RotateCcw, Brain, Activity, Globe, X, Settings as SettingsIcon, Terminal, Save as SaveIcon, LogOut, BarChart, TrendingUp, Download, Pause, Zap } from 'lucide-react';

const App: React.FC = () => {
    // --- State ---
    const [turn, setTurn] = useState(1);
    const [characters, setCharacters] = useState<Character[]>(JSON.parse(JSON.stringify(INITIAL_CHARACTERS)));

    // Settings & Evolution
    const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false); // Stats Modal toggle
    const [showRules, setShowRules] = useState(false); // Rules Modal toggle

    // Initialize Boss with Default Settings HP
    const [boss, setBoss] = useState<Boss>({
        ...INITIAL_BOSS,
        maxHp: DEFAULT_SETTINGS.bossMaxHp,
        currentHp: DEFAULT_SETTINGS.bossMaxHp,
        targetId: undefined
    });

    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [mode, setMode] = useState<GameMode>('MANUAL');
    const [phase, setPhase] = useState<'PLANNING' | 'EXECUTING' | 'BOSS_TURN' | 'GAME_OVER' | 'MENU'>('MENU');
    const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
    const [lang, setLang] = useState<Language>('EN');
    const [aiLang, setAiLang] = useState<Language>('EN'); // AI output language
    const [showAiLangSelect, setShowAiLangSelect] = useState(false);

    const [generation, setGeneration] = useState(0);
    const [winRates, setWinRates] = useState<WinRateData[]>([{ generation: 0, winRate: 0, battles: 0 }]);
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    // Strategy State
    const [strategyText, setStrategyText] = useState(GEN0_STRATEGY);

    // New State for Start Button in AI Modes
    const [isAutoStarted, setIsAutoStarted] = useState(false);
    const [isAutoLooping, setIsAutoLooping] = useState(false); // True = Fully Auto, False = Manual Confirm
    const [isPaused, setIsPaused] = useState(false);

    // Selection Mode State
    const [selectionMode, setSelectionMode] = useState<{ characterId: string, skillId: string } | null>(null);

    // Visual Effects
    const [effects, setEffects] = useState<VisualEffect[]>([]);

    // Combat Feedback State
    const [floatingTexts, setFloatingTexts] = useState<FloatingTextData[]>([]);
    const [pendingAP, setPendingAP] = useState<Record<string, number>>({});

    // Strategy Analysis State
    const [showStrategyAnalysis, setShowStrategyAnalysis] = useState(false);
    const [currentBattleStats, setCurrentBattleStats] = useState<BattleStatistics | null>(null);
    const [strategyAnalysisText, setStrategyAnalysisText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [battleHistory, setBattleHistory] = useState<BattleStatistics[]>([]);

    const scrollRef = useRef<HTMLDivElement>(null);

    // --- Audio Volume Sync ---
    useEffect(() => {
        audio.setVolumes(settings.bgmVolume, settings.sfxVolume);
    }, [settings.bgmVolume, settings.sfxVolume]);

    // --- Effects Helper ---
    const triggerEffect = (sourceId: string, targetId: string, type: 'PROJECTILE' | 'FLASH' | 'HEAL_BEAM', color: string, icon?: string) => {
        const id = Date.now().toString() + Math.random();
        setEffects(prev => [...prev, { id, sourceId, targetId, type, color, icon, duration: 600 }]);
        setTimeout(() => {
            setEffects(prev => prev.filter(e => e.id !== id));
        }, 600);
    };

    // --- Floating Text Helper ---
    const showFloatingText = (value: number, type: 'damage' | 'heal' | 'shield', targetId: string) => {
        const id = Date.now().toString() + Math.random();
        setFloatingTexts(prev => [...prev, { id, value, type, targetId }]);
        setTimeout(() => {
            setFloatingTexts(prev => prev.filter(t => t.id !== id));
        }, 800);
    };

    // --- Helpers ---
    const addLog = (message: string, type: LogEntry['type'] = 'INFO', source: string = 'System', thought?: string) => {
        setLogs(prev => [...prev, { turn, source, message, type, thought }]);
    };

    const checkGameOver = useCallback((customChars?: Character[], customBoss?: Boss, customTurn?: number) => {
        const charsToUse = customChars || characters;
        const bossToUse = customBoss || boss;
        const turnToUse = customTurn || turn;
        const allDead = charsToUse.every(c => c.status.isDead);
        if (allDead) {
            addLog(UI_TEXT[lang].missionFailed, 'CRITICAL');
            setPhase('GAME_OVER');
            // Finalize battle stats
            setCurrentBattleStats(prev => prev ? {
                ...prev,
                outcome: 'LOSS',
                bossHpRemaining: bossToUse.currentHp,
                totalTurns: turnToUse
            } : null);
            if (mode === 'AI_GEN5' || mode === 'EVOLUTION') {
                handleWinRateUpdate(false);
            }
            return true;
        }
        if (turnToUse > 50) {
            addLog("战斗达到50回合上限！ (50 Turns Limit Reached)", 'CRITICAL');
            setPhase('GAME_OVER');
            // Finalize battle stats
            setCurrentBattleStats(prev => prev ? {
                ...prev,
                outcome: 'WIN',
                bossHpRemaining: bossToUse.currentHp,
                totalTurns: 50
            } : null);
            if (mode === 'AI_GEN5' || mode === 'EVOLUTION') {
                handleWinRateUpdate(true);
            }
            return true;
        }
        return false;
    }, [characters, boss, mode, lang, turn]);

    // --- Engine Logic ---

    const handleWinRateUpdate = (isWin: boolean) => {
        setWinRates(prev => {
            const last = prev[prev.length - 1];
            const newWins = (last.winRate * last.battles / 100) + (isWin ? 1 : 0);
            const newBattles = last.battles + 1;
            const newRate = (newWins / newBattles) * 100;
            return [...prev.slice(0, -1), { ...last, winRate: newRate, battles: newBattles }];
        });
    };

    // --- Helper Functions ---
    const getTimestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

    const downloadFile = (content: string | Blob, filename: string, mimeType: string = 'text/plain') => {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadLogs = () => {
        const timestamp = getTimestamp();
        const outcome = characters.every(c => c.status.isDead) ? 'LOSS' : 'WIN';
        const filename = `Gen${generation}_${outcome}_${timestamp}.txt`;

        const content = logs.map(l => {
            let text = `[T${l.turn}] [${l.source}]: ${l.message}`;
            if (l.thought) text += `\n   >>> LOGIC KERNEL >>>\n   ${l.thought}\n   <<< END LOGIC <<<`;
            return text;
        }).join('\n') + `\n\n=== STRATEGY SNAPSHOT ===\n${strategyText}`;

        downloadFile(content, filename);
    };

    const exportBattleJSON = () => {
        const timestamp = getTimestamp();
        const outcome = characters.every(c => c.status.isDead) ? 'LOSS' : 'WIN';
        const filename = `BattleData_Gen${generation}_${outcome}_${timestamp}.json`;

        const exportData = {
            metadata: {
                generation,
                timestamp: new Date().toISOString(),
                outcome,
                mode,
                gameSettings: settings
            },
            battleState: {
                turn,
                characters: characters.map(c => ({
                    id: c.id,
                    name: c.name,
                    role: c.role,
                    currentHp: c.currentHp,
                    maxHp: c.maxHp,
                    ap: c.ap,
                    status: c.status
                })),
                boss: {
                    name: boss.name,
                    currentHp: boss.currentHp,
                    maxHp: boss.maxHp,
                    patternIndex: boss.patternIndex
                }
            },
            logs: logs.map(l => ({
                turn: l.turn,
                source: l.source,
                message: l.message,
                type: l.type,
                thought: l.thought
            })),
            statistics: currentBattleStats,
            strategy: {
                currentStrategy: strategyText,
                winRates: winRates
            },
            battleHistory: battleHistory.slice(-10) // Last 10 battles
        };

        downloadFile(JSON.stringify(exportData, null, 2), filename, 'application/json');
        audio.playSFX('CLICK');
    };

    const exportBattleCSV = () => {
        const timestamp = getTimestamp();
        const filename = `Statistics_Gen${generation}_${timestamp}.csv`;

        // CSV Header
        let csv = 'Generation,Battles,WinRate,Outcome,TotalTurns,BossHPRemaining\n';

        // Win rates data
        winRates.forEach(wr => {
            csv += `${wr.generation},${wr.battles},${wr.winRate.toFixed(2)},-,-,-\n`;
        });

        // Current battle data
        if (currentBattleStats) {
            csv += `${generation},-,-,${currentBattleStats.outcome},${currentBattleStats.totalTurns},${currentBattleStats.bossHpRemaining}\n`;
        }

        // Character statistics
        csv += '\nCharacter,DamageDealt,HealingDone,DamageTaken,APSpent,TurnsSurvived\n';
        currentBattleStats?.characterStats.forEach(cs => {
            csv += `${cs.characterName},${cs.damageDealt},${cs.healingDone},${cs.damageTaken},${cs.apSpent},${cs.turnsSurvived}\n`;
        });

        downloadFile(csv, filename, 'text/csv');
        audio.playSFX('CLICK');
    };


    // --- Persistence ---
    const saveGame = () => {
        const data: SaveData = {
            generation,
            winRates,
            settings,
            strategyText,
            battleHistory,
            lastAnalysis: currentBattleStats && strategyAnalysisText ? {
                generation,
                timestamp: Date.now(),
                analysisText: strategyAnalysisText,
                battleStats: currentBattleStats
            } : undefined
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        addLog(UI_TEXT[lang].saving, 'INFO');
        audio.playSFX('CLICK');
    };

    const loadGame = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data: SaveData = JSON.parse(saved);
            setGeneration(data.generation);
            setWinRates(data.winRates);
            setSettings(data.settings);
            setStrategyText(data.strategyText);
            setBattleHistory(data.battleHistory || []);
            if (data.lastAnalysis) {
                setCurrentBattleStats(data.lastAnalysis.battleStats);
                setStrategyAnalysisText(data.lastAnalysis.analysisText);
            }
            addLog(UI_TEXT[lang].saveLoaded, 'INFO');
            // Reset game state to start of battle
            setPhase('PLANNING');
            resetGame(false); // Reset battle entities but keep metadata
            setTurn(1);
        }
    };

    const startNewGame = () => {
        localStorage.removeItem(STORAGE_KEY);
        setGeneration(0);
        setWinRates([{ generation: 0, winRate: 0, battles: 0 }]);
        setStrategyText(GEN0_STRATEGY);
        setPhase('PLANNING');
        resetGame(false);
        audio.startBGM(); // Start music on user interaction
    };

    const handleAutoEvolution = async () => {
        if (!currentBattleStats) return;

        addLog(UI_TEXT[lang].analyzing, 'THOUGHT');
        const textLogs = logs.map(l => `[${l.source}]: ${l.message}`);
        const analysis = await analyzeStrategy(currentBattleStats, textLogs, strategyText, aiLang);

        // Update Strategy
        const newStrategy = strategyText + `\n\n[GEN ${generation + 1} ANALYSIS]\n${analysis}`;
        setStrategyText(newStrategy);

        // Next Gen
        setGeneration(g => g + 1);
        setWinRates(prev => [...prev, { generation: prev.length, winRate: 0, battles: 0 }]);
        saveGame();
        resetGame(true);
    };

    // --- Auto-Evolution & Log Download Effects ---
    useEffect(() => {
        if (phase === 'GAME_OVER') {
            if (isAutoLooping && !isPaused) {
                downloadLogs();
            }

            if (mode === 'EVOLUTION' && isAutoStarted) {
                if (!isAutoLooping || isPaused) return;

                const timer = setTimeout(() => {
                    handleAutoEvolution();
                }, 2000);
                return () => clearTimeout(timer);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, mode, isAutoStarted, isAutoLooping, isPaused]);


    // Initialize battle stats at start of battle
    const initializeBattleStats = () => {
        const stats: CharacterStats[] = characters.map(c => ({
            characterId: c.id,
            characterName: c.name,
            damageDealt: 0,
            healingDone: 0,
            damageTaken: 0,
            skillsUsed: {},
            turnsSurvived: 0,
            apSpent: 0
        }));
        const battleStats: BattleStatistics = {
            battleId: Date.now().toString(),
            generation,
            timestamp: Date.now(),
            outcome: 'LOSS',
            totalTurns: 0,
            characterStats: stats,
            bossHpRemaining: boss.currentHp
        };
        setCurrentBattleStats(battleStats);
    };

    // Track stat updates
    const updateBattleStat = (charId: string, update: Partial<CharacterStats>) => {
        setCurrentBattleStats(prev => {
            if (!prev) return prev;
            const newStats = prev.characterStats.map(cs => {
                if (cs.characterId === charId) {
                    return {
                        ...cs,
                        damageDealt: cs.damageDealt + (update.damageDealt || 0),
                        healingDone: cs.healingDone + (update.healingDone || 0),
                        damageTaken: cs.damageTaken + (update.damageTaken || 0),
                        apSpent: cs.apSpent + (update.apSpent || 0),
                        skillsUsed: {
                            ...cs.skillsUsed,
                            ...Object.fromEntries(
                                Object.entries(update.skillsUsed || {}).map(([k, v]) => [
                                    k,
                                    (cs.skillsUsed[k] || 0) + v
                                ])
                            )
                        }
                    };
                }
                return cs;
            });
            return { ...prev, characterStats: newStats };
        });
    };

    const processBattleEvents = async (events: BattleEvent[]) => {
        for (const event of events) {
            await new Promise(r => setTimeout(r, settings.gameSpeed / 2));

            // Sound & Effects
            if (event.type === 'DAMAGE') {
                audio.playSFX('ATTACK');
                // Use skill specific effects if possible, else generic
                triggerEffect(event.sourceId, event.targetId, 'PROJECTILE', '#ffaa00', '🔥');
            } else if (event.type === 'HEAL') {
                audio.playSFX('HEAL');
                triggerEffect(event.sourceId, event.targetId, 'HEAL_BEAM', '#00ff00', '💚');
            } else if (event.type === 'SHIELD') {
                audio.playSFX('ATTACK');
                triggerEffect(event.sourceId, event.targetId, 'FLASH', '#ffff00', '🛡️');
            } else if (event.type === 'TAUNT') {
                audio.playSFX('CHARGE');
                triggerEffect(event.sourceId, event.sourceId, 'FLASH', '#ffff00', '🛡️');
            } else if (event.type === 'INFO' && event.message?.includes('Gaze')) {
                audio.playSFX('CHARGE');
                triggerEffect('boss-unit', 'boss-unit', 'FLASH', '#8800ff', '👁️');
            }

            // Update State (Visuals)
            if (event.type === 'DAMAGE') {
                if (event.targetId === 'boss' || event.targetId === 'boss-unit') {
                    setBoss(b => ({ ...b, currentHp: Math.max(0, b.currentHp - event.value) }));
                    showFloatingText(event.value, 'damage', 'boss-unit');
                    if (event.sourceId !== 'boss' && event.sourceId !== 'boss-unit') {
                        updateBattleStat(event.sourceId, { damageDealt: event.value });
                    }
                } else {
                    setCharacters(chars => chars.map(c => c.id === event.targetId ? { ...c, currentHp: Math.max(0, c.currentHp - event.value) } : c));
                    showFloatingText(event.value, 'damage', event.targetId);
                    if (event.sourceId === 'boss' || event.sourceId === 'boss-unit') {
                        updateBattleStat(event.targetId, { damageTaken: event.value });
                    }
                }
            } else if (event.type === 'HEAL') {
                setCharacters(chars => chars.map(c => c.id === event.targetId ? { ...c, currentHp: Math.min(c.maxHp, c.currentHp + event.value) } : c));
                showFloatingText(event.value, 'heal', event.targetId);
                updateBattleStat(event.sourceId, { healingDone: event.value });
            } else if (event.type === 'SHIELD') {
                setCharacters(chars => chars.map(c => c.id === event.sourceId ? { ...c, status: { ...c.status, shield: c.status.shield + event.value } } : c));
                showFloatingText(event.value, 'shield', event.sourceId);
            } else if (event.type === 'TAUNT') {
                setCharacters(chars => chars.map(c => c.id === event.sourceId ? { ...c, status: { ...c.status, taunt: true } } : c));
            } else if (event.type === 'DEATH') {
                if (event.targetId === 'boss') {
                    setBoss(b => ({ ...b, currentHp: 0 }));
                } else {
                    setCharacters(chars => chars.map(c => c.id === event.targetId ? { ...c, currentHp: 0, status: { ...c.status, isDead: true } } : c));
                    addLog(`${event.targetId} ${UI_TEXT[lang].fallen}`, 'CRITICAL', event.targetId);
                }
            } else if (event.type === 'INFO') {
                if (event.message === 'Gaze (Lock On)') {
                    setBoss(b => ({ ...b, targetId: event.targetId }));
                    addLog(`LOCKS ONTO WEAKEST TARGET!`, 'CRITICAL', UI_TEXT[lang].boss);
                }
            }

            // Logs
            let sourceName = event.sourceId;
            const sourceChar = characters.find(c => c.id === event.sourceId);
            if (sourceChar) sourceName = sourceChar.name;
            if (event.sourceId === 'boss') sourceName = UI_TEXT[lang].boss;

            if (event.message && event.type !== 'INFO' && event.type !== 'WAIT') {
                if (event.type === 'DAMAGE' && event.skillId) {
                    addLog(`Deals ${event.value} damage.`, 'DAMAGE', sourceName);
                } else if (event.type === 'HEAL') {
                    addLog(`Heals for ${event.value}.`, 'HEAL', sourceName);
                } else if (event.message) {
                    addLog(event.message, 'INFO', sourceName);
                }
            } else if (event.type === 'WAIT') {
                addLog(`${sourceName} holds position.`, 'INFO', sourceName);
            }
        }
    };

    const executeCharacterAction = async (charId: string, actions: QueuedAction[], currentChars: Character[], currentBoss: Boss) => {
        const act = actions.find(a => a.characterId === charId);
        const charIndex = currentChars.findIndex(c => c.id === charId);
        if (charIndex === -1) return;
        const char = currentChars[charIndex];

        if (char.status.isDead || !act) return;

        if (act.skillId === 'WAIT') {
            addLog(`${char.name} holds position.`, 'INFO', char.name);
            return;
        }

        const skill = char.skills.find(s => s.id === act.skillId);
        if (!skill) return;

        char.ap -= skill.apCost;
        updateBattleStat(charId, { apSpent: skill.apCost, skillsUsed: { [skill.id]: 1 } });
        addLog(`${skill.name[lang]}`, 'ACTION', char.name);
        audio.playSFX('CHARGE');

        // Visuals for Charging
        triggerEffect(charId, charId, 'FLASH', '#fff');
        await new Promise(r => setTimeout(r, 200));

        // Effect Types - Execute BEFORE self-damage to ensure effects apply even if caster dies
        if (skill.effectType === 'TAUNT') {
            char.status.taunt = true;
            audio.playSFX('CHARGE');
            addLog('Draws enemy attention! (70% Dmg Reduc)', 'INFO', char.name);
            triggerEffect(charId, charId, 'FLASH', '#ffff00', '🛡️');

        } else if (skill.effectType === 'SHIELD') {
            char.status.shield += 30;
            showFloatingText(30, 'shield', charId);
            audio.playSFX('ATTACK');
            if (skill.value) {
                triggerEffect(charId, 'boss-unit', 'PROJECTILE', '#ffff00', '🛡️');
                await new Promise(r => setTimeout(r, 600)); // Wait for projectile
                currentBoss.currentHp -= skill.value;
                updateBattleStat(charId, { damageDealt: skill.value });
                showFloatingText(skill.value, 'damage', 'boss-unit');

                addLog(`Deals ${skill.value} damage & gains Shield.`, 'DAMAGE', char.name);
                audio.playSFX('DAMAGE');
            }
        } else if (skill.effectType === 'SPECIAL' && skill.id === 'self_destruct') {
            const bossMissingHp = currentBoss.maxHp - currentBoss.currentHp;
            const dmg = Math.floor(bossMissingHp * 0.25);
            triggerEffect(charId, 'boss-unit', 'PROJECTILE', '#ff0000', '💥');
            await new Promise(r => setTimeout(r, 600));
            currentBoss.currentHp -= dmg;
            updateBattleStat(charId, { damageDealt: dmg });
            showFloatingText(dmg, 'damage', 'boss-unit');

            addLog(`Sacrifices life! Deals ${dmg} damage.`, 'CRITICAL', char.name);
            audio.playSFX('DAMAGE');

            char.currentHp = 0;
            char.status.isDead = true;
            addLog(`${char.name} ${UI_TEXT[lang].fallen}`, 'CRITICAL', char.name);

        } else if (skill.effectType === 'DAMAGE') {
            if (skill.value) {
                triggerEffect(charId, 'boss-unit', 'PROJECTILE', '#ffaa00', '🔥');
                await new Promise(r => setTimeout(r, 600));
                currentBoss.currentHp -= skill.value;
                updateBattleStat(charId, { damageDealt: skill.value });
                showFloatingText(skill.value, 'damage', 'boss-unit');

                addLog(`Deals ${skill.value} damage to Boss.`, 'DAMAGE', char.name);
                audio.playSFX('ATTACK');
            }
        } else if (skill.effectType === 'HEAL') {
            let target = null;
            if (act.targetId) {
                target = currentChars.find(c => c.id === act.targetId);
            }
            if (!target) {
                // ... (Target logic existing)
                if (skill.targetType === 'ALL_ALLIES') {
                    // handled below
                } else if (skill.targetType === 'ALLY_EXCEPT_SELF') {
                    target = currentChars.reduce((prev, curr) =>
                        (curr.id !== char.id && curr.currentHp / curr.maxHp < prev.currentHp / prev.maxHp && !curr.status.isDead) ? curr : prev
                    );
                    if (target.id === char.id) target = null;
                } else {
                    target = currentChars.reduce((prev, curr) =>
                        (curr.currentHp / curr.maxHp < prev.currentHp / prev.maxHp && !curr.status.isDead) ? curr : prev
                    );
                }
            }

            if (skill.targetType === 'ALL_ALLIES') {
                currentChars.forEach(c => {
                    if (!c.status.isDead) {
                        triggerEffect(charId, c.id, 'HEAL_BEAM', '#00ff00', '💚');
                        c.currentHp = Math.min(c.maxHp, c.currentHp + (skill.value || 0));
                        updateBattleStat(charId, { healingDone: skill.value || 0 });
                        showFloatingText(skill.value || 0, 'heal', c.id);
                    }
                });
                audio.playSFX('HEAL');
                addLog(`Heals party for ${skill.value}.`, 'HEAL', char.name);
            } else if (target && !target.status.isDead) {
                triggerEffect(charId, target.id, 'HEAL_BEAM', '#00ff00', '💚');
                await new Promise(r => setTimeout(r, 600));
                target.currentHp = Math.min(target.maxHp, target.currentHp + (skill.value || 0));
                updateBattleStat(charId, { healingDone: skill.value || 0 });
                showFloatingText(skill.value || 0, 'heal', target.id);
                audio.playSFX('HEAL');
                addLog(`Heals ${target.name} for ${skill.value}.`, 'HEAL', char.name);
            }
        }

        // Apply self-damage AFTER skill effects (so effects apply even if caster dies)
        if (skill.selfDamage) {
            char.currentHp -= skill.selfDamage;
            showFloatingText(skill.selfDamage, 'damage', charId);
            addLog(`Takes ${skill.selfDamage} recoil damage!`, 'DAMAGE', char.name);
            audio.playSFX('DAMAGE');
            if (char.currentHp <= 0) {
                char.currentHp = 0;
                char.status.isDead = true;
                addLog(`${char.name} ${UI_TEXT[lang].fallen}`, 'CRITICAL', char.name);
            }
        }

        setCharacters([...currentChars]);
        setBoss({ ...currentBoss });

        await new Promise(r => setTimeout(r, settings.gameSpeed / 2));
    }

    const executeBossTurn = async (currentChars: Character[], currentBoss: Boss) => {
        setPhase('BOSS_TURN');
        const bossMove = BOSS_SCRIPT[currentBoss.patternIndex];
        addLog(`${bossMove.name[lang]}`, 'ACTION', UI_TEXT[lang].boss);
        const damageMult = settings.bossDamageMultiplier;

        if (bossMove.type === 'NONE') {
            audio.playSFX('CHARGE');
            triggerEffect('boss-unit', 'boss-unit', 'FLASH', '#8800ff', '👁️');
            // Telegraph logic...
            const livingChars = currentChars.filter(c => !c.status.isDead);
            let targetId = null;
            if (livingChars.length > 0) {
                const lowestHpChar = livingChars.sort((a, b) => a.currentHp - b.currentHp)[0];
                targetId = lowestHpChar.id;
            }
            if (targetId) {
                currentBoss.targetId = targetId;
                addLog(`LOCKS ONTO WEAKEST TARGET!`, 'CRITICAL', UI_TEXT[lang].boss);
            }

        } else if (bossMove.type === 'AOE') {
            currentChars.forEach(c => {
                if (!c.status.isDead) {
                    triggerEffect('boss-unit', c.id, 'PROJECTILE', '#8800ff', '🌊');
                }
            });
            await new Promise(r => setTimeout(r, 600));
            audio.playSFX('DAMAGE');


            // Apply Damage...
            currentChars.forEach(c => {
                if (!c.status.isDead) {
                    let dmg = Math.floor(bossMove.damage * damageMult);
                    if (c.status.shield > 0) {
                        const absorbed = Math.min(c.status.shield, dmg);
                        c.status.shield -= absorbed;
                        dmg -= absorbed;
                    }
                    c.currentHp -= dmg;
                    updateBattleStat(c.id, { damageTaken: dmg });
                    showFloatingText(dmg, 'damage', c.id);
                    addLog(`Takes ${dmg} damage.`, 'DAMAGE', c.name);
                    if (c.currentHp <= 0) {
                        c.currentHp = 0;
                        c.status.isDead = true;
                        addLog(`${c.name} ${UI_TEXT[lang].fallen}`, 'CRITICAL', c.name);
                    }
                }
            });
        } else {
            // Single Target logic...
            let target = null;
            let isRedirected = false;

            const taunter = currentChars.find(c => c.status.taunt && !c.status.isDead);

            if (taunter) {
                target = taunter;
                isRedirected = currentBoss.targetId && currentBoss.targetId !== taunter.id;
            } else if (currentBoss.targetId) {
                target = currentChars.find(c => c.id === currentBoss.targetId && !c.status.isDead);
            }
            if (!target) {
                const living = currentChars.filter(c => !c.status.isDead);
                if (living.length > 0) target = living[Math.floor(Math.random() * living.length)];
            }

            if (target) {
                triggerEffect('boss-unit', target.id, 'PROJECTILE', '#8800ff', '⚔️');
                await new Promise(r => setTimeout(r, 600));
                audio.playSFX('DAMAGE');

                let dmg = Math.floor(bossMove.damage * damageMult);
                if (target.status.taunt) dmg = Math.floor(dmg * 0.3);
                if (target.status.shield > 0) {
                    const absorbed = Math.min(target.status.shield, dmg);
                    target.status.shield -= absorbed;
                    dmg -= absorbed;
                }
                target.currentHp -= dmg;
                updateBattleStat(target.id, { damageTaken: dmg });
                showFloatingText(dmg, 'damage', target.id);


                addLog(`Takes ${dmg} damage.`, 'DAMAGE', target.name);
                if (target.currentHp <= 0) {
                    target.currentHp = 0;
                    target.status.isDead = true;
                    addLog(`${target.name} ${UI_TEXT[lang].fallen}`, 'CRITICAL', target.name);
                }
            }
            currentBoss.targetId = undefined;
        }

        setCharacters([...currentChars]);
        setBoss({ ...currentBoss });
        await new Promise(r => setTimeout(r, settings.gameSpeed));
    }

    const executeTurn = async (actions: QueuedAction[]) => {
        setPhase('EXECUTING');
        setSelectionMode(null);

        // Run simulation
        const result = BattleEngine.simulateTurn(characters, boss, actions, turn);

        // Process events for UI
        await processBattleEvents(result.events);

        // Sync final state (in case of drift or to ensure absolute correctness)
        setCharacters(result.characters);
        setBoss(result.boss);
        setTurn(result.turn);

        // Check Game Over
        if (result.isGameOver) {
            checkGameOver(result.characters, result.boss, result.turn);
        } else {
            setPhase('PLANNING');
        }

        setQueuedActions([]);
        setPendingAP({});

        // Update turns survived logic
        setCurrentBattleStats(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                totalTurns: result.turn,
                characterStats: prev.characterStats.map(cs => {
                    const char = result.characters.find(c => c.id === cs.characterId);
                    return {
                        ...cs,
                        turnsSurvived: char && !char.status.isDead ? cs.turnsSurvived + 1 : cs.turnsSurvived
                    };
                })
            };
        });
    };

    const handleManualAction = (charId: string, skillId: string) => {
        const char = characters.find(c => c.id === charId);
        const skill = char?.skills.find(s => s.id === skillId);
        if (!skill || !char) return;

        // Check if already queued (toggle or switch)
        const existingAction = queuedActions.find(a => a.characterId === charId);

        if (existingAction) {
            // 1. If clicking the SAME skill -> Toggle OFF (Deselect)
            if (existingAction.skillId === skillId) {
                // Remove from queue
                setQueuedActions(prev => prev.filter(a => a.characterId !== charId));
                // Restore AP (remove pending entry)
                setPendingAP(prev => {
                    const newPending = { ...prev };
                    delete newPending[charId];
                    return newPending;
                });
                audio.playSFX('CLICK');
                // Also clear selection mode if it was this skill
                if (selectionMode?.characterId === charId) {
                    setSelectionMode(null);
                }
                return;
            }

            // 2. If clicking a DIFFERENT skill -> Switch skill
            // Check if base AP is enough for the NEW skill (ignoring the cost of the old skill since we are cancelling it)
            if (char.ap < skill.apCost) {
                audio.playSFX('DAMAGE'); // Error sound
                // Ideally trigger shake on the specific button, but global shake is okay for now
                return;
            }

            // Remove old action and Add new action
            // First, clear selection mode if it was active for the old skill
            if (selectionMode?.characterId === charId) {
                setSelectionMode(null);
            }

            audio.playSFX('CLICK');

            // If new skill requires target, enter selection mode
            if (skill.targetType === 'ALLY' || skill.targetType === 'ALLY_EXCEPT_SELF') {
                // We need to remove the old action from queue first
                setQueuedActions(prev => prev.filter(a => a.characterId !== charId));

                setSelectionMode({ characterId: charId, skillId: skillId });
                // Update Pending AP to reflect NEW skill cost
                setPendingAP(prev => ({ ...prev, [charId]: char.ap - skill.apCost }));
            } else {
                // Direct queue
                // We use setQueuedActions with a callback to ensure we filter out the old one
                setQueuedActions(prev => {
                    const filtered = prev.filter(a => a.characterId !== charId);
                    return [...filtered, { characterId: charId, skillId }];
                });
                // Update Pending AP
                setPendingAP(prev => ({ ...prev, [charId]: char.ap - skill.apCost }));
            }

        } else {
            // 3. No existing action -> Normal Selection
            if (char.ap < skill.apCost) {
                audio.playSFX('DAMAGE');
                return;
            }

            audio.playSFX('CLICK');
            if (skillId === 'WAIT') {
                queueAction(charId, skillId);
                return;
            }

            if (skill.targetType === 'ALLY' || skill.targetType === 'ALLY_EXCEPT_SELF') {
                setSelectionMode({ characterId: charId, skillId: skillId });
                setPendingAP(prev => ({ ...prev, [charId]: char.ap - skill.apCost }));
            } else {
                queueAction(charId, skillId);
                setPendingAP(prev => ({ ...prev, [charId]: char.ap - skill.apCost }));
            }
        }
    };

    const handleTargetSelection = (targetId: string) => {
        audio.playSFX('CLICK');
        if (selectionMode) {
            queueAction(selectionMode.characterId, selectionMode.skillId, targetId);
            setSelectionMode(null);
        }
    };

    const queueAction = (charId: string, skillId: string, targetId?: string) => {
        setQueuedActions(prev => {
            const filtered = prev.filter(a => a.characterId !== charId);
            return [...filtered, { characterId: charId, skillId, targetId }];
        });
    };

    const submitTurn = () => {
        audio.playSFX('CLICK');
        const finalActions = [...queuedActions];
        characters.forEach(c => {
            if (!c.status.isDead && !finalActions.find(a => a.characterId === c.id)) {
                finalActions.push({ characterId: c.id, skillId: 'WAIT' });
            }
        });
        executeTurn(finalActions);
    };

    const resetGame = (keepMode = false) => {
        setCharacters(JSON.parse(JSON.stringify(INITIAL_CHARACTERS)));
        setBoss({ ...INITIAL_BOSS, maxHp: settings.bossMaxHp, currentHp: settings.bossMaxHp, targetId: undefined });
        setTurn(1);
        setPhase('PLANNING');
        setLogs([]);
        setQueuedActions([]);
        setSelectionMode(null);
        setIsAutoStarted(keepMode && isAutoStarted);
        setEffects([]);
        initializeBattleStats(); // Initialize stats for new battle

        if (!keepMode) {

            setGeneration(0);
            setWinRates([{ generation: 0, winRate: 0, battles: 0 }]);
            setIsAutoStarted(false);
        }
    };

    // Strategy Analysis Handler
    const handleStrategyAnalysis = async () => {
        if (!currentBattleStats) return;
        setIsAnalyzing(true);
        setShowStrategyAnalysis(true);
        const textLogs = logs.map(l => `[${l.source}]: ${l.message}`);
        const analysis = await analyzeStrategy(currentBattleStats, textLogs, strategyText, aiLang);
        setStrategyAnalysisText(analysis);
        setIsAnalyzing(false);

        // Save to history
        setBattleHistory(prev => [...prev, currentBattleStats]);
    };

    const handleSaveStrategy = (newStrategy: string) => {
        setStrategyText(newStrategy);
        setShowStrategyAnalysis(false);
        audio.playSFX('CLICK');
        addLog('策略已更新', 'INFO');
        saveGame();
    };

    // AI Logic Hook (Existing)
    useEffect(() => {
        const runAI = async () => {
            if (mode !== 'MANUAL' && isAutoStarted && !isPaused && phase === 'PLANNING' && !isProcessingAI) {
                setIsProcessingAI(true);
                const { actions, thought } = await getAITurn(turn, characters, boss, strategyText, aiLang);
                if (thought) {
                    const displaySource = mode === 'EVOLUTION' ? `Gen ${generation} AI` : mode === 'AI_GEN0' ? UI_TEXT[lang].gen0 : UI_TEXT[lang].gen5;
                    addLog(thought, 'THOUGHT', displaySource);
                }
                executeTurn(actions);
                setIsProcessingAI(false);
            }
        };
        runAI();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isAutoStarted, isPaused, phase, turn, generation, strategyText]);

    // Scroll logs
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [logs]);

    const getBossSkillDescription = (index: number) => {
        const move = BOSS_SCRIPT[index];
        const dmg = Math.floor(move.damage * settings.bossDamageMultiplier);
        return move.descTemplate[lang].replace('{dmg}', dmg.toString());
    };

    const exportSaveData = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            audio.playSFX('DAMAGE');
            addLog(UI_TEXT[lang].noSaveData || "No save data found", 'INFO');
            return;
        }
        const timestamp = getTimestamp();
        downloadFile(saved, `RERPG_Backup_${timestamp}.json`, 'application/json');
        audio.playSFX('CLICK');
        addLog(UI_TEXT[lang].saveExported || "Save data exported", 'INFO');
    };

    const importSaveData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                // Basic validation
                const data = JSON.parse(content);
                if (!data.generation && data.generation !== 0) throw new Error("Invalid save file");

                localStorage.setItem(STORAGE_KEY, content);
                audio.playSFX('HEAL');
                addLog(UI_TEXT[lang].saveLoaded || "Save data imported", 'INFO');

                // Reload to apply changes
                setTimeout(() => window.location.reload(), 1000);
            } catch (err) {
                console.error(err);
                audio.playSFX('DAMAGE');
                addLog("Invalid Save File", 'CRITICAL');
            }
        };
        reader.readAsText(file);
    };

    // --- MENU RENDER ---
    if (phase === 'MENU') {
        const rules = GAME_RULES_CONTENT[lang];
        return (
            <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="scanlines"></div>

                {/* Rules Modal */}
                {showRules && (
                    // ... (Rules Modal Content kept same) ...
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                        <div className="bg-slate-950 border-4 border-cyan-600 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                            <div className="flex-none flex justify-between items-center p-6 border-b-2 border-cyan-400 bg-slate-950">
                                <h2 className="text-2xl font-bold text-cyan-300 font-pixel">{rules.title}</h2>
                                <button onClick={() => setShowRules(false)} className="text-white hover:text-red-400 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200">
                                {/* ... rules content ... */}
                                <section className="bg-slate-900/50 p-4 rounded border-2 border-red-900">
                                    <h3 className="text-lg font-bold text-red-400 font-pixel mb-3">{rules.bossSection.title}</h3>
                                    <p className="text-yellow-300 font-pixel text-sm mb-2">{rules.bossSection.hp}</p>
                                    <p className="font-bold mb-2 text-sm">{rules.bossSection.pattern}</p>
                                    <ul className="space-y-1 text-sm ml-4">
                                        <li>• {rules.bossSection.turn1}</li>
                                        <li>• {rules.bossSection.turn2}</li>
                                        <li className="text-purple-300">• {rules.bossSection.turn3}</li>
                                        <li className="text-red-300 font-bold">• {rules.bossSection.turn4}</li>
                                    </ul>
                                </section>
                                {/* ... other sections ... */}
                                <section className="bg-slate-900/50 p-4 rounded border-2 border-cyan-900">
                                    <h3 className="text-lg font-bold text-cyan-400 font-pixel mb-3">{rules.charactersSection.title}</h3>
                                    <div className="mb-3 pb-3 border-b border-slate-700">
                                        <p className="font-bold text-yellow-300 text-sm mb-1">{rules.charactersSection.tank.name}</p>
                                        <ul className="space-y-0.5 text-xs ml-4">
                                            <li>• {rules.charactersSection.tank.skill1}</li>
                                            <li>• {rules.charactersSection.tank.skill2}</li>
                                            <li>• {rules.charactersSection.tank.skill3}</li>
                                        </ul>
                                    </div>
                                    <div className="mb-3 pb-3 border-b border-slate-700">
                                        <p className="font-bold text-orange-300 text-sm mb-1">{rules.charactersSection.mage.name}</p>
                                        <ul className="space-y-0.5 text-xs ml-4">
                                            <li>• {rules.charactersSection.mage.skill1}</li>
                                            <li>• {rules.charactersSection.mage.skill2}</li>
                                            <li>• {rules.charactersSection.mage.skill3}</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-bold text-green-300 text-sm mb-1">{rules.charactersSection.healer.name}</p>
                                        <ul className="space-y-0.5 text-xs ml-4">
                                            <li>• {rules.charactersSection.healer.skill1}</li>
                                            <li>• {rules.charactersSection.healer.skill2}</li>
                                            <li>• {rules.charactersSection.healer.skill3}</li>
                                        </ul>
                                    </div>
                                </section>
                                <section className="bg-slate-900/50 p-4 rounded border-2 border-blue-900">
                                    <h3 className="text-lg font-bold text-blue-400 font-pixel mb-3">{rules.gameplaySection.title}</h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-cyan-300 font-bold">▸</span> {rules.gameplaySection.turnOrder}</p>
                                        <p><span className="text-cyan-300 font-bold">▸</span> {rules.gameplaySection.howToPlay}</p>
                                        <p><span className="text-cyan-300 font-bold">▸</span> {rules.gameplaySection.apSystem}</p>
                                    </div>
                                </section>
                            </div>
                            <div className="flex-none p-6 pt-4 border-t-2 border-cyan-800 bg-slate-950">
                                <button
                                    onClick={() => setShowRules(false)}
                                    className="bg-slate-800 border-2 border-cyan-600 p-3 text-white hover:bg-cyan-800 hover:border-cyan-400 font-pixel text-sm w-full transition-colors"
                                >
                                    {UI_TEXT[lang].cancel}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="z-10 text-center space-y-8 animate-bounce-slight">
                    <h1 className="text-4xl md:text-6xl font-bold text-cyan-400 font-pixel tracking-tighter drop-shadow-[4px_4px_0_#000044]">
                        {UI_TEXT[lang].menuTitle}
                    </h1>
                    <p className="text-blue-300 font-pixel text-xs animate-pulse">PRESS START TO INITIALIZE</p>

                    <div className="flex flex-col gap-4 w-64 mx-auto">
                        <button
                            onClick={startNewGame}
                            className="jrpg-box p-4 text-white hover:bg-blue-800 font-pixel text-sm active:translate-y-1 transition-all"
                        >
                            {UI_TEXT[lang].menuNewGame}
                        </button>

                        <button
                            onClick={() => { loadGame(); audio.startBGM(); }}
                            disabled={!localStorage.getItem(STORAGE_KEY)}
                            className="jrpg-box p-4 text-white hover:bg-blue-800 font-pixel text-sm active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {UI_TEXT[lang].menuContinue}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={exportSaveData}
                                disabled={!localStorage.getItem(STORAGE_KEY)}
                                className="flex-1 jrpg-box p-3 text-yellow-300 border-yellow-600 hover:bg-yellow-900/50 font-pixel text-xs active:translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                                title="Backup Save"
                            >
                                <SaveIcon size={14} /> BACKUP
                            </button>
                            <label className="flex-1 jrpg-box p-3 text-green-300 border-green-600 hover:bg-green-900/50 font-pixel text-xs active:translate-y-1 transition-all cursor-pointer flex items-center justify-center gap-1">
                                <Download size={14} /> RESTORE
                                <input type="file" accept=".json" onChange={importSaveData} className="hidden" />
                            </label>
                        </div>

                        <button
                            onClick={() => setShowRules(true)}
                            className="jrpg-box p-4 text-white hover:bg-purple-800 font-pixel text-sm active:translate-y-1 transition-all"
                        >
                            {UI_TEXT[lang].howToPlay}
                        </button>

                        {/* AI Labs Removed */}

                        <button onClick={() => setLang(l => l === 'EN' ? 'ZH' : l === 'ZH' ? 'JP' : 'EN')} className="text-slate-500 hover:text-white font-pixel text-xs mt-4">
                            <Globe className="inline w-4 h-4" /> {lang}
                        </button>
                    </div>
                </div>

                {/* Training Monitor Panel removed */}
            </div>
        );
    }

    return (
        <div className={`h-screen bg-slate-950 text-slate-200 p-2 md:p-4 font-sans flex flex-col overflow-hidden relative `}>
            <EffectsLayer effects={effects} />
            <FloatingText texts={floatingTexts} />

            {/* Overlays */}
            {showSettings && (
                <SettingsModal
                    settings={settings}
                    onUpdate={setSettings}
                    onClose={() => setShowSettings(false)}
                    lang={lang}
                />
            )}

            {showStats && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="jrpg-box p-6 w-full max-w-2xl">
                        <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-2">
                            <h2 className="text-sm font-bold text-cyan-300 font-pixel flex items-center gap-2">
                                <BarChart size={18} /> {UI_TEXT[lang].stats}
                            </h2>
                            <button onClick={() => setShowStats(false)} className="text-white hover:text-red-400">
                                <X size={20} />
                            </button>
                        </div>
                        <EvolutionChart data={winRates} />
                    </div>
                </div>
            )}

            {/* AI Language Selection Modal */}
            {showAiLangSelect && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
                    <div className="jrpg-box p-6 w-full max-w-md text-center space-y-6 border-2 border-cyan-500 shadow-[0_0_20px_cyan]">
                        <h2 className="text-xl font-bold text-cyan-300 font-pixel">
                            {lang === 'ZH' ? '选择AI分析语言' : lang === 'JP' ? 'AI分析言語を選択' : 'SELECT AI OUTPUT LANGUAGE'}
                        </h2>
                        <p className="text-slate-400 text-sm font-pixel">
                            {lang === 'ZH' ? '请选择AI思考和分析结果的输出语言' : lang === 'JP' ? 'AIの思考と分析結果の出力言語を選択してください' : 'Choose the language for AI thoughts and analysis'}
                        </p>

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => {
                                    setAiLang('EN');
                                    setShowAiLangSelect(false);
                                    setIsAutoStarted(true);
                                    setIsPaused(false);
                                    audio.playSFX('CLICK');
                                }}
                                className="p-4 border-2 border-slate-600 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all font-pixel text-white flex items-center justify-center gap-3 group"
                            >
                                <span className="text-2xl">🇺🇸</span>
                                <span className="group-hover:text-cyan-300">ENGLISH</span>
                            </button>

                            <button
                                onClick={() => {
                                    setAiLang('ZH');
                                    setShowAiLangSelect(false);
                                    setIsAutoStarted(true);
                                    setIsPaused(false);
                                    audio.playSFX('CLICK');
                                }}
                                className="p-4 border-2 border-slate-600 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all font-pixel text-white flex items-center justify-center gap-3 group"
                            >
                                <span className="text-2xl">🇨🇳</span>
                                <span className="group-hover:text-cyan-300">中文 (Chinese)</span>
                            </button>

                            <button
                                onClick={() => {
                                    setAiLang('JP');
                                    setShowAiLangSelect(false);
                                    setIsAutoStarted(true);
                                    setIsPaused(false);
                                    audio.playSFX('CLICK');
                                }}
                                className="p-4 border-2 border-slate-600 hover:border-cyan-400 hover:bg-cyan-900/30 transition-all font-pixel text-white flex items-center justify-center gap-3 group"
                            >
                                <span className="text-2xl">🇯🇵</span>
                                <span className="group-hover:text-cyan-300">日本語 (Japanese)</span>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowAiLangSelect(false)}
                            className="mt-4 text-slate-500 hover:text-white text-xs font-pixel underline"
                        >
                            {UI_TEXT[lang].cancel}
                        </button>
                    </div>
                </div>
            )}


            {showStrategyAnalysis && (
                <StrategyAnalysisModal
                    battleStats={currentBattleStats}
                    analysisText={strategyAnalysisText}
                    strategyText={strategyText}
                    generation={generation}
                    isLoading={isAnalyzing}
                    lang={lang}
                    onClose={() => setShowStrategyAnalysis(false)}
                    onRegenerate={handleStrategyAnalysis}
                    onSaveStrategy={handleSaveStrategy}
                />
            )}

            {/* Header */}
            <header className="flex-none flex flex-col md:flex-row justify-between items-center mb-4 gap-4 pb-2 border-b-4 border-white">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tighter text-cyan-400 flex items-center gap-2 font-pixel">
                        <Brain className="w-6 h-6" />
                        ABYSSAL TACTICS
                    </h1>
                </div>

                <div className="flex gap-2 bg-slate-900 p-1 border-2 border-slate-700">
                    {(['MANUAL', 'AI_GEN0', 'AI_GEN5', 'EVOLUTION'] as GameMode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); resetGame(false); audio.playSFX('CLICK'); }}
                            className={`
                        px-3 py-1 text-[10px] md:text-xs font-bold font-pixel transition-all border-2
                        ${mode === m
                                    ? (m === 'EVOLUTION' ? 'bg-purple-900 border-white text-white shadow-[0_0_10px_purple]' : 'bg-cyan-900 border-white text-white shadow-[0_0_10px_cyan]')
                                    : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-white'}
                    `}
                        >
                            {m === 'EVOLUTION' ? UI_TEXT[lang].growth : m === 'MANUAL' ? UI_TEXT[lang].manual : m === 'AI_GEN0' ? UI_TEXT[lang].gen0 : UI_TEXT[lang].gen5}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => setShowStats(true)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400" title={UI_TEXT[lang].stats}>
                        <BarChart size={18} />
                    </button>
                    <button onClick={saveGame} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400" title={UI_TEXT[lang].save}>
                        <SaveIcon size={18} />
                    </button>
                    <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-cyan-400" title={UI_TEXT[lang].settings}>
                        <SettingsIcon size={18} />
                    </button>
                    <button onClick={() => setLang(l => l === 'EN' ? 'ZH' : l === 'ZH' ? 'JP' : 'EN')} className="p-2 hover:bg-slate-800 rounded font-pixel text-xs">
                        {lang}
                    </button>
                    <div className="bg-blue-900 px-3 py-1 font-pixel text-white border-2 border-white text-xs shadow-lg">
                        {UI_TEXT[lang].turn} {turn}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div id="battle-container" className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden relative">

                {/* Left Col: Battlefield */}
                {/* Left Col: Battlefield - Main Container with Background */}
                <div
                    className="lg:col-span-2 flex flex-col h-full overflow-hidden relative rounded-lg border-2 border-slate-700 shadow-2xl"
                    style={{
                        backgroundImage: `url('${ASSETS.backgrounds.battle}')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    {/* Dark Overlay for readability over background */}
                    <div className="absolute inset-0 bg-black/30 pointer-events-none z-0"></div>

                    {/* 1. Cinematic Boss Section (Top 45%) */}
                    <div className="flex-[0.45] relative w-full overflow-hidden group z-10">
                        {/* Boss Portrait */}
                        <div className="absolute inset-0 z-0 flex justify-center">
                            {boss.portrait ? (
                                <img
                                    src={boss.portrait}
                                    alt={boss.name[lang]}
                                    className="w-full h-full object-contain object-bottom animate-breathing filter drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <div className="text-6xl animate-breathing">👹</div>
                                </div>
                            )}
                        </div>

                        {/* Gradient Overlay (More subtle now) */}
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none"></div>

                        {/* Boss Info Overlay - Floating */}
                        <div className="absolute bottom-2 left-4 right-4 z-20 flex flex-col gap-1">
                            <div className="flex justify-between items-end text-shadow-sm">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-white font-pixel drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                        {boss.name[lang]}
                                    </h2>
                                    <div className="text-xs font-pixel text-red-200 mt-0.5 drop-shadow-md">
                                        STATUS: <span className="animate-pulse">{BOSS_SCRIPT[boss.patternIndex].name[lang]}</span>
                                    </div>
                                </div>
                                <div className="text-right font-pixel text-xl text-white drop-shadow-md">
                                    {boss.currentHp} <span className="text-xs text-slate-300">/ {boss.maxHp}</span>
                                </div>
                            </div>

                            {/* HP Bar */}
                            <div className="w-full h-3 bg-black/40 border border-slate-500/50 relative backdrop-blur-sm rounded-sm overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 shadow-[0_0_10px_red]"
                                    style={{ width: `${(boss.currentHp / boss.maxHp) * 100}%` }}
                                ></div>
                            </div>

                            {/* Intent Bar & Next Move */}
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 flex gap-1">
                                    {BOSS_SCRIPT.map((script, idx) => (
                                        <div
                                            key={idx}
                                            className={`h-1.5 flex-1 transition-all rounded-sm ${idx === boss.patternIndex ? 'bg-red-500 shadow-[0_0_5px_red]' : 'bg-slate-700/40'}`}
                                        />
                                    ))}
                                </div>
                                <div className="text-[10px] text-red-100 font-pixel bg-black/40 px-2 py-0.5 rounded border border-red-500/30 backdrop-blur-md">
                                    NEXT: {getBossSkillDescription(boss.patternIndex)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Heroes & Controls Section (Bottom 55%) - Transparent Background */}
                    <div className="flex-[0.55] relative z-20 p-4 overflow-y-auto border-t border-white/10 bg-gradient-to-b from-black/20 to-black/60">

                        <div className="relative z-10 space-y-4">
                            {/* Characters Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {characters.map(char => {
                                    const queuedAction = queuedActions.find(a => a.characterId === char.id);
                                    const isQueued = !!queuedAction;
                                    const isActive = selectionMode?.characterId === char.id;
                                    const isValidTarget = selectionMode && (
                                        (characters.find(c => c.id === selectionMode.characterId)?.skills.find(s => s.id === selectionMode.skillId)?.targetType === 'ALLY') ||
                                        (characters.find(c => c.id === selectionMode.characterId)?.skills.find(s => s.id === selectionMode.skillId)?.targetType === 'ALLY_EXCEPT_SELF' && char.id !== selectionMode.characterId)
                                    );

                                    return (
                                        <CharacterCard
                                            key={char.id}
                                            character={char}
                                            isActive={isActive}
                                            onAction={handleManualAction}
                                            onSelectTarget={handleTargetSelection}
                                            isSelectionMode={!!selectionMode}
                                            isValidTarget={!!isValidTarget}
                                            lang={lang}
                                            disabled={phase !== 'PLANNING' || isProcessingAI}
                                            isLocked={boss.targetId === char.id}
                                            pendingAP={pendingAP[char.id]}
                                            queuedSkillId={queuedAction?.skillId}
                                        />
                                    );
                                })}
                            </div>

                            {/* Action Bar - Semi-transparent */}
                            <div className="flex gap-4 items-center justify-between bg-slate-900/60 p-3 border border-slate-600/50 rounded backdrop-blur-md shadow-lg">
                                <div className="text-xs text-slate-400 font-pixel">
                                    {phase === 'PLANNING' ? (
                                        <span className="text-green-400 animate-pulse">
                                            {mode === 'MANUAL' ? UI_TEXT[lang].manual : UI_TEXT[lang].auto}
                                        </span>
                                    ) : (
                                        <span className="text-yellow-400">{UI_TEXT[lang].executing}</span>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    {mode !== 'MANUAL' && (
                                        <button
                                            onClick={() => { setShowStrategyAnalysis(true); audio.playSFX('CLICK'); }}
                                            className="px-3 py-2 bg-purple-900/80 hover:bg-purple-800 text-white font-pixel text-xs border border-purple-500 hover:border-purple-400 transition-all flex items-center gap-2 backdrop-blur-sm"
                                            title={UI_TEXT[lang].strategy}
                                        >
                                            <Brain size={14} />
                                            <span className="hidden md:inline">{UI_TEXT[lang].strategy}</span>
                                        </button>
                                    )}
                                    {mode === 'MANUAL' && phase === 'PLANNING' && (
                                        <>
                                            <button
                                                onClick={() => { resetGame(false); audio.playSFX('CLICK'); }}
                                                className="px-4 py-2 bg-slate-800 hover:bg-red-900 text-white font-pixel text-xs border border-slate-600 hover:border-red-500 transition-all flex items-center gap-2"
                                            >
                                                <RotateCcw size={14} /> {UI_TEXT[lang].reset}
                                            </button>

                                            <button
                                                onClick={submitTurn}
                                                disabled={queuedActions.length === 0 && turn === 1}
                                                className="px-6 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-pixel text-xs border-2 border-cyan-400 shadow-[0_0_10px_cyan] active:translate-y-1 transition-all flex items-center gap-2"
                                            >
                                                <Play size={14} /> {UI_TEXT[lang].executeTurn}
                                            </button>
                                        </>
                                    )}

                                    {mode !== 'MANUAL' && (
                                        <div className="flex items-center gap-3">
                                            {/* Start/Pause Button */}
                                            <button
                                                onClick={() => {
                                                    if (isAutoStarted) {
                                                        setIsPaused(!isPaused);
                                                    } else {
                                                        // First time start - show language selection
                                                        setShowAiLangSelect(true);
                                                    }
                                                    audio.playSFX('CLICK');
                                                }}
                                                className={`px-6 py-2 font-pixel text-xs border-2 transition-all flex items-center gap-2 ${isAutoStarted && !isPaused
                                                    ? 'bg-yellow-900 border-yellow-500 text-yellow-100 hover:bg-yellow-800'
                                                    : 'bg-green-700 border-green-400 text-white hover:bg-green-600 shadow-[0_0_10px_green]'
                                                    }`}
                                            >
                                                {isAutoStarted && !isPaused ? <Pause size={14} /> : <Play size={14} />}
                                                {isAutoStarted && !isPaused ? UI_TEXT[lang].pause || 'PAUSE' : UI_TEXT[lang].start}
                                            </button>

                                            {/* Auto/Manual Loop Toggle */}
                                            <button
                                                onClick={() => { setIsAutoLooping(!isAutoLooping); audio.playSFX('CLICK'); }}
                                                className={`px-4 py-2 font-pixel text-xs border-2 transition-all flex items-center gap-2 ${isAutoLooping
                                                    ? 'bg-orange-900 border-orange-500 text-orange-100 shadow-[0_0_10px_orange]'
                                                    : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700'
                                                    }`}
                                                title={isAutoLooping ? "自动循环模式" : "手动循环模式"}
                                            >
                                                <Zap size={14} className={isAutoLooping ? "fill-orange-400" : ""} />
                                                <span>{isAutoLooping ? "AUTO LOOP" : "MANUAL LOOP"}</span>
                                            </button>

                                            {/* Manual Next Battle Button - Only show when game is over and in manual loop mode */}
                                            {phase === 'GAME_OVER' && !isAutoLooping && (
                                                <button
                                                    onClick={() => {
                                                        downloadLogs();
                                                        if (mode === 'EVOLUTION') {
                                                            handleAutoEvolution();
                                                        } else {
                                                            resetGame(true);
                                                        }
                                                        audio.playSFX('CLICK');
                                                    }}
                                                    className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-pixel text-xs border-2 border-cyan-400 shadow-[0_0_10px_cyan] transition-all flex items-center gap-2"
                                                >
                                                    <Download size={14} />
                                                    <span>NEXT BATTLE</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div>
                    </div>
                </div>

                {/* Right Col: Logs */}
                <div className="space-y-4 flex flex-col h-full overflow-hidden">

                    {/* Note: EvolutionChart removed from here */}

                    <div className="jrpg-box flex-1 flex flex-col overflow-hidden min-h-0 bg-black">
                        <div className="p-2 border-b-2 border-white bg-blue-900 text-[10px] font-pixel font-bold text-white uppercase flex-none">
                            {UI_TEXT[lang].logs}
                        </div>
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 font-mono">
                            {logs.map((log, i) => (
                                <div key={i} className="text-xs border-b border-slate-900 pb-1 last:border-0">
                                    <div className="flex items-baseline gap-2 mb-0.5">
                                        <span className="text-[10px] bg-slate-800 px-1 text-slate-400">T{log.turn}</span>
                                        <span className={`font-bold ${log.source === 'BOSS' || log.source === UI_TEXT[lang].boss ? 'text-red-400' : 'text-cyan-400'}`}>
                                            {log.source}
                                        </span>
                                    </div>
                                    {log.type === 'THOUGHT' ? (
                                        <details className="group">
                                            <summary className="cursor-pointer text-[10px] text-purple-400 hover:text-purple-300 list-none flex items-center gap-1">
                                                <Activity size={10} /> LOGIC KERNEL
                                            </summary>
                                            <div className="pl-2 mt-1 text-[10px] text-purple-300/70 border-l border-purple-900 italic">
                                                "{log.message}"
                                            </div>
                                        </details>
                                    ) : (
                                        <div className={`
                                    ${log.type === 'CRITICAL' ? 'text-red-500 font-bold bg-red-900/20 p-1' :
                                                log.type === 'HEAL' ? 'text-green-400' :
                                                    log.type === 'DAMAGE' ? 'text-orange-300' : 'text-slate-300'}
                                `}>
                                            {log.message}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {phase === 'GAME_OVER' && (
                                <div className="text-center py-4 space-y-3">
                                    <div className="text-red-500 font-pixel text-lg animate-pulse">
                                        {characters.every(c => c.status.isDead) ? UI_TEXT[lang].loss : UI_TEXT[lang].win}
                                    </div>

                                    {/* Strategy Analysis Button */}
                                    <button
                                        onClick={handleStrategyAnalysis}
                                        className="w-full bg-purple-900 hover:bg-purple-800 border-2 border-purple-400 text-white font-pixel text-xs py-3 flex items-center justify-center gap-2 transition-all shadow-[0_0_10px_purple]"
                                    >
                                        <TrendingUp size={16} />
                                        查看策略分析 (Strategy Analysis)
                                    </button>

                                    {/* Manual Controls for Evolution Mode */}
                                    {mode === 'EVOLUTION' && !isAutoLooping && (
                                        <div className="space-y-2 mt-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={downloadLogs}
                                                    className="bg-slate-800 hover:bg-slate-700 border border-slate-500 text-white font-pixel text-xs py-3 flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Download size={14} /> Log
                                                </button>
                                                <button
                                                    onClick={() => { resetGame(true); audio.playSFX('CLICK'); }}
                                                    className="bg-cyan-900 hover:bg-cyan-800 border-2 border-cyan-400 text-white font-pixel text-xs py-3 flex items-center justify-center gap-2 shadow-[0_0_10px_cyan] transition-all"
                                                >
                                                    <RotateCcw size={14} /> Next Round
                                                </button>
                                            </div>
                                            {/* Research Data Export */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={exportBattleJSON}
                                                    className="bg-blue-900 hover:bg-blue-800 border border-blue-500 text-white font-pixel text-[10px] py-2 flex items-center justify-center gap-1 transition-all"
                                                    title="Export complete battle data as JSON"
                                                >
                                                    <Download size={12} /> JSON
                                                </button>
                                                <button
                                                    onClick={exportBattleCSV}
                                                    className="bg-green-900 hover:bg-green-800 border border-green-500 text-white font-pixel text-[10px] py-2 flex items-center justify-center gap-1 transition-all"
                                                    title="Export statistics as CSV"
                                                >
                                                    <Download size={12} /> CSV
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Auto Status */}
                                    {mode === 'EVOLUTION' && isAutoLooping && (
                                        <div className="text-orange-400 font-pixel text-xs animate-pulse mt-2 border border-orange-500/30 bg-orange-900/20 p-2 rounded flex items-center justify-center gap-2">
                                            {isPaused ? <Pause size={12} /> : <Zap size={12} />}
                                            {isPaused ? "AUTO LOOP PAUSED" : "AUTO EVOLUTION RUNNING..."}
                                        </div>
                                    )}

                                    {/* Standard Reset for Non-Evolution Modes */}
                                    {mode !== 'EVOLUTION' && (
                                        <button onClick={() => { resetGame(true); audio.playSFX('CLICK'); }} className="text-cyan-400 hover:text-cyan-300 underline font-pixel text-xs block w-full mt-4">
                                            {UI_TEXT[lang].reset}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Menu Button (Escape Hatch) */}
                    <button
                        onClick={() => { setPhase('MENU'); audio.stopBGM(); }}
                        className="text-[10px] text-slate-600 hover:text-slate-400 font-pixel flex items-center justify-center gap-1"
                    >
                        <LogOut size={10} /> MENU
                    </button>
                </div>

            </div>
        </div>
    );
};

export default App;

