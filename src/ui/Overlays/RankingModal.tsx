import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiClient } from '../../net/apiClient';
import { LeaderboardEntry, LeaderboardType } from '../../net/types';
import { soundService } from '../../app/sound';

interface RankingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RankingModal: React.FC<RankingModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('solo');
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkLayout = () => {
      setIsMobileLandscape(window.innerWidth < 900 && window.innerHeight < 500);
    };
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  useEffect(() => {
    if (isOpen) {
        fetchData(activeTab);
    }
  }, [isOpen, activeTab]);

  const fetchData = (type: LeaderboardType) => {
      setLoading(true);
      ApiClient.getLeaderboard(type)
        .then(res => {
            setData(res);
            setLoading(false);
        })
        .catch(err => {
            console.error("Failed to fetch leaderboard", err);
            setLoading(false);
        });
  };

  const handleTabChange = (tab: LeaderboardType) => {
      soundService.playButtonClick();
      setActiveTab(tab);
  };

  if (!isOpen) return null;

  const modalWidth = isMobileLandscape ? '85vw' : '80%';
  const modalMaxWidth = isMobileLandscape ? '500px' : '300px';
  const padding = isMobileLandscape ? '16px' : '24px';

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-slate-800 border-2 border-blue-500 rounded-lg relative" style={{ width: modalWidth, maxWidth: modalMaxWidth, padding }}>
        <h2 className={`font-bold text-blue-400 text-center mb-3 uppercase tracking-tighter ${isMobileLandscape ? 'text-sm' : 'text-xl'}`}>Leaderboard</h2>
        
        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '10px', background: '#0f172a', borderRadius: '8px', padding: '2px' }}>
            <button onClick={() => handleTabChange('solo')} style={{ flex: 1, padding: '4px', background: activeTab === 'solo' ? '#3b82f6' : 'transparent', color: activeTab === 'solo' ? '#fff' : '#64748b', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>SOLO</button>
            <button onClick={() => handleTabChange('duo')} style={{ flex: 1, padding: '4px', background: activeTab === 'duo' ? '#3b82f6' : 'transparent', color: activeTab === 'duo' ? '#fff' : '#64748b', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>DUO</button>
            <button onClick={() => handleTabChange('solo_bot')} style={{ flex: 1, padding: '4px', background: activeTab === 'solo_bot' ? '#3b82f6' : 'transparent', color: activeTab === 'solo_bot' ? '#fff' : '#64748b', border: 'none', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>+BOT</button>
        </div>

        <div className={`bg-slate-900 rounded p-2 mb-3 overflow-y-auto ${isMobileLandscape ? 'h-32' : 'h-48'}`}>
            {loading ? (
                <div className="text-gray-500 text-center py-10 text-xs">Loading...</div>
            ) : data.length > 0 ? (
                data.map((entry, idx) => (
                    <div key={idx} className={`flex justify-between text-white border-b border-slate-700 py-2 ${isMobileLandscape ? 'text-[10px]' : 'text-sm'}`}>
                        <span className="text-gray-400 w-8">#{entry.rank}</span>
                        <span className="flex-1 font-bold truncate pr-2">{entry.name}</span>
                        <span className="font-mono text-yellow-400">{entry.score}</span>
                    </div>
                ))
            ) : (
                <div className="text-gray-500 text-center py-10 text-xs">No records yet.</div>
            )}
        </div>

        <button onClick={() => { soundService.playButtonClick(); onClose(); }} className={`w-full bg-slate-600 hover:bg-slate-500 text-white font-bold rounded transition-colors ${isMobileLandscape ? 'py-1 text-xs' : 'py-2 text-base'}`}>
            CLOSE
        </button>
      </div>
    </div>,
    document.body
  );
};