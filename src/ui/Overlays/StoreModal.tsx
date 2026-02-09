import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { STORE_PRICES } from '../../app/config';
import { StorageService, PlayerProfile } from '../../app/storage';
import { gameBridge } from '../../app/gameBridge';
import { I18N } from '../../app/i18n';
import { soundService } from '../../app/sound';
import { ApiClient } from '../../net/apiClient';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  stars?: number;
}

interface ConfirmState {
  item: string;
  cost: string;
  onConfirm: () => void;
  isPack?: boolean;
}

export const StoreModal: React.FC<StoreModalProps> = ({ isOpen, onClose }) => {
  // BETA SAFETY: Disable real-money (Telegram Stars) purchases until backend + invoice confirmation is implemented.
  const PURCHASES_ENABLED = false;

  const [activeTab, setActiveTab] = useState<'stars' | 'boosts' | 'skins'>('stars');
  const [profile, setProfile] = useState<PlayerProfile>(StorageService.getProfile());
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const checkLayout = () => {
      // Mobile Landscape Check
      setIsMobileLandscape(window.innerWidth < 900 && window.innerHeight < 500);
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  // Sync profile when opened
  useEffect(() => {
    if (isOpen) {
      setProfile(StorageService.getProfile());
      setConfirmModal(null);
    }
  }, [isOpen]);

  // Listen to live updates
  useEffect(() => {
    const unsubInv = gameBridge.on('UI_INVENTORY', (inv) => setProfile((p) => ({ ...p, inventory: inv })));
    const unsubStars = gameBridge.on('UI_STARS', (stars) => setProfile((p) => ({ ...p, stars })));
    const unsubScales = gameBridge.on('UI_SCALES', (scales) => setProfile((p) => ({ ...p, scales })));
    return () => {
      unsubInv();
      unsubStars();
      unsubScales();
    };
  }, []);

  if (!isOpen) return null;

  const t = I18N[profile.language] || I18N.en;

  const handleBuyPack = (pack: typeof STORE_PRICES.DIAMOND_PACKS[0]) => {
    soundService.playButtonClick();

    // Format confirmation message for Blue Eggs
    const msg = t.confirm_buy_pack
      .replace('{amount}', pack.amount.toString())
      .replace('{cost}', pack.costXtr.toString());

    // BETA SAFETY: block real payments until backend is ready
    if (!PURCHASES_ENABLED) {
      setConfirmModal({
        item: `${pack.amount} 🥚`,
        cost: `${pack.costXtr} ⭐`,
        isPack: true,
        onConfirm: () => {
          alert(t.beta_purchases_disabled || 'Beta mode: purchases are temporarily disabled.');
          setConfirmModal(null);
        }
      });
      return;
    }

    setConfirmModal({
      item: `${pack.amount} 🥚`, // Blue Eggs
      cost: `${pack.costXtr} ⭐`, // Telegram Stars cost
      isPack: true,
      onConfirm: async () => {
        try {
          // Real flow placeholder (will be implemented later with Telegram invoice + backend confirmation)
          await ApiClient.createPaymentIntent(profile.userId, pack.productId);

          // NOTE: awarding items must happen ONLY after server confirms payment
          // (keep empty for now; will be implemented in backend phase)

          setConfirmModal(null);
        } catch (e) {
          console.error('Purchase failed', e);
          alert(t.purchase_failed || 'Purchase failed. Please try again later.');
        }
      }
    });
  };

  const handleBuyBoost = (type: string) => {
    soundService.playButtonClick();
    const key = type as keyof typeof STORE_PRICES.ITEMS;
    const cost = STORE_PRICES.ITEMS[key];

    if (profile.stars < cost) {
      alert(t.not_enough_stars);
      return;
    }

    setConfirmModal({
      item: t[`boost_${key}`] || key,
      cost: `${cost} 🥚`, // Cost in Blue Eggs
      onConfirm: () => {
        const updatedInventory = { ...profile.inventory };
        const boostKey = key as 'freeze' | 'shield' | 'magnet' | 'refill_hearts';
        updatedInventory[boostKey] = (updatedInventory[boostKey] || 0) + 1;
        const updated = StorageService.updateProfile({
          stars: profile.stars - cost,
          inventory: updatedInventory
        });
        setProfile(updated);
        gameBridge.emit('UI_STARS', updated.stars);
        gameBridge.emit('UI_INVENTORY', updated.inventory);
        gameBridge.notifyProfileUpdate();
        setConfirmModal(null);
      }
    });
  };

  const handleBuySkin = (category: 'tail' | 'wings' | 'legs' | 'ironBody' | 'crystalBody') => {
    soundService.playButtonClick();

    let cost = 0;
    let name = '';

    // Calculate cost and name based on next tier
    if (category === 'tail') {
      const nextTier = profile.skins.tailTier + 1;
      if (nextTier > 3) return;
      cost = STORE_PRICES.SKINS.TAIL[nextTier - 1];
      name = `${t.skin_tail} (${t.tier} ${nextTier})`;
    } else if (category === 'wings') {
      const nextTier = profile.skins.wingsTier + 1;
      if (nextTier > 3) return;
      cost = STORE_PRICES.SKINS.WINGS[nextTier - 1];
      name = `${t.skin_wings} (${t.tier} ${nextTier})`;
    } else if (category === 'legs') {
      const nextTier = profile.skins.legsTier + 1;
      if (nextTier > 2) return;
      cost = STORE_PRICES.SKINS.LEGS[nextTier - 1];
      name = `${t.skin_legs} (${t.tier} ${nextTier})`;
    } else if (category === 'ironBody') {
      if (profile.skins.ironBodyOwned) return;
      cost = STORE_PRICES.SKINS.IRON_BODY;
      name = t.skin_iron_body;
    } else if (category === 'crystalBody') {
      if (profile.skins.crystalBodyOwned) return;
      cost = STORE_PRICES.SKINS.CRYSTAL_BODY;
      name = t.skin_crystal_body;
    }

    if (profile.scales < cost) return;

    setConfirmModal({
      item: name,
      cost: `${cost} 🐉`,
      onConfirm: () => {
        const updatedProfile = { ...profile };

        if (category === 'tail') {
          updatedProfile.scales -= cost;
          updatedProfile.skins.tailTier++;
        } else if (category === 'wings') {
          updatedProfile.scales -= cost;
          updatedProfile.skins.wingsTier++;
        } else if (category === 'legs') {
          updatedProfile.scales -= cost;
          updatedProfile.skins.legsTier++;
        } else if (category === 'ironBody') {
          updatedProfile.scales -= cost;
          updatedProfile.skins.ironBodyOwned = true;
        } else if (category === 'crystalBody') {
          updatedProfile.scales -= cost;
          updatedProfile.skins.crystalBodyOwned = true;
        }

        StorageService.saveProfile(updatedProfile);
        setProfile(updatedProfile);
        gameBridge.emit('UI_SCALES', updatedProfile.scales);
        gameBridge.notifyProfileUpdate();
        setConfirmModal(null);
      }
    });
  };

  const handleExchange = () => {
    soundService.playButtonClick();
    if (profile.stars >= 1000) {
      setConfirmModal({
        item: '50 🐉',
        cost: '1000 🥚', // Cost in Blue Eggs
        onConfirm: () => {
          const updated = StorageService.updateProfile({
            stars: profile.stars - 1000,
            scales: profile.scales + 50
          });
          setProfile(updated);
          gameBridge.emit('UI_STARS', updated.stars);
          gameBridge.emit('UI_SCALES', updated.scales);
          gameBridge.notifyProfileUpdate();
          setConfirmModal(null);
        }
      });
    } else {
      alert(t.need_more_stars);
    }
  };

  const BOOST_ICONS: Record<string, string> = { freeze: '❄️', shield: '🛡️', magnet: '🧲', refill_hearts: '❤️' };

  // Blue Eggs (main currency) icon (served from public/game/eggs)
  const BLUE_EGG_ICON_SRC = '/game/eggs/egg_blue.png';
  const BlueEggIcon = ({ size }: { size: string }) => (
    <img
      src={BLUE_EGG_ICON_SRC}
      alt="Blue Egg"
      style={{ width: size, height: size, imageRendering: 'auto', display: 'block' }}
    />
  );

  // Task B & D: Mobile optimization
  const pSize = isMobileLandscape ? '10px' : '24px';
  const hSize = isMobileLandscape ? '18px' : '28px';
  const itemPad = isMobileLandscape ? '6px 10px' : '14px 20px';
  const itemGap = isMobileLandscape ? '4px' : '10px';

  const iconSize = isMobileLandscape ? '16px' : '24px';
  const textSize = isMobileLandscape ? '11px' : '14px';

  // ~30% smaller targets
  const modalWidth = isMobileLandscape ? '80vw' : '95%';
  const modalMaxWidth = isMobileLandscape ? '380px' : '520px';
  const modalMaxHeight = isMobileLandscape ? '85vh' : '90vh';

  const renderSkinChain = (name: string, tier: number, max: number, category: any) => {
    const nameLower = name.toLowerCase();
    const chainDesc = t[`skin_${nameLower}_desc`] || '';
    const chainTitle = t[`skin_${nameLower}`] || name.toUpperCase();

    return (
      <div
        style={{
          marginBottom: isMobileLandscape ? 8 : 20,
          background: '#334155',
          padding: isMobileLandscape ? '8px' : '15px',
          borderRadius: 12,
          border: '1px solid #475569'
        }}
      >
        <h4
          style={{
            margin: '0 0 2px 0',
            fontSize: isMobileLandscape ? '12px' : '16px',
            color: '#facc15',
            fontWeight: 900
          }}
        >
          {chainTitle}
        </h4>
        <p style={{ margin: '0 0 6px 0', fontSize: '10px', color: '#94a3b8', lineHeight: '1.2' }}>
          {chainDesc}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: itemGap }}>
          {[...Array(max)].map((_, i) => {
            const currentIdx = i + 1;
            const cost = category[i];
            const isOwned = tier >= currentIdx;
            const isLocked = currentIdx > tier + 1;
            const canBuy = currentIdx === tier + 1 && profile.scales >= cost;
            const tierDesc = t[`${nameLower}_tier_${currentIdx}`] || '';

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  background: '#1e293b',
                  padding: isMobileLandscape ? '4px' : '10px',
                  borderRadius: 8,
                  border: isOwned ? '1px solid #10b981' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: textSize,
                      fontWeight: 'bold',
                      color: isOwned ? '#10b981' : isLocked ? '#64748b' : '#fff'
                    }}
                  >
                    {t.tier} {currentIdx} {isOwned ? '✓' : ''}
                  </span>
                  {isOwned ? (
                    <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '10px' }}>{t.owned}</span>
                  ) : (
                    <button
                      disabled={isLocked || !canBuy}
                      onClick={() => handleBuySkin(nameLower as any)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: isLocked ? '#475569' : canBuy ? '#fbc02d' : '#475569',
                        color: isLocked ? '#94a3b8' : '#000',
                        fontWeight: 'bold',
                        cursor: canBuy ? 'pointer' : 'default',
                        fontSize: '10px'
                      }}
                    >
                      {cost} 🐉 {isLocked ? `(${t.locked})` : ''}
                    </button>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '10px',
                    color: isOwned ? '#cbd5e1' : '#94a3b8',
                    opacity: isLocked ? 0.6 : 1
                  }}
                >
                  {tierDesc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 30000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        direction: profile.language === 'ar' ? 'rtl' : 'ltr'
      }}
    >
      <div
        style={{
          background: '#1e293b',
          color: '#fff',
          width: modalWidth,
          maxWidth: modalMaxWidth,
          maxHeight: modalMaxHeight,
          padding: pSize,
          borderRadius: 24,
          border: '4px solid #fbc02d',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative'
        }}
      >
        <h2 style={{ textAlign: 'center', color: '#fbc02d', marginBottom: isMobileLandscape ? 4 : 15, fontSize: hSize, fontWeight: 900, letterSpacing: '1px' }}>
          {t.store_title}
        </h2>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: isMobileLandscape ? 8 : 20 }}>
          <div style={{ background: '#0f172a', padding: '4px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #334155' }}>
            <BlueEggIcon size={isMobileLandscape ? '16px' : '20px'} />
            <span style={{ fontWeight: 900, color: '#38bdf8', fontSize: textSize }}>{profile.stars}</span>
          </div>
          <div style={{ background: '#0f172a', padding: '4px 10px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #334155' }}>
            <span style={{ fontSize: isMobileLandscape ? '14px' : '16px' }}>🐉</span>
            <span style={{ fontWeight: 900, color: '#10b981', fontSize: textSize }}>{profile.scales}</span>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '2px solid #334155', marginBottom: isMobileLandscape ? 8 : 20 }}>
          {['stars', 'boosts', 'skins'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                soundService.playButtonClick();
                setActiveTab(tab as any);
              }}
              style={{
                flex: 1,
                padding: isMobileLandscape ? '6px' : '12px',
                border: 'none',
                background: 'transparent',
                color: activeTab === tab ? '#fbc02d' : '#64748b',
                fontWeight: 900,
                fontSize: textSize,
                borderBottom: activeTab === tab ? '4px solid #fbc02d' : 'none',
                cursor: 'pointer',
                transition: 'color 0.2s',
                textTransform: 'uppercase'
              }}
            >
              {t[`tab_${tab}`] || tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8, marginBottom: 8 }}>
          {activeTab === 'stars' && (
            <div>
              <h3 style={{ fontSize: textSize, color: '#94a3b8', marginBottom: 6, fontWeight: 700 }}>{t.refill_stars}</h3>
              {STORE_PRICES.DIAMOND_PACKS.map((p) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#334155', padding: itemPad, marginBottom: itemGap, borderRadius: 12, border: '1px solid #475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BlueEggIcon size={iconSize} />
                    <span style={{ fontWeight: 900, fontSize: isMobileLandscape ? '14px' : '18px' }}>{p.amount}</span>
                  </div>
                  <button
                    onClick={() => handleBuyPack(p)}
                    style={{
                      background: '#fbc02d',
                      border: 'none',
                      color: '#000',
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontWeight: 900,
                      cursor: 'pointer',
                      fontSize: textSize,
                      boxShadow: '0 2px 0 #b45309'
                    }}
                  >
                    {p.costXtr} ⭐
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'boosts' && (
            <div>
              <h3 style={{ fontSize: textSize, color: '#94a3b8', marginBottom: 6, fontWeight: 700 }}>{t.consumables}</h3>
              {Object.entries(STORE_PRICES.ITEMS).map(([key, cost]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#334155', padding: itemPad, marginBottom: itemGap, borderRadius: 12, border: '1px solid #475569' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: iconSize }}>{BOOST_ICONS[key] || '⚡'}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: textSize, letterSpacing: '0.5px' }}>{t[`boost_${key}`]}</span>
                      <span style={{ fontSize: '10px', color: '#38bdf8' }}>
                        {t.owned_cnt}
                        {profile.inventory[key as keyof typeof profile.inventory] || 0}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBuyBoost(key)}
                    style={{
                      background: '#0ea5e9',
                      border: 'none',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: 8,
                      fontWeight: 900,
                      cursor: 'pointer',
                      fontSize: textSize,
                      boxShadow: '0 2px 0 #0369a1'
                    }}
                  >
                    {cost} 🥚
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'skins' && (
            <div>
              <div style={{ background: 'linear-gradient(to right, #1e293b, #0f172a)', padding: '8px', borderRadius: 12, border: '2px dashed #facc15', marginBottom: 15, textAlign: 'center' }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: textSize, color: '#facc15', fontWeight: 900 }}>{t.currency_exchange}</h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: textSize, fontWeight: 900 }}>1000 🥚</span>
                  <span style={{ fontSize: '14px' }}>➜</span>
                  <span style={{ fontSize: textSize, fontWeight: 900, color: '#10b981' }}>50 🐉</span>
                </div>
                <button
                  onClick={handleExchange}
                  disabled={profile.stars < 1000}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: 8,
                    background: profile.stars >= 1000 ? '#fbc02d' : '#475569',
                    color: profile.stars >= 1000 ? '#000' : '#94a3b8',
                    border: 'none',
                    fontWeight: 900,
                    cursor: profile.stars >= 1000 ? 'pointer' : 'default',
                    boxShadow: profile.stars >= 1000 ? '0 3px 0 #b45309' : 'none',
                    fontSize: textSize
                  }}
                >
                  {t.exchange_btn}
                </button>
              </div>

              {renderSkinChain('Tail', profile.skins.tailTier, 3, STORE_PRICES.SKINS.TAIL)}
              {renderSkinChain('Wings', profile.skins.wingsTier, 3, STORE_PRICES.SKINS.WINGS)}
              {renderSkinChain('Legs', profile.skins.legsTier, 2, STORE_PRICES.SKINS.LEGS)}

              <div style={{ background: '#334155', padding: isMobileLandscape ? '10px' : '15px', borderRadius: 12, border: '1px solid #475569', marginBottom: 15 }}>
                <h4 style={{ margin: '0 0 4px 0', fontSize: isMobileLandscape ? '12px' : '16px', color: '#facc15', fontWeight: 900 }}>{t.body_mods}</h4>
                <p style={{ margin: '0 0 10px 0', fontSize: '10px', color: '#94a3b8' }}>{t.body_mods_desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Iron Body */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{t.skin_iron_body}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{t.iron_body_desc}</span>
                    </div>
                    {profile.skins.ironBodyOwned ? (
                      <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '11px' }}>{t.owned}</span>
                    ) : (
                      <button
                        onClick={() => handleBuySkin('ironBody')}
                        disabled={profile.scales < STORE_PRICES.SKINS.IRON_BODY}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 6,
                          background: profile.scales >= STORE_PRICES.SKINS.IRON_BODY ? '#fbc02d' : '#475569',
                          border: 'none',
                          fontWeight: 900,
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: profile.scales >= STORE_PRICES.SKINS.IRON_BODY ? '#000' : '#94a3b8'
                        }}
                      >
                        {STORE_PRICES.SKINS.IRON_BODY} 🐉
                      </button>
                    )}
                  </div>


                  {/* Crystal Body */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '8px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{t.skin_crystal_body}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{t.crystal_body_desc}</span>
                    </div>
                    {profile.skins.crystalBodyOwned ? (
                      <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '11px' }}>{t.owned}</span>
                    ) : (
                      <button
                        onClick={() => handleBuySkin('crystalBody')}
                        disabled={profile.scales < STORE_PRICES.SKINS.CRYSTAL_BODY}
                        style={{
                          padding: '4px 12px',
                          borderRadius: 6,
                          background: profile.scales >= STORE_PRICES.SKINS.CRYSTAL_BODY ? '#fbc02d' : '#475569',
                          border: 'none',
                          fontWeight: 900,
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: profile.scales >= STORE_PRICES.SKINS.CRYSTAL_BODY ? '#000' : '#94a3b8'
                        }}
                      >
                        {STORE_PRICES.SKINS.CRYSTAL_BODY} 🐉
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            soundService.playButtonClick();
            onClose();
          }}
          style={{
            marginTop: 0,
            width: '100%',
            padding: isMobileLandscape ? '10px' : '16px',
            borderRadius: 14,
            background: '#0f172a',
            color: '#fbc02d',
            border: 'none',
            fontWeight: 'bold',
            cursor: 'pointer',
            borderTop: '1px solid #475569',
            fontSize: isMobileLandscape ? '11px' : '16px'
          }}
        >
          {t.close}
        </button>

        {/* Confirmation Overlay */}
        {confirmModal && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 24, padding: 20 }}>
            <div style={{ background: '#0f172a', border: '2px solid #facc15', borderRadius: 16, padding: '24px 16px', width: '100%', maxWidth: 320, textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#facc15', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '1px' }}>CONFIRM PURCHASE</h3>
              <div style={{ marginBottom: '20px', color: '#fff' }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#94a3b8' }}>Item:</p>
                <p style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 'bold' }}>{confirmModal.item}</p>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#94a3b8' }}>Cost:</p>
                <p style={{ margin: '0', fontSize: '20px', fontWeight: 'bold', color: '#facc15' }}>{confirmModal.cost}</p>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    soundService.playButtonClick();
                    confirmModal.onConfirm();
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#10b981', color: '#000', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}
                >
                  {t.ok}
                </button>
                <button
                  onClick={() => {
                    soundService.playButtonClick();
                    setConfirmModal(null);
                  }}
                  style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: '#475569', color: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '14px' }}
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
