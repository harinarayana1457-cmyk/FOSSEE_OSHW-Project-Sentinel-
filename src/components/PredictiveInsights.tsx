/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PredictiveInsight } from '../services/geminiService';
import { TrendingUp, TrendingDown, Minus, Brain, Target, Lightbulb } from 'lucide-react';

interface PredictiveInsightsProps {
  insight: PredictiveInsight | null;
  loading: boolean;
  isDarkMode?: boolean;
}

export default function PredictiveInsights({ insight, loading, isDarkMode }: PredictiveInsightsProps) {
  if (loading) {
    return (
      <div className={`rounded-2xl p-6 shadow-sm border animate-pulse transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
        <div className={`h-4 rounded w-1/3 mb-4 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}></div>
        <div className={`h-20 rounded mb-4 ${isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-50'}`}></div>
        <div className={`h-4 rounded w-1/2 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}></div>
      </div>
    );
  }

  if (!insight) return null;

  const getTrendIcon = () => {
    switch (insight.trend) {
      case 'INCREASING': return <TrendingUp className="w-5 h-5 text-rose-600" />;
      case 'DECREASING': return <TrendingDown className="w-5 h-5 text-emerald-600" />;
      default: return <Minus className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getTrendColor = () => {
    switch (insight.trend) {
      case 'INCREASING': return 'text-rose-600 bg-rose-50';
      case 'DECREASING': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-zinc-600 bg-zinc-50';
    }
  };

  const renderTrendVisual = () => {
    const isIncreasing = insight.trend === 'INCREASING';
    const isDecreasing = insight.trend === 'DECREASING';
    const color = isIncreasing ? '#e11d48' : isDecreasing ? '#10b981' : '#71717a';
    
    return (
      <div className={`h-16 w-full rounded-xl overflow-hidden relative border mb-6 transition-colors ${isDarkMode ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-100'}`}>
        <svg className="w-full h-full" preserveAspectRatio="none">
          <path
            d={isIncreasing 
              ? "M 0 50 Q 200 45, 400 30 T 800 10" 
              : isDecreasing 
                ? "M 0 10 Q 200 15, 400 30 T 800 50"
                : "M 0 30 L 800 30"}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-40"
          />
          <path
            d={isIncreasing 
              ? "M 0 50 Q 200 45, 400 30 T 800 10" 
              : isDecreasing 
                ? "M 0 10 Q 200 15, 400 30 T 800 50"
                : "M 0 30 L 800 30"}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="800"
            strokeDashoffset="800"
            style={{ animation: 'drawPath 2s ease-out forwards' }}
          />
        </svg>
        <style>{`
          @keyframes drawPath {
            to { stroke-dashoffset: 0; }
          }
        `}</style>
      </div>
    );
  };

  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-colors ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>Predictive Analysis</h3>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{insight.trend} Trend</span>
        </div>
      </div>

      {renderTrendVisual()}

      <div className="space-y-6">
        <div className="flex gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl h-fit">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">AI Prediction</h4>
            <p className={`text-sm leading-relaxed transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>{insight.prediction}</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl h-fit">
            <Lightbulb className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Strategic Recommendation</h4>
            <p className={`text-sm leading-relaxed transition-colors ${isDarkMode ? 'text-zinc-400' : 'text-zinc-700'}`}>{insight.recommendation}</p>
          </div>
        </div>

        <div className={`pt-4 border-t transition-colors ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Confidence Level</span>
            <span className={`font-bold transition-colors ${isDarkMode ? 'text-zinc-200' : 'text-zinc-900'}`}>{(insight.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden transition-colors ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
            <div 
              className="h-full bg-indigo-600 transition-all duration-1000" 
              style={{ width: `${insight.confidence * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
