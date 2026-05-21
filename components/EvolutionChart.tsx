import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { WinRateData } from '../types';

interface Props {
  data: WinRateData[];
}

const EvolutionChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-48 bg-slate-900/50 rounded-lg p-2 border border-slate-700 backdrop-blur-sm">
      <h3 className="text-xs font-mono text-cyan-400 mb-2 uppercase tracking-widest">Tactical Evolution Rate</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="generation" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `Gen ${val}`} />
          <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#475569', color: '#f1f5f9' }}
            itemStyle={{ color: '#22d3ee' }}
          />
          <Line 
            type="monotone" 
            dataKey="winRate" 
            stroke="#22d3ee" 
            strokeWidth={2} 
            dot={{ r: 4, fill: '#22d3ee' }} 
            activeDot={{ r: 6 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EvolutionChart;