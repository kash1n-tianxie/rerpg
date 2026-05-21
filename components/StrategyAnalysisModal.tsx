import React, { useState } from 'react';
import { BattleStatistics, Language } from '../types';
import { X, Brain, RefreshCw, Save, BarChart3 } from 'lucide-react';

interface StrategyAnalysisModalProps {
    battleStats: BattleStatistics | null;
    analysisText: string;
    strategyText: string;
    generation: number;
    isLoading: boolean;
    lang: Language;
    onClose: () => void;
    onRegenerate: () => void;
    onSaveStrategy: (newStrategy: string) => void;
}

const UI_TEXT = {
    EN: {
        title: 'Strategy Analysis',
        generation: 'Gen',
        battleOutcome: 'Battle Outcome',
        win: 'VICTORY',
        loss: 'DEFEAT',
        statistics: 'Battle Statistics',
        analysis: 'AI Analysis',
        currentStrategy: 'Current AI Strategy',
        regenerate: 'Regenerate Analysis',
        save: 'Save Strategy',
        loading: 'Analyzing...',
        damageDealt: 'DMG',
        healingDone: 'HEAL',
        damageTaken: 'TOOK',
        apSpent: 'AP',
        turns: 'Turns',
    },
    ZH: {
        title: '策略分析',
        generation: '世代',
        battleOutcome: '战斗结果',
        win: '胜利',
        loss: '失败',
        statistics: '战斗数据',
        analysis: 'AI 分析',
        currentStrategy: '当前 AI 策略',
        regenerate: '重新生成分析',
        save: '保存策略',
        loading: '分析中...',
        damageDealt: '伤害',
        healingDone: '治疗',
        damageTaken: '承伤',
        apSpent: 'AP',
        turns: '回合',
    },
    JP: {
        title: '戦略分析',
        generation: '世代',
        battleOutcome: '戦闘結果',
        win: '勝利',
        loss: '敗北',
        statistics: '戦闘統計',
        analysis: 'AI 分析',
        currentStrategy: '現在の AI 戦略',
        regenerate: '再生成',
        save: '保存',
        loading: '分析中...',
        damageDealt: 'ダメージ',
        healingDone: '回復',
        damageTaken: '被ダメ',
        apSpent: 'AP',
        turns: 'ターン',
    }
};

const StrategyAnalysisModal: React.FC<StrategyAnalysisModalProps> = ({
    battleStats,
    analysisText,
    strategyText,
    generation,
    isLoading,
    lang,
    onClose,
    onRegenerate,
    onSaveStrategy
}) => {
    const [editedStrategy, setEditedStrategy] = useState(strategyText);
    const t = UI_TEXT[lang];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="jrpg-box w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b-2 border-white bg-gradient-to-r from-purple-900 to-blue-900">
                    <h2 className="text-lg font-bold text-cyan-300 font-pixel flex items-center gap-2">
                        <Brain size={24} />
                        {t.title} - {t.generation} {generation}
                    </h2>
                    <button onClick={onClose} className="text-white hover:text-red-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Battle Outcome */}
                    {battleStats && (
                        <div className="space-y-4">
                            <div className={`text-center py-3 px-4 font-pixel text-xl border-2 ${battleStats.outcome === 'WIN'
                                    ? 'bg-green-900/50 border-green-400 text-green-300'
                                    : 'bg-red-900/50 border-red-400 text-red-300'
                                }`}>
                                {t.battleOutcome}: {battleStats.outcome === 'WIN' ? t.win : t.loss}
                            </div>

                            {/* Battle Statistics */}
                            <div>
                                <h3 className="text-sm font-bold text-cyan-400 font-pixel mb-3 flex items-center gap-2">
                                    <BarChart3 size={16} />
                                    {t.statistics}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {battleStats.characterStats.map(cs => (
                                        <div key={cs.characterId} className="bg-slate-800/50 border border-slate-600 p-4 rounded">
                                            <div className="font-pixel text-sm text-cyan-300 mb-2">{cs.characterName}</div>
                                            <div className="space-y-1 text-xs font-mono">
                                                <div className="flex justify-between">
                                                    <span className="text-orange-400">{t.damageDealt}:</span>
                                                    <span className="text-white font-bold">{cs.damageDealt}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-green-400">{t.healingDone}:</span>
                                                    <span className="text-white font-bold">{cs.healingDone}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-red-400">{t.damageTaken}:</span>
                                                    <span className="text-white font-bold">{cs.damageTaken}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-blue-400">{t.apSpent}:</span>
                                                    <span className="text-white font-bold">{cs.apSpent}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">{t.turns}:</span>
                                                    <span className="text-white font-bold">{cs.turnsSurvived}/{battleStats.totalTurns}</span>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-slate-700">
                                                    <div className="text-slate-400 text-[10px] mb-1">Skills:</div>
                                                    {Object.entries(cs.skillsUsed).map(([skillId, count]) => (
                                                        <div key={skillId} className="flex justify-between text-[10px]">
                                                            <span className="text-purple-400">{skillId}:</span>
                                                            <span className="text-white">{count}x</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Analysis */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-cyan-400 font-pixel flex items-center gap-2">
                                <Brain size={16} />
                                {t.analysis} (Gemini 2.5 Pro)
                            </h3>
                            <button
                                onClick={onRegenerate}
                                disabled={isLoading}
                                className="px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 text-white font-pixel text-xs border border-purple-400 disabled:border-slate-500 transition-all flex items-center gap-2"
                            >
                                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                                {isLoading ? t.loading : t.regenerate}
                            </button>
                        </div>
                        <div className="bg-black/50 border border-slate-600 p-4 rounded min-h-[200px] max-h-[300px] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-purple-400 font-pixel animate-pulse">{t.loading}</div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                                    {analysisText || '暂无分析数据。点击上方按钮生成分析。'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Strategy Editor */}
                    <div>
                        <h3 className="text-sm font-bold text-cyan-400 font-pixel mb-3">
                            {t.currentStrategy}
                        </h3>
                        <textarea
                            value={editedStrategy}
                            onChange={(e) => setEditedStrategy(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-slate-200 p-4 rounded font-mono text-xs min-h-[200px] focus:outline-none focus:border-cyan-400 transition-colors"
                            placeholder="在此编辑 AI 策略..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t-2 border-white bg-slate-900">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-pixel text-xs border border-slate-500 transition-all"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => onSaveStrategy(editedStrategy)}
                        className="px-6 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-pixel text-xs border-2 border-cyan-400 shadow-[0_0_10px_cyan] transition-all flex items-center gap-2"
                    >
                        <Save size={14} />
                        {t.save}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StrategyAnalysisModal;
