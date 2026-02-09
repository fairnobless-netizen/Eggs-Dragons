
import React, { useState, useEffect } from 'react';
import { gameBridge } from '../app/gameBridge';
import { RampPos } from '../app/config';
import { StorageService, PlayerProfile } from '../app/storage';
import { I18N } from '../app/i18n';
import { soundService } from '../app/sound';
import './styles/deviceShell.css';

export const DeviceShell: React.FC<{ 
    children: React.ReactNode, 
    isFull: boolean, 
    toggleFull: () => void,
    hasStarted: boolean,
    onStart: () => void
}> = ({ children, isFull, toggleFull, hasStarted, onStart }) => {
  const [profile, setProfile] = useState<PlayerProfile>(StorageService.getProfile());
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(profile.stars);
  const [scales, setScales] = useState(profile.scales);
  const [lives, setLives] = useState(4);
  const [timer, setTimer] = useState(60);
  const [isHard, setIsHard] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [stageCleared, setStageCleared] = useState<number | null>(null);
  const [inventory, setInventory] = useState(profile.inventory);
  const [activeBoosts, setActiveBoosts] = useState<Set<string>>(new Set());
  
  // Mobile & Orientation State
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  const t = I18N[profile.language] || I18N.en;

  useEffect(() => {
    // Detect mobile and orientation
    const checkState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // GDX:HUD_NON_MOBILE - Threshold lowered to 700 to treat iPads (768px+) as Desktop layout
      const isMob = Math.min(width, height) < 700;
      setIsMobile(isMob);
      setIsPortrait(height >= width);
    };
    checkState();
    window.addEventListener('resize', checkState);
    
    const unsubScore = gameBridge.on('UI_SCORE', setScore);
    const unsubStars = gameBridge.on('UI_STARS', setStars);
    const unsubScales = gameBridge.on('UI_SCALES', setScales);
    const unsubLives = gameBridge.on('UI_LIVES', setLives);
    const unsubTimer = gameBridge.on('UI_TIMER', setTimer);
    const unsubOver = gameBridge.on('UI_GAME_OVER', () => setGameOver(true));
    const unsubCleared = gameBridge.on('UI_STAGE_CLEARED', (lvl) => setStageCleared(lvl));
    const unsubInv = gameBridge.on('UI_INVENTORY', (inv) => {
      setInventory(inv);
      setProfile(prev => ({ ...prev, inventory: inv }));
    });
    const unsubPause = gameBridge.on('UI_PAUSE_UPDATE', (isPaused: boolean) => {
      setPaused(isPaused);
    });
    
    return () => {
      window.removeEventListener('resize', checkState);
      unsubScore(); unsubStars(); unsubScales(); unsubLives(); unsubTimer(); unsubOver(); unsubCleared(); unsubInv(); unsubPause();
    };
  }, []);

  const handleRestart = () => {
    soundService.playButtonClick();
    setGameOver(false); setPaused(false); setStageCleared(null);
    setActiveBoosts(new Set());
    gameBridge.restartGame();
  };

  const handleNextLevel = () => {
    soundService.playButtonClick();
    setStageCleared(null);
    setActiveBoosts(new Set());
    gameBridge.nextLevel();
  };

  const useBoost = (type: 'freeze' | 'shield' | 'magnet' | 'refill_hearts') => {
    if (gameOver || paused || stageCleared || !hasStarted) return;
    if (activeBoosts.has(type)) return; 

    if (inventory[type] > 0) {
      if (StorageService.useBoost(type)) {
        gameBridge.activateBoost(type);
        const updatedProfile = StorageService.getProfile();
        gameBridge.emit('UI_INVENTORY', updatedProfile.inventory);
        
        if (type !== 'refill_hearts') {
          setActiveBoosts(prev => {
            const next = new Set(prev);
            next.add(type);
            setTimeout(() => {
              setActiveBoosts(curr => {
                const res = new Set(curr);
                res.delete(type);
                return res;
              });
            }, 7000);
            return next;
          });
        }
      }
    } else {
      soundService.playButtonClick();
      gameBridge.emit('OPEN_STORE');
    }
  };

  const renderHearts = () => {
    const max = 7;
    const items = [];
    for (let i = 0; i < max; i++) {
      if (i < lives) {
        items.push(<span key={i} style={{ color: '#ef4444' }}>❤️</span>);
      } else {
        items.push(<span key={i} style={{ color: '#444', filter: 'grayscale(1)', opacity: 0.3 }}>❤️</span>);
      }
    }
    return items;
  };

  const getTimerColor = () => {
    if (timer > 30) return '#ffffff';
    if (timer > 10) return '#facc15';
    return '#ef4444';
  };

  if (isFull) return null;

  // Force Landscape Overlay for Mobile
  if (isMobile && isPortrait) {
    return (
      <div className="rotate-overlay">
        <div className="rotate-icon">↻</div>
        <h2>Please Rotate Your Phone</h2>
        <p>This game requires landscape mode.</p>
      </div>
    );
  }

  return (
    <div className="device-shell" style={{ direction: profile.language === 'ar' ? 'rtl' : 'ltr' }}>
      <button className="red-btn left-top" onPointerDown={() => gameBridge.setCatchPosition(RampPos.LEFT_TOP)} />
      <button className="red-btn left-bot" onPointerDown={() => gameBridge.setCatchPosition(RampPos.LEFT_BOT)} />
      <button className="red-btn right-top" onPointerDown={() => gameBridge.setCatchPosition(RampPos.RIGHT_TOP)} />
      <button className="red-btn right-bot" onPointerDown={() => gameBridge.setCatchPosition(RampPos.RIGHT_BOT)} />
      
            {/* MP: desktop-only floating button. Mobile: moved into bottom-bar */}
      {!isMobile && (
        <button
          onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_MULTIPLAYER'); }}
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            border: '2px solid #93c5fd',
            boxShadow: '0 4px 0 #1e40af',
            color: '#fff',
            fontSize: '24px',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Multiplayer"
        >
          👥
        </button>
      )}


            {/* Desktop: keep top-bar. Mobile: move these icons to bottom-bar */}
      {!isMobile && (
        <div className="top-bar">
          <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_RANKING'); }} title={t.ranking}>🏆</button>
          <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_STORE'); }} title={t.store}>🛒</button>
          <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_SETTINGS'); }} title={t.settings}>⚙️</button>
          <button className="ui-square-btn" onClick={handleRestart} title={t.restart}>🔄</button>
        </div>
      )}
      
      <img className="stone-frame" src="/ui/layer/top_ui_stones.png" alt="" draggable={false} /> 


      <div className="main-area">
        <div className="game-screen-frame">
          <div className="game-viewport" style={{ overflow: isMobile ? 'visible' : 'hidden' }}>
            {children}
            
            <div className={`hud-layer ${isMobile ? 'mobile-normal' : ''}`}>
              {!isMobile ? (
                // Desktop / iPad Layout (Refactored)
                // GDX:HUD_NON_MOBILE
                <>
                  {/* Left Group: Hearts */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div className="hud-item" style={{ display: 'flex', gap: '2px' }}>{renderHearts()}</div>
                  </div>

                  {/* Center Group: Score (Top) + Timer (Bottom) */}
                  <div style={{ 
                      position: 'absolute', 
                      left: '50%', 
                      transform: 'translateX(-50%)', 
                      top: '12px',
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      gap: '4px'
                  }}>
                    <div className="hud-item" style={{ fontSize: '28px', lineHeight: '1', minWidth: '120px', textAlign: 'center' }}>{score.toString().padStart(5, '0')}</div>
                    {/* GDX: Timer second row */}
                    <div className="hud-item" style={{ color: getTimerColor(), fontSize: '18px', lineHeight: '1' }}>⏳ {timer}</div>
                  </div>

                  {/* Right Group: Currency - GDX:HUD_NON_MOBILE (Row Layout) */}
                  <div style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '12px',
                      display: 'flex', 
                      flexDirection: 'row', // GDX: Row layout
                      gap: '12px',          // GDX: Spacing
                      alignItems: 'center' 
                  }}>
                    <div className="hud-item" style={{ color: '#facc15' }}>💎 {stars}</div>
                    <div className="hud-item" style={{ color: '#4ade80' }}>🐉 {scales}</div>
                  </div>
                </>
              ) : (
                // Mobile Normal Layout (A2 & A3) - Unchanged
                <>
                  <div className="hud-group-left">
                    <div className="hud-item" style={{ display: 'flex', gap: '1px', fontSize: '10px' }}>{renderHearts()}</div>
                  </div>
                  
                  <div className="hud-group-center">
                    <div className="hud-item">{score.toString().padStart(5, '0')}</div>
                  </div>

                  <div className="hud-group-right">
                    <div className="hud-item" style={{ color: '#facc15' }}>💎{stars}</div>
                    <div className="hud-item" style={{ color: '#4ade80' }}>🐉{scales}</div>
                  </div>

                  <div className="hud-group-timer">
                    <div className="hud-item" style={{ color: getTimerColor() }}>⏳ {timer}</div>
                  </div>
                </>
              )}
            </div>

            {/* Start Game Overlay */}
            {!hasStarted && !stageCleared && !gameOver && (
                <div className="game-overlay" style={{ zIndex: 1000 }}>
                    <h2 style={{ fontSize: '32px', color: '#facc15', marginBottom: '10px', fontWeight: 900 }}>READY?</h2>
                    <button className="unified-rect" onClick={() => { soundService.playButtonClick(); onStart(); }} style={{ minWidth: '160px', background: '#facc15', color: '#000', animation: 'pulse 2s infinite' }}>START GAME</button>
                </div>
            )}

            {stageCleared && (
              <div className="game-overlay">
                <h2 style={{ fontSize: '36px', color: '#10b981', marginBottom: '10px', fontWeight: 900 }}>{t.stage_cleared}</h2>
                <p style={{ color: '#fff', marginBottom: '20px', fontWeight: 'bold' }}>Level {stageCleared} completed!</p>
                <button className="unified-rect" onClick={handleNextLevel} style={{ minWidth: '160px', background: '#10b981' }}>{t.next_level}</button>
              </div>
            )}

            {(paused || gameOver) && !stageCleared && (
              <div className="game-overlay">
                <h2 style={{ fontSize: '36px', color: gameOver ? '#ef4444' : '#fbbf24', marginBottom: '24px', fontWeight: 900 }}>
                  {gameOver ? t.game_over : t.paused}
                </h2>
                <button className="unified-rect" onClick={() => { soundService.playButtonClick(); gameOver ? handleRestart() : gameBridge.togglePause(false); }}>
                  {gameOver ? t.retry : t.resume}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="boost-stack">
          {['freeze', 'shield', 'magnet', 'refill_hearts'].map(type => (
            <button 
              key={type} 
              className={`boost-btn ${type === 'refill_hearts' ? 'refill' : type} ${inventory[type as keyof typeof inventory] === 0 || activeBoosts.has(type) ? 'off' : ''}`} 
              onClick={() => useBoost(type as any)}
            >
              {type === 'freeze' ? '❄️' : type === 'shield' ? '🛡️' : type === 'magnet' ? '🧲' : '❤️'}
              <span className="boost-badge">x{inventory[type as keyof typeof inventory]}</span>
            </button>
          ))}
        </div>
      </div>

              <div className="bottom-bar">
        {/* 1) Hard mode */}
        <button 
          className="ui-square-btn" 
          onClick={() => { soundService.playButtonClick(); setIsHard(!isHard); gameBridge.toggleHard(!isHard); }}
          title={isHard ? "Hard Mode" : "Easy Mode"}
        >
          {isHard ? '🔥' : '🌿'}
        </button>

        {/* 2) Multiplayer (mobile moved here; desktop has floating button) */}
        <button
          className="ui-square-btn"
          onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_MULTIPLAYER'); }}
          title="Multiplayer"
        >
          👥
        </button>

        {/* 3) Leaderboard */}
        <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_RANKING'); }} title={t.ranking}>🏆</button>

        {/* 4) Store */}
        <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_STORE'); }} title={t.store}>🛒</button>

        {/* 5) Full view */}
        <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); toggleFull(); }} title={t.exit_full}>
          ⛶
        </button>

        {/* 6) Settings */}
        <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); gameBridge.emit('OPEN_SETTINGS'); }} title={t.settings}>⚙️</button>

        {/* 7) Restart */}
        <button className="ui-square-btn" onClick={handleRestart} title={t.restart}>🔄</button>

        {/* 8) Pause */}
        <button className="ui-square-btn" onClick={() => { soundService.playButtonClick(); gameBridge.togglePause(!paused); }} title={paused ? t.resume : t.paused}>
          {paused ? '▶' : '⏸'}
        </button>
      </div>

    </div>
  );
};
