import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApiClient } from '../../net/apiClient';
import { StorageService } from '../../app/storage';
import { soundService } from '../../app/sound';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'nickname' | 'controls' | 'mechanics'>('nickname');
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  // START: nickname validation logic
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmed = username.trim();
      if (trimmed.length < 3) {
        setAvailable(null);
        if (trimmed.length > 0) setError("Min 3 characters");
        else setError("");
        return;
      }
      
      setChecking(true);
      setError("");
      try {
        const isFree = await ApiClient.checkUsernameAvailability(trimmed);
        setAvailable(isFree);
        if (!isFree) setError("Username taken");
      } catch (e) {
        setError("Error checking name");
      } finally {
        setChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

    const MAX_USERNAME_LEN = 20;

    const sanitizeUsername = (raw: string) => {
        // Allow any language/emoji. Remove control/invisible chars, normalize spaces, cap length.
        let v = raw;

        // Remove ASCII control chars + DEL + C1 controls
        v = v.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

        // Remove common “invisible formatting” chars (zero-width, bidi, BOM)
        v = v.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, '');

        // Normalize whitespace: collapse multiple spaces/tabs/newlines into single space
        v = v.replace(/\s+/g, ' ');

        // Do not auto-trim on the right (user may still type), but avoid leading spaces
        v = v.replace(/^\s+/, '');

        if (v.length > MAX_USERNAME_LEN) v = v.slice(0, MAX_USERNAME_LEN);
        return v;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(sanitizeUsername(e.target.value));
    };


  const handleNicknameConfirm = async () => {
    if (available && !checking) {
        soundService.playButtonClick();
        const trimmed = username.trim();
        const profile = StorageService.getProfile();
        
        // Register user via API
        await ApiClient.updateProfile(profile.userId, trimmed);
        
        // Update local storage (name only, not onboarded yet)
        StorageService.updateProfile({ username: trimmed });
        
        setStep('controls');
    }
  };

  const handleControlsNext = () => {
      soundService.playButtonClick();
      setStep('mechanics');
  };

  const handleFinalStart = () => {
      soundService.playButtonClick();
      // Finalize onboarding
      StorageService.updateProfile({ isOnboarded: true });
      onComplete();
  };

  const getBorderColor = () => {
      if (step === 'controls') return 'border-blue-500';
      if (step === 'mechanics') return 'border-green-500';
      return 'border-yellow-500';
  };

  const getInputClass = () => {
      const base = "w-full bg-slate-900 border rounded-lg py-3 px-4 text-white text-lg font-bold text-center outline-none transition-colors pr-10";
      if (checking) return `${base} border-yellow-500`;
      if (available === true) return `${base} border-green-500`;
      if (available === false || error) return `${base} border-red-500`;
      return `${base} border-slate-600 focus:border-yellow-500`;
  };

  const renderContent = () => {
      if (step === 'nickname') {
          return (
            <>
                <h2 className="text-2xl font-bold text-yellow-500 mb-2 uppercase">Welcome!</h2>
                <p className="text-gray-400 mb-6 text-sm">Enter your dragon keeper name</p>
                
                <div className="relative mb-6">
                  <input 
                    value={username}
                    onChange={handleChange}
                    className={getInputClass()}
                    placeholder="Username"
                    maxLength={20} 
                  />
                  {checking && <div className="absolute right-3 top-3.5 animate-spin h-5 w-5 border-2 border-yellow-500 border-t-transparent rounded-full"></div>}
                  {!checking && available === true && <div className="absolute right-3 top-3 text-green-500 text-xl font-bold">✓</div>}
                  {!checking && available === false && <div className="absolute right-3 top-3 text-red-500 text-xl font-bold">✕</div>}
                </div>

                {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}

                <button 
                  onClick={handleNicknameConfirm}
                  disabled={!available || checking}
                  className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all
                    ${available && !checking ? 'bg-yellow-500 text-black shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}
                  `}
                >
                  NEXT
                </button>
            </>
          );
      }

      if (step === 'controls') {
          return (
              <>
                <h2 className="text-2xl font-bold text-blue-400 mb-4 uppercase">CONTROLS</h2>
                
                <div className="flex flex-col gap-4 mb-6">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                        <div className="grid grid-cols-2 gap-1 w-16 h-16 shrink-0 bg-slate-800 p-1 rounded-lg">
                            <div className="bg-red-500 rounded-tl-md opacity-30"></div>
                            <div className="bg-red-500 rounded-tr-md animate-pulse"></div>
                            <div className="bg-red-500 rounded-bl-md opacity-30"></div>
                            <div className="bg-red-500 rounded-br-md opacity-30"></div>
                        </div>
                        <div className="text-left text-sm text-gray-300">
                            <strong className="text-white block mb-1 text-base">Tap Corners</strong>
                            Touch any of the 4 corners to move the Dragon to that lane.
                        </div>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 flex items-center gap-4">
                        <div className="w-16 h-16 flex items-center justify-center text-4xl bg-slate-800 rounded-lg">⌨️</div>
                        <div className="text-left text-sm text-gray-300">
                            <strong className="text-white block mb-1 text-base">Keyboard</strong>
                            Use Arrow Keys (Left/Right) to switch lanes.
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleControlsNext}
                    className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider bg-blue-500 text-white shadow-[0_4px_0_#1e40af] active:translate-y-1 active:shadow-none transition-all"
                >
                    GOT IT
                </button>
              </>
          );
      }

      if (step === 'mechanics') {
          return (
              <>
                <h2 className="text-2xl font-bold text-green-400 mb-4 uppercase">GOAL</h2>
                
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between bg-slate-900 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-12 bg-white rounded-[50%/60%_60%_40%_40%] shadow-[inset_-2px_-4px_6px_rgba(0,0,0,0.2)]"></div>
                            <div className="text-left">
                                <div className="font-bold text-white">Eggs</div>
                                <div className="text-xs text-gray-400">Catch them all</div>
                            </div>
                        </div>
                        <span className="text-green-400 font-bold text-xl">+Score</span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-900 p-4 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-800 rounded-full border-2 border-gray-600 relative flex items-center justify-center">
                                <span className="text-red-500 text-lg">💣</span>
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white">Bombs</div>
                                <div className="text-xs text-gray-400">Avoid them</div>
                            </div>
                        </div>
                        <span className="text-red-400 font-bold text-xl">-1 Life</span>
                    </div>

                    <div className="text-xs text-center text-gray-500 mt-2 italic">
                        Tip: Use power-ups like ❄️ Freeze and 🛡️ Shield from the store!
                    </div>
                </div>

                <button 
                    onClick={handleFinalStart}
                    className="w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider bg-green-500 text-black shadow-[0_4px_0_#15803d] active:translate-y-1 active:shadow-none transition-all"
                >
                    PLAY NOW
                </button>
              </>
          );
      }
  };

  return createPortal(
    <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/90 backdrop-blur">
      <div className={`bg-slate-800 p-6 rounded-2xl border-2 ${getBorderColor()} w-[90vw] max-w-sm text-center shadow-2xl transition-colors duration-300`}>
        {renderContent()}
      </div>
    </div>,
    document.body
  );
};