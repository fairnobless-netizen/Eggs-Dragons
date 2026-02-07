import React, { useState, useEffect } from 'react';
import { GameEvents } from '../app/gameEvents';
import { ShopModal } from './ShopModal';
import { RampIndex } from '../app/config';

interface DeviceFrameProps {
  children: React.ReactNode; // The Phaser container goes here
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isShopOpen, setShopOpen] = useState(false);
  const [mode, setMode] = useState<'A' | 'B'>('A');

  useEffect(() => {
    const unsubScore = GameEvents.onScoreUpdate(setScore);
    const unsubLives = GameEvents.onLivesUpdate(setLives);
    return () => { unsubScore(); unsubLives(); };
  }, []);

  const handleInput = (lane: number) => {
    GameEvents.emitInput(lane);
    // Add simple haptic or sound trigger here if needed in React layer
  };

  const toggleMode = (newMode: 'A' | 'B') => {
    setMode(newMode);
    GameEvents.emitGameMode(newMode);
  };

  const btnClass = "active:scale-95 transition-transform bg-gradient-to-b from-red-500 to-red-700 w-16 h-16 rounded-full shadow-[0_4px_0_#7f1d1d] flex items-center justify-center border-2 border-red-900";
  const labelClass = "text-[10px] text-gray-600 font-bold uppercase tracking-widest text-center mt-1";

  return (
    <div className="w-full h-full bg-zinc-200 flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-hidden relative">
      
      {/* Handheld Casing */}
      <div className="relative w-full max-w-2xl bg-[#e0e0e0] rounded-3xl p-4 sm:p-8 shadow-2xl border-4 border-[#d4d4d4] flex flex-col gap-4">
        
        {/* Top Header: Logos & Mode Buttons */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold text-slate-800 italic tracking-tighter border-2 border-slate-800 px-2 inline-block">NINTENDO-LITE</h1>
            <div className="flex gap-2">
               <button onClick={() => setShopOpen(true)} className="px-2 py-1 bg-yellow-500 text-xs font-bold rounded shadow border border-yellow-700">SHOP 🛒</button>
            </div>
          </div>
          
          <div className="flex gap-3">
             <div className="flex flex-col items-center">
                <button 
                  onClick={() => toggleMode('A')} 
                  className={`w-8 h-8 rounded-full border-2 ${mode === 'A' ? 'bg-slate-800 border-slate-600' : 'bg-slate-300 border-slate-400'}`}
                />
                <span className="text-[10px] font-bold text-slate-600 mt-1">GAME A</span>
             </div>
             <div className="flex flex-col items-center">
                <button 
                  onClick={() => toggleMode('B')} 
                  className={`w-8 h-8 rounded-full border-2 ${mode === 'B' ? 'bg-slate-800 border-slate-600' : 'bg-slate-300 border-slate-400'}`}
                />
                <span className="text-[10px] font-bold text-slate-600 mt-1">GAME B</span>
             </div>
          </div>
        </div>

        {/* Main Display Area */}
        <div className="relative bg-[#9ea792] shadow-inner border-4 border-[#8b9380] rounded-lg p-4 flex-1 min-h-[300px] flex flex-col">
          
          {/* LCD Score/Lives Header */}
          <div className="flex justify-between items-end mb-2 font-mono text-[#2c3327] opacity-80 px-2 border-b-2 border-[#8b9380]/30 pb-1">
             <div className="text-sm">LIVES: {'♥'.repeat(lives)}</div>
             <div className="text-3xl font-bold tracking-widest">{score.toString().padStart(4, '0')}</div>
          </div>

          {/* Phaser Canvas Container */}
          <div className="flex-1 relative rounded overflow-hidden mix-blend-multiply opacity-90">
             {children}
          </div>
        </div>

        {/* Controls Section */}
        <div className="grid grid-cols-2 gap-8 mt-4">
           {/* Left Controls */}
           <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-2">
                 <button className={btnClass} onPointerDown={() => handleInput(RampIndex.LEFT_TOP)} />
                 <span className={labelClass}>Left<br/>Top</span>
              </div>
              <div className="flex items-center gap-2 ml-4">
                 <button className={btnClass} onPointerDown={() => handleInput(RampIndex.LEFT_BOT)} />
                 <span className={labelClass}>Left<br/>Bot</span>
              </div>
           </div>

           {/* Right Controls */}
           <div className="flex flex-col items-end gap-4">
              <div className="flex items-center gap-2 flex-row-reverse">
                 <button className={btnClass} onPointerDown={() => handleInput(RampIndex.RIGHT_TOP)} />
                 <span className={labelClass}>Right<br/>Top</span>
              </div>
              <div className="flex items-center gap-2 flex-row-reverse mr-4">
                 <button className={btnClass} onPointerDown={() => handleInput(RampIndex.RIGHT_BOT)} />
                 <span className={labelClass}>Right<br/>Bot</span>
              </div>
           </div>
        </div>

      </div>

      <ShopModal isOpen={isShopOpen} onClose={() => setShopOpen(false)} stars={100} />
    </div>
  );
};