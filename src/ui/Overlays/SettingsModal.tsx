import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { soundService } from '../../app/sound';
import { gameBridge } from '../../app/gameBridge';
import { StorageService, ControlId, ControlLayout, DEFAULT_LAYOUT, MOBILE_DEFAULT_LAYOUT, LanguageCode } from '../../app/storage';
import { I18N } from '../../app/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'sound' | 'performance' | 'account'>('sound');
  const [profile, setProfile] = useState(StorageService.getProfile());
  const [soundConfig, setSoundConfig] = useState(soundService.getSettings());
  const [layout, setLayout] = useState<ControlLayout>(StorageService.getLayout());
  const [dragging, setDragging] = useState<ControlId | null>(null);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Account Tab Local State
  const [pendingUsername, setPendingUsername] = useState(profile.username);
  const [pendingLanguage, setPendingLanguage] = useState(profile.language);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    const checkLayout = () => {
      // Check for mobile landscape specifically (phones)
      setIsMobileLandscape(window.innerWidth < 900 && window.innerHeight < 500);
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  const t = I18N[profile.language] || I18N.en;

  useEffect(() => {
    gameBridge.updateSoundSettings(soundConfig);
    soundService.updateSettings(soundConfig);
  }, [soundConfig]);

  useEffect(() => {
  }, [layout]);

  const handleSaveLayout = () => {
    soundService.playButtonClick();
    StorageService.setLayout(layout);
    gameBridge.updateLayout(layout);
    onClose();
  };

  const handleResetLayout = () => {
    soundService.playButtonClick();
    const defaultToUse = isMobileLandscape ? MOBILE_DEFAULT_LAYOUT : DEFAULT_LAYOUT;
    setLayout(defaultToUse);
    StorageService.setLayout(defaultToUse);
    gameBridge.updateLayout(defaultToUse);
  };

  const handlePointerDown = (id: ControlId) => setDragging(id);
  const handlePointerUp = () => setDragging(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const x = Math.max(0.02, Math.min(0.92, (e.clientX - rect.left) / rect.width));
    let y = Math.max(0.02, Math.min(0.92, (e.clientY - rect.top) / rect.height));

    const isBottomRow = ['settings', 'pause', 'power_freeze', 'power_shield', 'power_magnet', 'power_refill', 'multiplayer'].includes(dragging);
    if (isBottomRow) {
       y = 0.92;
    }

    setLayout(prev => ({ ...prev, [dragging]: { x, y } }));
  };

  const handleCopyId = () => {
    soundService.playButtonClick();
    navigator.clipboard.writeText(profile.userId);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9 ]/g, '');
    setPendingUsername(val);
  };

  const handleAccountOk = () => {
    soundService.playButtonClick();
    const trimmed = pendingUsername.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      alert(t.invalid_username);
      return;
    }
    
    StorageService.updateProfile({
      username: trimmed,
      language: pendingLanguage
    });

    if (pendingLanguage !== profile.language) {
      window.location.reload();
    } else {
      setProfile(StorageService.getProfile());
      onClose();
    }
  };

  if (!isOpen) return null;

  const controlLabels: Record<ControlId, string> = {
    move_ul: 'UL', move_ur: 'UR', move_bl: 'BL', move_br: 'BR',
    power_freeze: '❄️', power_shield: '🛡️', power_magnet: '🧲', power_refill: '❤️',
    pause: '⏸', settings: '⚙️', multiplayer: '👥'
  };

  const tabs = ['controls', 'sound', 'performance', 'account'] as const;

  const tabPad = isMobileLandscape ? '4px' : '15px';
  const contentPad = isMobileLandscape ? '8px' : '24px';
  const fontSizeMain = isMobileLandscape ? '11px' : '14px';
  const headerSize = isMobileLandscape ? '12px' : '18px';
  
  const modalWidth = isMobileLandscape ? '75vw' : '95%';
  const modalMaxWidth = isMobileLandscape ? '420px' : '600px';
  const modalMaxHeight = isMobileLandscape ? '90vh' : 'auto';

  return createPortal(
    <div 
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', direction: profile.language === 'ar' ? 'rtl' : 'ltr' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div style={{ background: '#1e293b', width: modalWidth, maxWidth: modalMaxWidth, borderRadius: isMobileLandscape ? '16px' : '24px', border: '2px solid #334155', overflow: 'hidden', color: '#fff', display: 'flex', flexDirection: 'column', maxHeight: modalMaxHeight }}>
        
        <div style={{ display: 'flex', background: '#0f172a', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button 
              key={tab}
              onClick={() => { soundService.playButtonClick(); setActiveTab(tab); }}
              style={{ 
                flex: 1, padding: tabPad, border: 'none', background: activeTab === tab ? '#1e293b' : 'transparent',
                color: activeTab === tab ? '#38bdf8' : '#64748b', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
                fontSize: isMobileLandscape ? '10px' : '14px'
              }}
            >
              {t[tab]}
            </button>
          ))}
        </div>

        <div style={{ padding: contentPad, flex: 1, overflowY: 'auto' }}>
          {activeTab === 'controls' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: isMobileLandscape ? '2px' : '16px' }}>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: headerSize }}>{t.edit_layout}</h3>
                <p style={{ fontSize: isMobileLandscape ? '9px' : '12px', color: '#94a3b8', margin: '1px 0 0 0' }}>{t.layout_help}</p>
              </div>
              
              <div 
                ref={previewRef}
                style={{ 
                  width: '100%', 
                  aspectRatio: '2/1',
                  background: '#0f172a', border: '2px solid #334155', borderRadius: '12px', position: 'relative',
                  marginBottom: isMobileLandscape ? '4px' : '20px', overflow: 'hidden', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                  flexShrink: 0
                }}
              >
                <div style={{ position: 'absolute', inset: '4px', border: '1px dashed #334155', borderRadius: '8px', pointerEvents: 'none' }} />

                {Object.keys(layout).map((key) => {
                  const id = key as ControlId;
                  const pos = layout[id];
                  const isMove = id.startsWith('move');
                  const isSys = id === 'pause' || id === 'settings';
                  return (
                    <div 
                      key={id}
                      onPointerDown={() => handlePointerDown(id)}
                      style={{
                        position: 'absolute', left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, 
                        width: isMobileLandscape ? '32px' : '40px', height: isMobileLandscape ? '32px' : '40px',
                        transform: dragging === id ? 'translate(-50%, -50%) scale(1.2)' : 'translate(-50%, -50%)',
                        borderRadius: isMove ? '50%' : '8px', 
                        background: isMove ? 'radial-gradient(circle at 35% 35%, #ff5252, #b71c1c)' : 
                                    isSys ? '#64748b' :
                                    id.includes('freeze') ? '#38bdf8' : id.includes('shield') ? '#fb923c' : id.includes('magnet') ? '#eab308' : '#ef4444',
                        border: '2px solid rgba(255,255,255,0.3)', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '10px', fontWeight: 'bold',
                        color: '#fff', zIndex: dragging === id ? 100 : 10
                      }}
                    >
                      {controlLabels[id]}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button onClick={handleSaveLayout} style={{ flex: 1, padding: '2px', height: '24px', background: '#38bdf8', color: '#000', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '9px' }}>{t.save}</button>
                <button onClick={handleResetLayout} style={{ flex: 1, padding: '2px', height: '24px', background: '#475569', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '9px' }}>{t.reset}</button>
              </div>
            </div>
          )}

          {activeTab === 'sound' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileLandscape ? '8px' : '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: fontSizeMain }}>{t.music}</span>
                <button onClick={() => setSoundConfig({...soundConfig, music: !soundConfig.music})} style={{ background: soundConfig.music ? '#22c55e' : '#ef4444', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: '20px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>{soundConfig.music ? 'ON' : 'OFF'}</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: fontSizeMain }}>{t.sfx}</span>
                <button onClick={() => setSoundConfig({...soundConfig, sfx: !soundConfig.sfx})} style={{ background: soundConfig.sfx ? '#22c55e' : '#ef4444', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: '20px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}>{soundConfig.sfx ? 'ON' : 'OFF'}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: fontSizeMain }}>{t.volume} ({soundConfig.volume}%)</span>
                <input type="range" min="0" max="100" value={soundConfig.volume} onChange={(e) => setSoundConfig({...soundConfig, volume: parseInt(e.target.value)})} style={{ width: '100%', cursor: 'pointer', height: '4px' }} />
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileLandscape ? '8px' : '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: fontSizeMain }}>Target FPS</span>
                <button style={{ background: '#334155', color: '#fff', border: '1px solid #475569', padding: '2px 8px', borderRadius: '8px', fontSize: '10px' }}>60 FPS</button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: fontSizeMain }}>Visual Quality</span>
                <button style={{ background: '#22c55e', border: 'none', color: '#fff', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: 'bold' }}>HIGH</button>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: isMobileLandscape ? '8px' : '24px' }}>
              <div>
                <label style={{ fontSize: '9px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>{t.user_id}</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input readOnly value={profile.userId} style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', padding: '4px', borderRadius: '6px', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px' }} />
                  <button onClick={handleCopyId} style={{ padding: '0 8px', background: copyFeedback ? '#22c55e' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', minWidth: '40px', fontSize: '9px' }}>
                    {copyFeedback ? t.copied : t.copy}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '9px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>{t.username}</label>
                <input value={pendingUsername} onChange={handleUsernameChange} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '4px', borderRadius: '6px', color: '#fff', fontSize: '10px' }} placeholder="Min 3 chars" />
              </div>

              <div>
                <label style={{ fontSize: '9px', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>{t.language}</label>
                <select value={pendingLanguage} onChange={(e) => setPendingLanguage(e.target.value as LanguageCode)} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', padding: '4px', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '10px' }}>
                  <option value="en">English</option>
                  <option value="ru">Русский</option>
                  <option value="de">Deutsch</option>
                  <option value="uk">Українська</option>
                  <option value="pl">Polski</option>
                  <option value="ar">العربية</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button onClick={handleAccountOk} style={{ flex: 1, padding: '6px', background: '#38bdf8', color: '#000', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>{t.ok}</button>
                <button onClick={() => { soundService.playButtonClick(); onClose(); }} style={{ flex: 1, padding: '6px', background: '#475569', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>{t.cancel}</button>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => { soundService.playButtonClick(); onClose(); }} style={{ width: '100%', padding: isMobileLandscape ? '8px' : '20px', background: '#334155', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderTop: '1px solid #475569', fontSize: isMobileLandscape ? '11px' : '16px' }}>{t.close}</button>
      </div>
    </div>,
    document.body
  );
};