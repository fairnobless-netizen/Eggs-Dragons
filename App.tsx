import React, { useState, useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { launchGame } from './src/game/Game';
import { DeviceShell } from './src/ui/DeviceShell';
import { FullOverlay } from './src/ui/FullOverlay';
// P0: Fix import casing to match file system (Overlays vs overlays)
import { StoreModal } from './src/ui/Overlays/StoreModal';
import { RankingModal } from './src/ui/Overlays/RankingModal';
import { SettingsModal } from './src/ui/Overlays/SettingsModal';
import { MultiplayerModal } from './src/ui/Overlays/MultiplayerModal';
import { OnboardingModal } from './src/ui/Overlays/OnboardingModal';
import { gameBridge } from './src/app/gameBridge';
import { StorageService } from './src/app/storage';
import { TelegramService } from './src/app/telegram';

const App: React.FC = () => {
  const [isFull, setIsFull] = useState(false);
  const [overlay, setOverlay] = useState<string | null>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  // START: loading screen placeholder (5s)
  const [isLoading, setIsLoading] = useState(true);

  const gameRef = useRef<Phaser.Game | null>(null);
  const sharedMountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // P1: Initialize Telegram WebApp on mount
    TelegramService.init();

    // Check onboarding status
    const profile = StorageService.getProfile();
    setIsOnboarded(profile.isOnboarded);
    
    // START: loading timer
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sharedMountRef.current) {
      const mount = document.createElement('div');
      mount.id = 'game-shared-mount';
      mount.style.width = '100%';
      mount.style.height = '100%';
      sharedMountRef.current = mount;
      
      gameRef.current = launchGame(mount);
    }
    
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Shared handler for opening settings
  const handleOpenSettings = () => {
    setOverlay('settings');
    gameBridge.togglePause(true);
  };

  useEffect(() => {
    // TASK D1: Open overlays trigger pause
    gameBridge.on('OPEN_STORE', () => { setOverlay('store'); gameBridge.togglePause(true); });
    gameBridge.on('OPEN_RANKING', () => { setOverlay('ranking'); gameBridge.togglePause(true); });
    gameBridge.on('OPEN_SETTINGS', handleOpenSettings);
    // MP: Listener for multiplayer modal
    gameBridge.on('OPEN_MULTIPLAYER', () => { setOverlay('multiplayer'); gameBridge.togglePause(true); });
  }, []);

  // Fix: Reparent game canvas when mode changes OR when onboarding completes (DeviceShell mounts)
  // P0: Added `isLoading` to dependency array to ensure canvas attaches when loading screen vanishes
  useEffect(() => {
    const targetId = isFull ? 'full-mount-parent' : 'shell-mount-parent';
    const target = document.getElementById(targetId);
    
    if (target && sharedMountRef.current) {
      // Only append if not already there to avoid unnecessary moves
      if (sharedMountRef.current.parentElement !== target) {
        target.appendChild(sharedMountRef.current);
      }
      
      // Fix: Use requestAnimationFrame for reliable layout refresh after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (gameRef.current) {
            gameRef.current.scale.refresh();
          }
        });
      });
    }
  }, [isFull, isOnboarded, isLoading]);

    const requestTelegramFullscreenBestEffort = () => {
        try {
            const w: any = window as any;

            // Native Telegram WebApp API (if available)
            if (w.Telegram?.WebApp) {
                if (typeof w.Telegram.WebApp.requestFullscreen === 'function') {
                    w.Telegram.WebApp.requestFullscreen();
                }
                if (typeof w.Telegram.WebApp.expand === 'function') {
                    w.Telegram.WebApp.expand();
                }
            }

            // Webview proxy fallback
            if (w.TelegramWebviewProxy?.postEvent) {
                try { w.TelegramWebviewProxy.postEvent('web_app_request_fullscreen', '{}'); } catch { }
                try { w.TelegramWebviewProxy.postEvent('web_app_expand', '{}'); } catch { }
            }
        } catch {
            // no-op
        }
    };

    const enterFullView = () => {
        // 1) Ask Telegram to hide the top chrome (best effort)
        requestTelegramFullscreenBestEffort();

        // 2) Switch our UI to full view
        setIsFull(true);

        // 3) Notify Phaser/UI bridge
        gameBridge.setFullscreen(true);

        // 4) Small stability pause (same idea as toggleFull)
        gameBridge.togglePause(true);
        setTimeout(() => gameBridge.togglePause(false), 300);
    };

    const toggleFull = () => {
        const newState = !isFull;
        setIsFull(newState);

        // TASK M-10: Notify Phaser about fullscreen change to adjust layouts
        gameBridge.setFullscreen(newState);

        // If user enters full view manually — also ask Telegram fullscreen (best effort)
        if (newState) requestTelegramFullscreenBestEffort();

        // TASK D1: Toggling fullscreen also briefly pauses for stability
        gameBridge.togglePause(true);
        setTimeout(() => gameBridge.togglePause(false), 300);

        // Keep expand as a safe fallback
        if ((window as any).Telegram?.WebApp) {
            (window as any).Telegram.WebApp.expand();
        }
    };


  const handleCloseOverlay = () => {
    setOverlay(null);
    gameBridge.togglePause(false); // TASK D1: Close resumes
  };
  
    const handleStartGame = () => {
        const handleOnboardingComplete = () => {
            setIsOnboarded(true);

            // После подтверждения онбординга — сразу включаем full view mod
            enterFullView();
        };

      setHasStarted(true);
      gameBridge.startGame();
  };

  // START: Render loading placeholder
  if (isLoading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
        <h1 style={{ fontSize: '24px', fontFamily: 'monospace', animation: 'pulse 1.5s infinite' }}>Loading...</h1>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', overflow: 'hidden' }}>
      
      {/* START: nickname screen condition */}
          {!isOnboarded && (
              <OnboardingModal onComplete={handleOnboardingComplete} />
          )}


      {/* START: lobby screen (DeviceShell) condition */}
      {isOnboarded && !isFull && (
        <DeviceShell isFull={isFull} toggleFull={toggleFull} hasStarted={hasStarted} onStart={handleStartGame}>
          <div id="shell-mount-parent" style={{ width: '100%', height: '100%', position: 'relative' }} />
        </DeviceShell>
      )}

      {isOnboarded && isFull && (
        <div className="full-screen-wrapper">
          <div id="full-mount-parent" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
          <FullOverlay isFull={isFull} toggleFull={toggleFull} onOpenSettings={handleOpenSettings} hasStarted={hasStarted} onStart={handleStartGame} />
        </div>
      )}

      <StoreModal 
        isOpen={overlay === 'store'} 
        onClose={handleCloseOverlay} 
      />
      <RankingModal 
        isOpen={overlay === 'ranking'} 
        onClose={handleCloseOverlay} 
      />
      <SettingsModal 
        isOpen={overlay === 'settings'} 
        onClose={handleCloseOverlay} 
      />
      <MultiplayerModal 
        isOpen={overlay === 'multiplayer'} 
        onClose={handleCloseOverlay} 
      />
    </div>
  );
};

export default App;