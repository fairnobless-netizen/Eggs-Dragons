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

        const updateTgMetrics = () => {
            try {
                const w: any = window as any;
                const tg = w.Telegram?.WebApp;

                // Telegram provides these on modern clients; fallback to 0
                const top =
                    tg?.contentSafeAreaInset?.top ??
                    tg?.safeAreaInset?.top ??
                    0;

                const bottom =
                    tg?.contentSafeAreaInset?.bottom ??
                    tg?.safeAreaInset?.bottom ??
                    0;

                // viewportHeight is the WebApp visible height in Telegram
                const vh =
                    tg?.viewportHeight ??
                    window.innerHeight;

                const root = document.documentElement;
                root.style.setProperty('--tg-viewport-h', `${Math.max(0, Math.floor(vh))}px`);
                root.style.setProperty('--tg-content-top', `${Math.max(0, Math.floor(top))}px`);
                root.style.setProperty('--tg-content-bottom', `${Math.max(0, Math.floor(bottom))}px`);
            } catch {
                // no-op
            }
        };

        // initial metrics
        updateTgMetrics();

        // subscribe to Telegram viewport changes (best effort)
        try {
            const w: any = window as any;
            const tg = w.Telegram?.WebApp;
            if (tg?.onEvent) {
                tg.onEvent('viewportChanged', updateTgMetrics);
            }
        } catch {
            // no-op
        }

        // also handle normal browser resize
        window.addEventListener('resize', updateTgMetrics);

        // Check onboarding status
        const profile = StorageService.getProfile();
        setIsOnboarded(profile.isOnboarded);

        // START: loading timer
        const timer = setTimeout(() => {
            setIsLoading(false);
            // one more pass after loading
            updateTgMetrics();
        }, 5000);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateTgMetrics);
            try {
                const w: any = window as any;
                const tg = w.Telegram?.WebApp;
                if (tg?.offEvent) {
                    tg.offEvent('viewportChanged', updateTgMetrics);
                }
            } catch {
                // no-op
            }
        };
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

    // Force-enter full view (used by auto-enter after onboarding)
    const enterFullView = () => {
        setIsFull(true);
        gameBridge.setFullscreen(true);

        // Best-effort Telegram fullscreen/expand (may be ignored on iOS)
        requestTelegramFullscreenBestEffort();

        // Small pause/resume to let Phaser layout settle
        gameBridge.togglePause(true);
        setTimeout(() => gameBridge.togglePause(false), 300);

        try {
            const w: any = window as any;
            if (w.Telegram?.WebApp?.expand) {
                w.Telegram.WebApp.expand();
            }
        } catch {
            // no-op
        }
    };

    const didAutoEnterFullRef = useRef(false);

    useEffect(() => {
        // Auto-enter Full View after onboarding (also for returning users)
        if (didAutoEnterFullRef.current) return;
        if (isLoading) return;
        if (!isOnboarded) return;

        didAutoEnterFullRef.current = true;
        enterFullView();
    }, [isLoading, isOnboarded]);

// Fix: Reparent game canvas when mode changes OR when onboarding completes (DeviceShell mounts)
// P0: Added `isLoading` to dependency array to ensure canvas attaches when loading screen vanishes
useEffect(() => {
  const targetId = isFull ? 'full-mount-parent' : 'shell-mount-parent';
  const target = document.getElementById(targetId);

  if (!target || !sharedMountRef.current) return;

  if (sharedMountRef.current.parentElement !== target) {
    target.appendChild(sharedMountRef.current);
  }

  // P0: Telegram WebView often finalizes viewport only after a real/synthetic resize tick.
  // We do 2–3 passes: (layout flush) -> phaser refresh -> synthetic resize -> PHASER_REFRESHED
  const refreshOnce = () => {
    // Force layout flush so getBoundingClientRect() returns final geometry
    target.getBoundingClientRect();

    if (gameRef.current) {
      gameRef.current.scale.refresh();
    }

    // Important: mimic what fixes it on phone rotation
    window.dispatchEvent(new Event('resize'));

    // Let FullOverlay re-apply cover AFTER Phaser touches canvas CSS
    window.dispatchEvent(new CustomEvent('PHASER_REFRESHED', { detail: { isFull } }));
  };

  let raf1 = 0;
  let raf2 = 0;
  let t1: number | undefined;
  let t2: number | undefined;

  raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      refreshOnce();
    });
  });

  // Extra stabilization passes (Telegram often settles viewport in the next ticks)
  t1 = window.setTimeout(refreshOnce, 80);
  t2 = window.setTimeout(refreshOnce, 220);

  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    if (t1) window.clearTimeout(t1);
    if (t2) window.clearTimeout(t2);
  };
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

    const toggleFull = () => {
        const newState = !isFull;
        setIsFull(newState);

        gameBridge.setFullscreen(newState);

        // If entering full mode manually — try request fullscreen (best effort)
        if (newState) requestTelegramFullscreenBestEffort();

        gameBridge.togglePause(true);
        setTimeout(() => gameBridge.togglePause(false), 300);

        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.expand();
        }
    };

    const handleCloseOverlay = () => {
        setOverlay(null);
        gameBridge.togglePause(false); // TASK D1: Close resumes
    };

    const handleOnboardingComplete = () => {
        // best effort: on user gesture (OK) try to request fullscreen + expand
        requestTelegramFullscreenBestEffort();

        setIsOnboarded(true);
    };

    const handleStartGame = () => {
        // also try fullscreen on user gesture (Start Game)
        requestTelegramFullscreenBestEffort();

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
        <div
            style={{
                width: '100vw',
                height: 'var(--tg-viewport-h, 100vh)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#111',
                overflow: 'hidden',
                boxSizing: 'border-box',
                paddingTop: 'var(--tg-content-top, 0px)',
                paddingBottom: 'var(--tg-content-bottom, 0px)',
            }}
        >

      
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
    <div id="full-mount-parent" />
    <FullOverlay
      isFull={isFull}
      toggleFull={toggleFull}
      onOpenSettings={handleOpenSettings}
      hasStarted={hasStarted}
      onStart={handleStartGame}
    />
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