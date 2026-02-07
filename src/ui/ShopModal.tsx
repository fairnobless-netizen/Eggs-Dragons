import React from 'react';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  stars: number;
}

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, stars }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border-2 border-yellow-500 rounded-lg w-full max-w-sm p-6 relative shadow-[0_0_20px_rgba(234,179,8,0.5)]">
        
        <h2 className="text-2xl font-bold text-yellow-500 text-center mb-6 uppercase tracking-wider">
          Dragon Shop
        </h2>

        {/* Stars Balance */}
        <div className="flex justify-center items-center gap-2 mb-6 bg-slate-900 p-2 rounded">
          <span className="text-xl">⭐</span>
          <span className="text-white font-mono text-xl">{stars} Stars</span>
        </div>

        {/* Shop Items (Placeholders) */}
        <div className="space-y-3">
          <ShopItem name="Extra Life" cost={50} />
          <ShopItem name="Golden Skin" cost={500} />
          <ShopItem name="Time Freeze" cost={100} />
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="mt-6 w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded uppercase tracking-wider"
        >
          Close
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          * Telegram Stars integration pending
        </p>
      </div>
    </div>
  );
};

const ShopItem: React.FC<{name: string, cost: number}> = ({ name, cost }) => (
  <div className="flex justify-between items-center bg-slate-700 p-3 rounded hover:bg-slate-600 transition-colors cursor-pointer">
    <span className="text-white font-bold">{name}</span>
    <button className="bg-yellow-600 px-3 py-1 rounded text-sm text-white font-mono">
      {cost} ⭐
    </button>
  </div>
);