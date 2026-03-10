import React from 'react';
import { HomeRemedy } from '../services/geminiService';
import { ShieldCheck, AlertTriangle, Stethoscope, Sparkles, Info } from 'lucide-react';

interface HomeRemediesProps {
  remedies: HomeRemedy[];
  loading: boolean;
  isDarkMode?: boolean;
}

export default function HomeRemedies({ remedies, loading, isDarkMode }: HomeRemediesProps) {
  return (
    <div className={`rounded-2xl p-6 shadow-sm border transition-colors h-full flex flex-col ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <h3 className={`text-lg font-semibold transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>AI Home Remedies</h3>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className={`w-3 h-3 border-2 rounded-full animate-spin ${isDarkMode ? 'border-zinc-700 border-t-zinc-500' : 'border-zinc-200 border-t-zinc-400'}`}></div>
            <span>Generating...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {remedies.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400 text-center">
            <Info className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">No specific remedies found for current records.</p>
            <p className="text-xs mt-1">Add health records to get personalized care suggestions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remedies.map((item, index) => (
              <div 
                key={index}
                className={`p-5 rounded-2xl border flex flex-col transition-all ${
                  isDarkMode ? 'bg-zinc-800/30 border-zinc-800' : 'bg-zinc-50/50 border-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
                    {item.disease}
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <h4 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Home Remedies</h4>
                    </div>
                    <ul className="space-y-1.5">
                      {item.remedies.map((remedy, i) => (
                        <li key={i} className={`text-sm flex items-start gap-2 ${isDarkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                          {remedy}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Precautions</h4>
                      </div>
                      <ul className="space-y-1">
                        {item.precautions.map((precaution, i) => (
                          <li key={i} className={`text-xs ${isDarkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            • {precaution}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Stethoscope className="w-4 h-4 text-rose-500" />
                        <h4 className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>Medical Warning</h4>
                      </div>
                      <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-rose-400/80' : 'text-rose-600/80'}`}>
                        {item.whenToSeeDoctor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-tight">
          <strong>Disclaimer:</strong> These are AI-generated suggestions for informational purposes only. Always consult a qualified healthcare professional before starting any treatment.
        </p>
      </div>
    </div>
  );
}
