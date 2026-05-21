import React from 'react';
import { VisualEffect } from '../types';

interface Props {
  effects: VisualEffect[];
}

const EffectsLayer: React.FC<Props> = ({ effects }) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {effects.map((fx) => {
        // Get positions
        const startEl = document.getElementById(fx.sourceId);
        const endEl = document.getElementById(fx.targetId);

        if (!startEl || !endEl) return null;

        const startRect = startEl.getBoundingClientRect();
        const endRect = endEl.getBoundingClientRect();
        const containerRect = document.getElementById('battle-container')?.getBoundingClientRect() || { left: 0, top: 0 };

        const x1 = startRect.left + startRect.width / 2 - containerRect.left;
        const y1 = startRect.top + startRect.height / 2 - containerRect.top;
        const x2 = endRect.left + endRect.width / 2 - containerRect.left;
        const y2 = endRect.top + endRect.height / 2 - containerRect.top;

        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        return (
          <div
            key={fx.id}
            className="absolute flex items-center justify-center text-2xl font-bold"
            style={{
              left: x1,
              top: y1,
              width: 32,
              height: 32,
              transform: `translate(-50%, -50%)`,
              animation: `projectile ${fx.duration}ms linear forwards`,
              '--target-x': `${x2 - x1}px`,
              '--target-y': `${y2 - y1}px`,
            } as React.CSSProperties}
          >
            <div 
               className={`w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_15px_currentColor]`}
               style={{ color: fx.color, backgroundColor: `${fx.color}44`, border: `2px solid ${fx.color}` }}
            >
                {fx.icon || '•'}
            </div>
            
            <style>{`
              @keyframes projectile {
                0% { transform: translate(-50%, -50%) rotate(${angle}deg); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translate(calc(-50% + var(--target-x)), calc(-50% + var(--target-y))) rotate(${angle}deg); opacity: 0; }
              }
            `}</style>
          </div>
        );
      })}
    </div>
  );
};

export default EffectsLayer;
