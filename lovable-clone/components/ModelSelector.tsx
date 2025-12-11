
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, Sparkles, Zap } from 'lucide-react';

interface ModelSelectorProps {
  isOpen: boolean;
  onSelect: (model: 'minimax' | 'openrouter') => void;
}

export function ModelSelector({ isOpen, onSelect }: ModelSelectorProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-2">Select AI Model</h2>
            <p className="text-white/60 mb-6 text-sm">Choose the model that will power your generation.</p>

            <div className="space-y-3">
              <button
                onClick={() => onSelect('minimax')}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 hover:border-blue-500/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">MiniMax M2</div>
                    <div className="text-white/40 text-xs">Recommended for reasoning</div>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border border-white/20 group-hover:border-white/40 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                </div>
              </button>

              <button
                onClick={() => onSelect('openrouter')}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center text-orange-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-medium">OpenRouter</div>
                    <div className="text-white/40 text-xs">Standard generation</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
