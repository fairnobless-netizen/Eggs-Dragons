
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { gameBridge } from '../app/gameBridge';
import { RampPos } from '../app/config';
import { StorageService, ControlLayout, PlayerProfile, ControlId } from '../app/storage';
import { I18N } from '../app/i18n';
import { soundService } from '../app/sound';
import './styles/deviceShell.css';


interface FullOverlayProps {
  isFull: boolean;
  toggleFull: () => void;
  onOpenSettings: () => void;
  hasStarted: boolean;
  onStart: () => void;
}

export const FullOverlay: React.FC<FullOverlayProps> = ({ isFull, toggleFull, onOpenSettings, hasStarted, onStart }) => {
  const [profile, setProfile] = useState<PlayerProfile>(StorageService.getProfile());
  const [lives, setLives] = useState(4);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(profile.stars);
  const [scales, setScales] = useState(profile.scales);
  const [timer, setTimer] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [stageCleared, setStageCleared] = useState<number | null>(null);
  const [inventory, setInventory] = useState(profile.inventory);
  const [layout, setLayout] = useState<ControlLayout>(StorageService.getLayout());
  const [paused, setPaused] = useState(false);
  
  // Orientation & Mobile State
  const [isMobile, setIsMobile] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  const t = I18N[profile.language] || I18N.en;

// Enforce Fullscreen geometry: do NOT reuse NormalMode positioning
useLayoutEffect(() => {
  const mount = document.getElementById('full-mount-parent');
  const shared = document.getElementById('game-shared-mount');
  if (!mount || !shared) return;

  Object.assign(mount.style, {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#000',
  });

  const getCanvas = () =>
    (shared.querySelector('canvas') as HTMLCanvasElement | null) ??
    (mount.querySelector('canvas') as HTMLCanvasElement | null);

  const clearCanvasInline = (c: HTMLCanvasElement | null) => {
    if (!c) return;
    c.style.position = '';
    c.style.left = '';
    c.style.top = '';
    c.style.right = '';
    c.style.bottom = '';
    c.style.width = '';
    c.style.height = '';
    c.style.margin = '';
    c.style.display = '';
    c.style.transformOrigin = '';
    c.style.transform = '';
  };

  const clearSharedInline = () => {
    shared.style.position = '';
    shared.style.left = '';
    shared.style.top = '';
    shared.style.right = '';
    shared.style.bottom = '';
    shared.style.width = '';
    shared.style.height = '';
    shared.style.margin = '';
    shared.style.transform = '';
  };

  const enforceSharedFull = () => {
    Object.assign(shared.style, {
      position: 'absolute',
      inset: '0px',
      width: '100%',
      height: '100%',
      margin: '0',
      transform: 'none',
    });
  };

  if (!isFull) {
    clearCanvasInline(getCanvas());
    clearSharedInline();
    return;
  }

  enforceSharedFull();

  const applyCover = () => {
    const c = getCanvas();
    if (!c) return;

    const mountRect = mount.getBoundingClientRect();
    const canvasRect = c.getBoundingClientRect();

    const mw = mountRect.width;
    const mh = mountRect.height;
    const cw = canvasRect.width;
    const ch = canvasRect.height;

    if (!mw || !mh || !cw || !ch) return;

    const scale = Math.max(mw / cw, mh / ch);

    // Hard reset Phaser-injected positioning (prevents “sticking” to corner)
    c.style.left = '';
    c.style.top = '';
    c.style.right = '';
    c.style.bottom = '';
    c.style.margin = '';

    Object.assign(c.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: `${cw}px`,
      height: `${ch}px`,
      margin: '0',
      display: 'block',
      transformOrigin: '50% 50%',
      transform: `translate(-50%, -50%) scale(${scale})`,
    });
  };

  // settle DOM -> apply cover twice
  let raf1 = 0;
  let raf2 = 0;
  raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      applyCover();
      requestAnimationFrame(applyCover);
    });
  });

  const onResize = () => applyCover();
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // After Phaser refresh, re-apply cover (critical)
  const onPhaserRefreshed = () => {
    enforceSharedFull();
    applyCover();
    requestAnimationFrame(applyCover);
  };
  window.addEventListener('PHASER_REFRESHED', onPhaserRefreshed as any);

  const roMount = new ResizeObserver(() => applyCover());
  roMount.observe(mount);

  const roCanvas = new ResizeObserver(() => applyCover());
  const c0 = getCanvas();
  if (c0) roCanvas.observe(c0);

  const t = window.setTimeout(() => {
    enforceSharedFull();
    applyCover();
  }, 120);

  return () => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    window.clearTimeout(t);

    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.removeEventListener('PHASER_REFRESHED', onPhaserRefreshed as any);

    roMount.disconnect();
    roCanvas.disconnect();

    clearCanvasInline(getCanvas());
    clearSharedInline();
  };
}, [isFull]);

  useEffect(() => {
    // Basic mobile check
    const checkState = () => {
       const width = window.innerWidth;
       const height = window.innerHeight;
       const mobileCheck = Math.min(width, height) < 700;
       const phoneCheck = width < 900 && height < 500;
       
       setIsMobile(mobileCheck);
       setIsPhone(phoneCheck);
       setIsPortrait(height >= width);
    };
    
    checkState();
    window.addEventListener('resize', checkState);
    return () => window.removeEventListener('resize', checkState);
  }, []);

  useEffect(() => {
    const unsubScore = gameBridge.on('UI_SCORE', setScore);
    const unsubStars = gameBridge.on('UI_STARS', setStars);
    const unsubScales = gameBridge.on('UI_SCALES', setScales);
    const unsubLives = gameBridge.on('UI_LIVES', setLives);
    const unsubTimer = gameBridge.on('UI_TIMER', setTimer);
    const unsubOver = gameBridge.on('UI_GAME_OVER', () => setGameOver(true));
    const unsubCleared = gameBridge.on('UI_STAGE_CLEARED', (lvl) => setStageCleared(lvl));
    const unsubLayout = gameBridge.on('UI_LAYOUT_UPDATE', setLayout);
    const unsubInv = gameBridge.on('UI_INVENTORY', setInventory);
    const unsubPause = gameBridge.on('UI_PAUSE_UPDATE', setPaused);
    
    return () => {
      unsubScore(); unsubStars(); unsubScales(); unsubLives(); unsubTimer(); unsubOver(); unsubCleared(); unsubLayout(); unsubInv(); unsubPause();
    };
  }, []);

  const handleRestart = () => {
    soundService.playButtonClick();
    setGameOver(false); setStageCleared(null);
    gameBridge.restartGame();
  };

  const handleNextLevel = () => {
    soundService.playButtonClick();
    setStageCleared(null);
    gameBridge.nextLevel();
  };

  const handlePause = () => {
    soundService.playButtonClick();
    gameBridge.togglePause(!paused);
  };

  const useBoost = (type: 'freeze' | 'shield' | 'magnet' | 'refill_hearts') => {
    if (gameOver || stageCleared || !hasStarted) return;
    if (inventory[type] > 0) {
      if (StorageService.useBoost(type)) {
        gameBridge.activateBoost(type);
        const updatedProfile = StorageService.getProfile();
        setInventory(updatedProfile.inventory);
      }
    }
  };

  const getTimerColor = () => {
    if (timer > 30) return '#ffffff';
    if (timer > 10) return '#facc15';
    return '#ef4444';
  };

  if (!isFull) return null;

  // Force Landscape Overlay
  if (isMobile && isPortrait) {
    return (
      <div className="rotate-overlay">
        <div className="rotate-icon">↻</div>
        <h2>Please Rotate Your Phone</h2>
        <p>This game requires landscape mode.</p>
      </div>
    );
  }


    // Button styles: size is controlled by CSS (.red-btn)
    const btnStyle = (id: ControlId): React.CSSProperties => {
        const zIndex = isPhone ? 900 : 100;

        return {
            position: 'absolute',
            pointerEvents: 'auto',
            zIndex,
            transform: 'translate(-50%, -50%)',
            left: `${layout[id]?.x * 100}%`,
            top: `${layout[id]?.y * 100}%`,
        };
    };


  const renderControl = (id: ControlId) => {
    if (!layout[id]) return null;
    const style = btnStyle(id);

    if (id === 'move_ul') return <button key={id} className="red-btn" style={style} onPointerDown={() => gameBridge.setCatchPosition(RampPos.LEFT_TOP)} />;
    if (id === 'move_bl') return <button key={id} className="red-btn" style={style} onPointerDown={() => gameBridge.setCatchPosition(RampPos.LEFT_BOT)} />;
    if (id === 'move_ur') return <button key={id} className="red-btn" style={style} onPointerDown={() => gameBridge.setCatchPosition(RampPos.RIGHT_TOP)} />;
    if (id === 'move_br') return <button key={id} className="red-btn" style={style} onPointerDown={() => gameBridge.setCatchPosition(RampPos.RIGHT_BOT)} />;
    
    if (id === 'pause') return (
        <button key={id} className="exit-btn" 
            style={{ 
              ...style, 
              width: '34px', height: '34px', 
              borderRadius: '12px', background: '#3b82f6', border: '2px solid rgba(0,0,0,0.2)', padding: 0, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' 
            }} 
            onClick={handlePause}
        >
            {paused ? '▶' : '⏸'}
        </button>
    );
    if (id === 'settings') return (
        <button key={id} className="boost-btn" 
            style={{ 
              ...style, 
              width: '34px', height: '34px', 
              background: '#64748b', borderWidth: '2px', fontSize: '14px' 
            }} 
            onClick={() => { soundService.playButtonClick(); onOpenSettings(); }}
        >
            ⚙️
        </button>
    );
    if (id === 'multiplayer') return (
        <button key={id} className="boost-btn" 
            style={{ 
              ...style, 
              width: '34px', height: '34px', 
              background: '#2563eb', borderWidth: '2px', fontSize: '14px', color: '#fff' 
            }} 
            onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_MULTIPLAYER'); }}
        >
            👥
        </button>
    );

    if (id.startsWith('power_')) {
        const type = id.replace('power_', '') as 'freeze' | 'shield' | 'magnet' | 'refill_hearts';
        const icon = type === 'freeze' ? '❄️' : type === 'shield' ? '🛡️' : type === 'magnet' ? '🧲' : '❤️';
        const isOff = inventory[type] === 0;
        
        return (
            <button key={id} className={`boost-btn ${type} ${isOff ? 'off' : ''}`} 
              style={{
                ...style,
                width: '34px', height: '34px',
                fontSize: '14px', borderWidth: '2px'
              }} 
              onClick={() => useBoost(type)}
            >
                {icon}<span className="boost-badge" style={{ fontSize: '8px', padding: '0 2px', bottom: '-4px' }}>x{inventory[type]}</span>
            </button>
        );
    }
    
    return null;
  };

  const allControlIds: ControlId[] = ['move_ul', 'move_ur', 'move_bl', 'move_br', 'power_freeze', 'power_shield', 'power_magnet', 'power_refill', 'pause', 'settings', 'multiplayer'];

  return (
    <div className="full-ui-layer" style={{ direction: profile.language === 'ar' ? 'rtl' : 'ltr' }}>
      
      {/* Container for Controls and HUD - Centered and Aspect Ratio Locked on Phone */}
      <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          height: '100%',
          // On phone landscape, force a 2:1 aspect ratio constraint to match requested spec
          // This keeps UI elements from drifting too far on ultrawide screens
          aspectRatio: isPhone ? '2/1' : 'auto',
          maxWidth: isPhone ? '200vh' : 'none', 
          maxHeight: isPhone ? '50vw' : 'none',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'none'
      }}>

          {/* Top HUD */}
          <div style={{ 
              position: 'relative',
              width: '100%',
              padding: isMobile ? '8px 12px' : '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              zIndex: 1100,
              pointerEvents: 'none'
          }}>
            {/* Left: Hearts */}
            <div style={{ 
              display: 'flex', 
              flexDirection: isMobile ? 'row' : 'column', 
              gap: isMobile ? '15px' : '5px', 
              alignItems: isMobile ? 'center' : 'flex-start',
              // Removed margin hacks, relying on container centering
            }}>
              <div style={{ fontSize: isMobile ? '20px' : '32px', color: '#ef4444', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{'❤️'.repeat(lives)}</div>
            </div>

            {/* Center: Score & Timer */}
            <div style={{ 
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                top: isMobile ? '5px' : '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
              <div style={{ 
                  fontSize: isMobile ? '28px' : '36px', 
                  fontWeight: 900, 
                  color: '#facc15', 
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)', 
                  fontFamily: 'monospace',
                  lineHeight: 1
              }}>
                {score.toString().padStart(5, '0')}
              </div>
              <div style={{ 
                  fontSize: isMobile ? '20px' : '24px', 
                  fontWeight: 700, 
                  color: getTimerColor(), 
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)', 
                  fontFamily: 'monospace',
                  marginTop: '2px'
              }}>
                {timer}
              </div>
            </div>

            {/* Right: Controls & Currency */}
            <div style={{ 
              display: 'flex', 
              gap: isMobile ? '8px' : '20px', 
              pointerEvents: 'auto', 
              alignItems: 'center',
            }}>
              
              {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '20px' }}>
                      <div style={{ fontSize: '24px', color: '#facc15', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontWeight: 900 }}>💎 {stars}</div>
                      <div style={{ fontSize: '24px', color: '#4ade80', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontWeight: 900 }}>🐉 {scales}</div>
                  </div>
              )}

              <div style={{ display: 'flex', gap: isMobile ? '8px' : '10px' }}>
                <button className="exit-btn" style={{ background: '#f87171', position: 'static', padding: 0, width: isMobile ? '30px' : '40px', height: isMobile ? '30px' : '40px', fontSize: isMobile ? '18px' : '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={handleRestart} title={t.restart}>🔄</button>
                
                <button className="exit-btn" style={{ position: 'static', padding: 0, width: isMobile ? '30px' : '40px', height: isMobile ? '30px' : '40px', fontSize: isMobile ? '18px' : '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { soundService.playButtonClick(); toggleFull(); }} title={t.exit_full}>
                    🗗
                </button>
              </div>
            </div>
          </div>

          {/* Controls Layer - Relative to this container */}
          <div style={{ 
              position: 'relative', 
              flex: 1, 
              width: '100%',
              pointerEvents: 'none' 
          }}>
              {isPhone ? (
                  allControlIds.map(id => renderControl(id))
              ) : isMobile ? (
                  ['move_ul', 'move_ur', 'move_bl', 'move_br'].map(id => renderControl(id as ControlId))
              ) : (
                  allControlIds.filter(id => id !== 'pause' && id !== 'settings').map(id => renderControl(id))
              )}
          </div>

          {/* Tablet (isMobile && !isPhone) Static Bottom Row */}
          {isMobile && !isPhone && (
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '10px', 
                pointerEvents: 'auto',
                zIndex: 1100,
                alignItems: 'center',
                paddingBottom: '10px'
            }}>
                 <button 
                   className="boost-btn" 
                   style={{ width: '34px', height: '34px', fontSize: '14px', borderWidth: '2px', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                   onClick={() => { soundService.playButtonClick(); onOpenSettings(); }}
                 >
                    ⚙️
                 </button>

                 {[ 
                     { id: 'freeze', icon: '❄️' }, 
                     { id: 'shield', icon: '🛡️' }, 
                     { id: 'magnet', icon: '🧲' }, 
                     { id: 'refill_hearts', icon: '❤️' } 
                 ].map(item => (
                    <button 
                        key={item.id}
                        className={`boost-btn ${item.id} ${inventory[item.id as keyof typeof inventory] === 0 ? 'off' : ''}`} 
                        style={{ width: '34px', height: '34px', fontSize: '14px', borderWidth: '2px' }} 
                        onClick={() => useBoost(item.id as any)}
                    >
                        {item.icon}
                        <span className="boost-badge" style={{ fontSize: '8px', padding: '0 2px', bottom: '-4px' }}>x{inventory[item.id as keyof typeof inventory]}</span>
                    </button>
                 ))}
                 
                 <button 
                   className="exit-btn" 
                   style={{ 
                     position: 'static', background: '#3b82f6', padding: '0', 
                     width: '34px', height: '34px', 
                     fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                     borderRadius: '12px', border: '2px solid rgba(0,0,0,0.2)', marginLeft: '6px'
                   }} 
                   onClick={handlePause}
                 >
                    {paused ? '▶' : '⏸'}
                 </button>
            </div>
          )}
      </div>

      {/* Global Overlays - Centered in screen regardless of ratio */}
      {!hasStarted && !stageCleared && !gameOver && (
          <div className="game-overlay" style={{ zIndex: 1000 }}>
              <h2 style={{ fontSize: '48px', color: '#facc15', marginBottom: '10px', fontWeight: 900 }}>READY?</h2>
              <button className="unified-rect" onClick={() => { soundService.playButtonClick(); onStart(); }} style={{ minWidth: '220px', background: '#facc15', color: '#000', fontSize: '24px', animation: 'pulse 2s infinite' }}>START GAME</button>
          </div>
      )}

      {stageCleared && (
        <div className="game-overlay">
          <h2 style={{ fontSize: isMobile ? '40px' : '64px', color: '#10b981', marginBottom: '10px', fontWeight: 900 }}>{t.stage_cleared}</h2>
          <p style={{ color: '#fff', fontSize: isMobile ? '18px' : '24px', marginBottom: '30px', fontWeight: 'bold' }}>Level {stageCleared} completed!</p>
          <button className="unified-rect" onClick={handleNextLevel} style={{ minWidth: isMobile ? '150px' : '220px', height: isMobile ? '40px' : '60px', fontSize: isMobile ? '16px' : '20px', background: '#10b981' }}>{t.next_level}</button>
        </div>
      )}

      {gameOver && !stageCleared && (
        <div className="game-overlay">
          <h2 style={{ fontSize: isMobile ? '40px' : '64px', color: '#ef4444', marginBottom: isMobile ? '20px' : '40px', fontWeight: 900 }}>{t.game_over}</h2>
          <div style={{ display: 'flex', gap: '20px' }}>
             <button className="unified-rect" onClick={handleRestart} style={{ minWidth: isMobile ? '120px' : '180px', height: isMobile ? '45px' : '60px', fontSize: isMobile ? '14px' : '18px' }}>{t.retry}</button>
             <button className="unified-rect" onClick={() => { soundService.playButtonClick(); toggleFull(); }} style={{ minWidth: isMobile ? '120px' : '180px', height: isMobile ? '45px' : '60px', fontSize: isMobile ? '14px' : '18px', background: '#64748b' }}>{t.cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
};
