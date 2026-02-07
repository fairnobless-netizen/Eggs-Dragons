import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StorageService, PlayerProfile } from '../../app/storage';
import { TELEGRAM_DEEP_LINK_BASE } from '../../app/config';
import { soundService } from '../../app/sound';
import { I18N } from '../../app/i18n';
import { PlayersRepository } from '../../net/playersRepository';
import { FriendsRepository, FriendEdge } from '../../net/friendsRepository';
import { PublicProfile } from '../../net/types';
import { dragonBot } from '../../game/bot/DragonBotController';
import { duoController } from '../../game/bot/DuoController';
import { gameBridge } from '../../app/gameBridge';

// MP: Multiplayer modal skeleton with tabs
interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'referrals' | 'search' | 'friends'>('referrals');
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>(StorageService.getProfile());
  
  // MP: Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // MP: Friends state
  const [friendEdges, setFriendEdges] = useState<FriendEdge[]>([]);

  const t = I18N[profile.language] || I18N.en;

  useEffect(() => {
    if (isOpen) {
        setProfile(StorageService.getProfile());
        refreshFriends();
    }
  }, [isOpen, activeTab]); 

  const refreshFriends = () => {
    setFriendEdges(FriendsRepository.getFriendEdges());
  };

  // MP: referral link generation
  const refPayload = "ref_" + profile.userId;
  const refLink = TELEGRAM_DEEP_LINK_BASE + encodeURIComponent(refPayload);

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    soundService.playButtonClick();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTabChange = (tab: 'referrals' | 'search' | 'friends') => {
    soundService.playButtonClick();
    setActiveTab(tab);
  };

  // MP: Search Handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchQuery(val);
      
      if (val.length >= 2) {
          setIsSearching(true);
          PlayersRepository.searchPlayers(val).then(res => {
              setSearchResults(res);
              setIsSearching(false);
          });
      } else {
          setSearchResults([]);
      }
  };

  // MP: Add Friend Handler
  const handleAddFriend = (user: PublicProfile) => {
      soundService.playButtonClick();
      PlayersRepository.sendFriendRequest(user);
      // Switch to Friends tab to show pending
      setActiveTab('friends');
  };

  // MP: Friend Actions
  const handleAccept = (edge: FriendEdge) => {
      soundService.playButtonClick();
      FriendsRepository.acceptRequest(edge.peerId, edge.peerName);
      refreshFriends();
  };

  const handleDecline = (edge: FriendEdge) => {
      soundService.playButtonClick();
      FriendsRepository.declineRequest(edge.peerId);
      refreshFriends();
  };

  // MP: Mock Incoming Request
  const handleSimulateRequest = () => {
      soundService.playButtonClick();
      const randomId = "u_" + Math.floor(Math.random() * 1000);
      FriendsRepository.mockReceiveRequest(randomId, "Guest_" + Math.floor(Math.random() * 100));
      refreshFriends();
  };

  const handleBotMatch = () => {
      soundService.playButtonClick();
      dragonBot.startMatch();
      onClose();
      gameBridge.restartGame(); 
      setTimeout(() => gameBridge.startGame(), 100);
  };

  const handleDuoMatch = (friendName: string) => {
      soundService.playButtonClick();
      duoController.startMatch(friendName);
      onClose();
      gameBridge.restartGame();
      setTimeout(() => gameBridge.startGame(), 100);
  };

  // MP: fix init state - modal default closed
  if (!isOpen) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
      <div style={{ background: '#1e293b', width: '95%', maxWidth: '420px', borderRadius: '24px', border: '2px solid #334155', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#fff', maxHeight: '80vh' }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #334155', textAlign: 'center', position: 'relative' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#facc15' }}>{t.mp_title}</h2>
            {/* MP: close multiplayer modal */}
            <button 
              onClick={() => { soundService.playButtonClick(); onClose(); }} 
              style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '24px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#0f172a' }}>
          {['referrals', 'search', 'friends'].map(tab => (
            <button 
              key={tab}
              onClick={() => handleTabChange(tab as any)}
              style={{ 
                flex: 1, padding: '15px', border: 'none', background: activeTab === tab ? '#1e293b' : 'transparent',
                color: activeTab === tab ? '#38bdf8' : '#64748b', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {t[`mp_${tab}`]}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div style={{ padding: '20px', minHeight: '300px', overflowY: 'auto' }}>
          {activeTab === 'referrals' && (
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#38bdf8' }}>{t.mp_referrals}</h3>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                Invite friends to earn +100 Diamond Eggs & +20 Scales!
              </p>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  readOnly 
                  value={refLink} 
                  style={{ flex: 1, background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '12px' }}
                />
                <button 
                  onClick={handleCopy}
                  style={{ background: copied ? '#22c55e' : '#facc15', color: '#000', border: 'none', borderRadius: '8px', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {copied ? t.copied : t.copy}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'search' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <input 
                  placeholder="Search by username..." 
                  value={searchQuery}
                  onChange={handleSearchChange}
                  style={{ 
                      width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #475569', 
                      background: '#0f172a', color: '#fff', outline: 'none' 
                  }}
               />
               
               {isSearching && <div style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>Searching...</div>}
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {searchResults.map(user => {
                       const isSelf = user.id === profile.userId;
                       const isAdded = profile.friendRequests?.outgoing.some(r => r.id === user.id) || profile.friends?.some(f => f.id === user.id);

                       return (
                           <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#334155', padding: '10px', borderRadius: '10px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                   <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                       {user.username.charAt(0).toUpperCase()}
                                   </div>
                                   <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{user.username}</span>
                               </div>
                               {!isSelf && !isAdded && (
                                   <button 
                                      onClick={() => handleAddFriend(user)}
                                      style={{ background: '#22c55e', border: 'none', borderRadius: '6px', padding: '4px 12px', color: '#000', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                                   >
                                      ADD
                                   </button>
                               )}
                               {isAdded && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sent</span>}
                           </div>
                       );
                   })}
                   {searchQuery.length > 2 && searchResults.length === 0 && !isSearching && (
                       <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', marginTop: '20px' }}>No players found.</div>
                   )}
               </div>
            </div>
          )}

          {activeTab === 'friends' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
               {/* Friends List Render */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {friendEdges.length === 0 && (
                       <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', border: '1px dashed #475569', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                           <span>No friends yet. Search to add some!</span>
                           <button onClick={handleSimulateRequest} style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}>
                               {t.mp_debug_req}
                           </button>
                       </div>
                   )}
                   
                   {friendEdges.map(edge => {
                       let statusNode = null;
                       const isBot = edge.isBot || edge.peerId === 'dragon-bot';

                       if (edge.status === 'pending_out') {
                           statusNode = <span style={{ fontSize: '10px', color: '#facc15', border: '1px solid #facc15', padding: '2px 6px', borderRadius: '4px' }}>{t.mp_outgoing}</span>;
                       } else if (edge.status === 'pending_in') {
                           statusNode = (
                               <div style={{ display: 'flex', gap: '4px' }}>
                                   <button onClick={() => handleAccept(edge)} style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{t.mp_accept}</button>
                                   <button onClick={() => handleDecline(edge)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>{t.mp_decline}</button>
                               </div>
                           );
                       } else if (edge.status === 'accepted') {
                           statusNode = (
                               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                   <button 
                                     onClick={() => isBot ? handleBotMatch() : handleDuoMatch(edge.peerName)}
                                     style={{ 
                                       background: isBot ? '#2563eb' : '#3b82f6', 
                                       color: '#fff', 
                                       border: 'none', 
                                       borderRadius: '4px', 
                                       padding: '4px 8px', 
                                       fontSize: '10px', 
                                       fontWeight: 'bold', 
                                       cursor: 'pointer' 
                                     }}
                                   >
                                     {t.mp_play}
                                   </button>
                               </div>
                           );
                       }

                       return (
                           <div key={edge.peerId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#334155', padding: '10px', borderRadius: '10px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                   <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: edge.status === 'accepted' ? '#10b981' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: edge.status === 'accepted' ? '#fff' : '#94a3b8' }}>
                                       {isBot ? '🤖' : edge.peerName.charAt(0).toUpperCase()}
                                   </div>
                                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                                       <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#fff' }}>{edge.peerName}</span>
                                       {edge.status === 'pending_in' && <span style={{ fontSize: '10px', color: '#38bdf8' }}>{t.mp_incoming}</span>}
                                   </div>
                               </div>
                               {statusNode}
                           </div>
                       );
                   })}
               </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
            {/* MP: close multiplayer modal */}
            <button onClick={() => { soundService.playButtonClick(); onClose(); }} style={{ width: '100%', padding: '15px', background: '#334155', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
            {t.close}
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};