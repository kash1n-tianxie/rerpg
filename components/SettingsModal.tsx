import React from 'react';
import { GameSettings, Language } from '../types';
import { UI_TEXT } from '../constants';
import { X, Save, Volume2 } from 'lucide-react';

interface Props {
  settings: GameSettings;
  onUpdate: (s: GameSettings) => void;
  onClose: () => void;
  lang: Language;
}

const SettingsModal: React.FC<Props> = ({ settings, onUpdate, onClose, lang }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="jrpg-box p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-2">
          <h2 className="text-sm font-bold text-cyan-300 font-pixel flex items-center gap-2">
            {UI_TEXT[lang].settings}
          </h2>
          <button onClick={onClose} className="text-white hover:text-red-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Audio Settings */}
          <div className="space-y-4 border-b border-dashed border-slate-500 pb-4">
             <div className="flex items-center gap-2 text-yellow-300 font-pixel text-xs">
                <Volume2 size={14} /> {UI_TEXT[lang].volume}
             </div>
             
             <div>
                <label className="flex justify-between text-[10px] font-pixel text-slate-300 mb-1">
                   {UI_TEXT[lang].bgm} <span className="text-white">{(settings.bgmVolume * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={settings.bgmVolume}
                  onChange={(e) => onUpdate({ ...settings, bgmVolume: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-none appearance-none cursor-pointer accent-cyan-500 border border-slate-600"
                />
             </div>

             <div>
                <label className="flex justify-between text-[10px] font-pixel text-slate-300 mb-1">
                   {UI_TEXT[lang].sfx} <span className="text-white">{(settings.sfxVolume * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range" min="0" max="1" step="0.1"
                  value={settings.sfxVolume}
                  onChange={(e) => onUpdate({ ...settings, sfxVolume: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-800 rounded-none appearance-none cursor-pointer accent-cyan-500 border border-slate-600"
                />
             </div>
          </div>

          {/* Boss Multiplier */}
          <div>
            <label className="flex justify-between text-[10px] font-pixel text-slate-300 mb-2">
              <span>{UI_TEXT[lang].bossDmg}</span>
              <span className="text-red-400 font-bold">x{settings.bossDamageMultiplier.toFixed(1)}</span>
            </label>
            <input
              type="range" min="0.5" max="3.0" step="0.1"
              value={settings.bossDamageMultiplier}
              onChange={(e) => onUpdate({ ...settings, bossDamageMultiplier: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-none appearance-none cursor-pointer accent-red-500 border border-slate-600"
            />
          </div>

          {/* Max HP */}
          <div>
            <label className="flex justify-between text-[10px] font-pixel text-slate-300 mb-2">
              <span>{UI_TEXT[lang].bossHp}</span>
              <span className="text-red-400 font-bold">{settings.bossMaxHp}</span>
            </label>
            <input
              type="range" min="1000" max="5000" step="100"
              value={settings.bossMaxHp}
              onChange={(e) => onUpdate({ ...settings, bossMaxHp: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-none appearance-none cursor-pointer accent-red-500 border border-slate-600"
            />
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onClose}
            className="w-full bg-blue-800 border-2 border-white hover:bg-blue-700 text-white font-pixel text-xs py-3 shadow-[4px_4px_0_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <Save size={14} /> OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
