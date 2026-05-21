
import React from 'react';
import { Character, Language } from '../types';
import { Shield, Target, Crosshair } from 'lucide-react';
import { UI_TEXT } from '../constants';

interface Props {
    character: Character;
    isActive: boolean;
    onAction: (charId: string, skillId: string) => void;
    onSelectTarget?: (targetId: string) => void;
    isSelectionMode?: boolean;
    isValidTarget?: boolean;
    lang: Language;
    disabled: boolean;
    isLocked?: boolean;
    pendingAP?: number;
    queuedSkillId?: string;
}

const CharacterCard: React.FC<Props> = ({
    character,
    isActive,
    onAction,
    onSelectTarget,
    isSelectionMode,
    isValidTarget,
    lang,
    disabled,
    isLocked,
    pendingAP,
    queuedSkillId
}) => {
    const hpPercent = (character.currentHp / character.maxHp) * 100;

    // Is this card currently taking damage? (We could check logs or pass a prop, 
    // but for now let's rely on simple red flash if HP is low or just general style)
    const isCritical = character.currentHp < character.maxHp * 0.3;

    const handleCardClick = () => {
        if (isSelectionMode && isValidTarget && onSelectTarget && !character.status.isDead) {
            onSelectTarget(character.id);
        }
    };

    return (
        <div
            id={character.id} // Important for EffectsLayer
            onClick={handleCardClick}
            className={`
                relative overflow-hidden transition-all duration-300 rounded-lg border-2 h-full min-h-[400px]
                ${character.status.isDead
                    ? 'grayscale opacity-60 border-slate-600'
                    : isSelectionMode && isValidTarget
                        ? 'cursor-pointer animate-pulse ring-4 ring-green-400 border-green-400'
                        : isActive
                            ? 'shadow-[0_0_20px_cyan] border-cyan-400'
                            : isLocked
                                ? 'shadow-[0_0_20px_red] border-red-500'
                                : 'border-white hover:border-cyan-300'}
            `}
        >
            {/* Portrait Background - Full Card */}
            {character.portrait ? (
                <div className="absolute inset-0 z-0">
                    <img
                        src={character.portrait}
                        alt={character.name}
                        className="w-full h-full object-cover"
                    />
                    {/* Dark overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70"></div>
                </div>
            ) : (
                <div className="absolute inset-0 z-0 bg-slate-900/80 flex items-center justify-center">
                    <span className="text-8xl filter drop-shadow-md" role="img" aria-label="avatar">{character.avatar}</span>
                </div>
            )}

            {/* Locked Overlay */}
            {isLocked && !character.status.isDead && (
                <div className="absolute top-2 right-2 z-30 flex items-center justify-center animate-[ping_1s_infinite]">
                    <div className="bg-red-600 p-2 rounded-full border-4 border-black text-white">
                        <Crosshair size={24} />
                    </div>
                </div>
            )}

            {/* Target Overlay (Player Selection) */}
            {isSelectionMode && isValidTarget && !character.status.isDead && (
                <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none bg-green-500/20">
                    <div className="p-2 rounded border-2 border-green-400 text-green-400 font-bold flex flex-col items-center bg-black/60">
                        <Target size={32} />
                        <span className="text-[10px] px-2 py-1 mt-1 font-pixel">SELECT</span>
                    </div>
                </div>
            )}

            {/* Top Info Panel - Character Name & HP */}
            <div className="absolute top-0 left-0 right-0 z-10 p-3 bg-gradient-to-b from-black/80 to-transparent">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="font-bold text-white text-sm md:text-base font-pixel leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            {character.name}
                        </div>
                        <div className="text-[10px] text-cyan-300 font-pixel mt-0.5 drop-shadow-md">{character.role}</div>
                    </div>
                    <div className="flex items-center gap-1">
                        {isLocked && (
                            <div className="text-[10px] bg-red-600 text-white px-2 py-1 font-pixel border border-white animate-pulse">
                                {UI_TEXT[lang].locked}
                            </div>
                        )}
                        {character.status.taunt && (
                            <div className="flex items-center text-yellow-300 text-[10px] px-2 border border-yellow-300 bg-yellow-900/80 rounded font-pixel">
                                TAUNT
                            </div>
                        )}
                    </div>
                </div>

                {/* HP Bar */}
                <div>
                    <div className="flex justify-between text-[10px] mb-1 font-pixel">
                        <span className="text-slate-300 drop-shadow-md">HP</span>
                        <div className="flex items-center gap-1">
                            <span className={`drop-shadow-md ${isCritical ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                                {character.currentHp}/{character.maxHp}
                            </span>
                            {character.status.shield > 0 && (
                                <span className="text-yellow-400 flex items-center gap-0.5 text-[10px] drop-shadow-md">
                                    <Shield size={10} className="fill-yellow-400" />
                                    (+{character.status.shield})
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="h-3 w-full bg-black/60 border border-white/30 relative backdrop-blur-sm">
                        <div
                            className={`h-full transition-all duration-500 ${isCritical ? 'bg-red-600' : 'bg-green-600'}`}
                            style={{ width: `${hpPercent}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Right - Skills & AP */}
            <div className={`absolute bottom-2 right-2 z-10 flex flex-col items-end gap-2 ${isSelectionMode ? 'opacity-30 pointer-events-none' : ''}`}>
                {/* AP Pips */}
                <div className="flex items-center gap-2 bg-black/70 px-2 py-1 rounded border border-white/30 backdrop-blur-sm">
                    <span className="text-[10px] text-slate-300 font-pixel">AP</span>
                    <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => {
                            const currentAP = pendingAP !== undefined ? pendingAP : character.ap;
                            const isSpent = i >= currentAP;
                            return (
                                <div
                                    key={i}
                                    className={`w-2.5 h-2.5 border border-black transform rotate-45 transition-all ${isSpent ? 'bg-slate-800' : 'bg-cyan-400 shadow-[0_0_5px_cyan]'
                                        } ${pendingAP !== undefined && isSpent ? 'opacity-50' : ''}`}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Compact Skill Buttons */}
                {!character.status.isDead && character.skills.map((skill) => {
                    const canAfford = character.ap >= skill.apCost;
                    const isPassive = skill.effectType === 'PASSIVE';

                    if (isPassive) {
                        return (
                            <div key={skill.id} className="group relative">
                                <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-pixel border border-slate-600 bg-slate-900/80 text-slate-500 cursor-help backdrop-blur-sm">
                                    <span>{skill.name[lang]}</span>
                                    <span className="px-1 bg-slate-800 text-slate-400 text-[8px]">PASS</span>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={skill.id} className="group relative">
                            <button
                                onClick={() => onAction(character.id, skill.id)}
                                disabled={!canAfford && !disabled}
                                className={`
                                    flex items-center gap-2 px-2 py-1.5 text-[10px] font-pixel border-2 transition-all shadow-lg backdrop-blur-sm
                                    ${queuedSkillId === skill.id
                                        ? 'border-yellow-400 bg-yellow-600/90 text-white shadow-[0_0_15px_gold]'
                                        : canAfford && !disabled
                                            ? 'border-white bg-blue-800/90 hover:bg-blue-700/90 text-white cursor-pointer active:scale-95'
                                            : 'border-slate-700 bg-slate-900/80 text-slate-600 cursor-not-allowed'}
                                `}
                            >
                                <span className="whitespace-nowrap">{skill.name[lang]}</span>
                                <span className={`text-[9px] ${queuedSkillId === skill.id ? 'text-yellow-200' : canAfford ? 'text-cyan-300' : 'text-slate-600'}`}>
                                    {skill.apCost}AP
                                </span>
                            </button>
                            {/* Tooltip */}
                            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                                <div className="bg-blue-900/95 border-2 border-white text-[10px] p-2 text-white font-pixel shadow-xl backdrop-blur-sm">
                                    {skill.description[lang]}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CharacterCard;
