
import React from 'react';
import { Language } from '../types';
import { UI_TEXT } from '../constants';
import { Brain, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

interface Props {
  isLoading: boolean;
  lesson: string;
  onNextGen: () => void;
  lang: Language;
  isAutoMode: boolean;
}

const ReflexionModal: React.FC<Props> = ({ isLoading, lesson, onNextGen, lang, isAutoMode }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border-2 border-purple-500/50 rounded-2xl p-8 w-full max-w-lg shadow-[0_0_50px_rgba(168,85,247,0.2)]">
        
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className={`p-4 rounded-full bg-purple-900/30 border border-purple-500 text-purple-400 ${isLoading ? 'animate-pulse' : ''}`}>
              <Brain size={48} />
            </div>
            {isLoading && (
              <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-700">
                <Loader2 size={16} className="animate-spin text-purple-400" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isLoading ? UI_TEXT[lang].analyzing : UI_TEXT[lang].lesson}
          </h2>

          {isLoading ? (
            <div className="space-y-2 w-full">
              <div className="h-2 bg-slate-800 rounded-full w-full overflow-hidden">
                <div className="h-full bg-purple-500 animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '50%' }}></div>
              </div>
              <p className="text-xs text-slate-500 font-mono">Reading Battle Logs... Detecting Patterns...</p>
            </div>
          ) : (
            <div className="w-full bg-slate-950 p-4 rounded-lg border border-purple-500/30 text-left">
              <div className="text-[10px] text-purple-400 font-mono mb-2 uppercase tracking-widest">Tactical Update</div>
              <p className="text-slate-200 font-mono text-sm leading-relaxed typing-effect">
                {lesson}
              </p>
            </div>
          )}

          {!isLoading && (
            <div className="w-full">
                {isAutoMode ? (
                     <div className="w-full bg-purple-900/20 border border-purple-500/30 text-purple-300 py-3 rounded-xl flex items-center justify-center gap-3 animate-pulse">
                         <RefreshCw size={18} className="animate-spin" />
                         <span className="font-mono text-sm">Auto-Evolving Strategy...</span>
                     </div>
                ) : (
                    <button
                    onClick={onNextGen}
                    className="w-full group bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all hover:scale-105"
                    >
                    <span>{UI_TEXT[lang].nextGen}</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReflexionModal;
