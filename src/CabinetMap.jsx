// src/CabinetMap.jsx
import React from "react";

// 獨立的地圖組件，使用圖片而非SVG
function CabinetMap({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9000]" onClick={onClose}>
      <div 
        className="bg-gray-900 p-4 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto border border-gray-700"
        onClick={e => e.stopPropagation()} // 防止點擊內容區域時關閉
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">器材居住地圖</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div className="p-2 rounded border border-gray-800 bg-gray-800">
          {/* 使用提供的圖片，並套用濾鏡使其變為深色底白字 */}
          <div className="relative">
            <img 
              src="/cabinet-map.png" 
              alt="器材櫃位地圖" 
              className="w-full h-auto max-w-full invert brightness-[90%] contrast-[110%]" 
            />
            {/* 可選：添加一個深色半透明的覆蓋層 */}
            <div className="absolute inset-0 bg-gray-900/20 pointer-events-none"></div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-800 rounded text-gray-200 text-sm border border-gray-700">
        <p className="font-medium mb-2">〔主要使用區〕</p>
        <p>- Z 區 -</p>
        <p>近期演出 preset 放置區。最近常用的先找這裡。</p>
        <p>- B1、D1、E1 區 -</p>
        <p>存放所有可替換使用的硬殼、飛行箱。</p>
        <p>- A1、B1、D1 區 -</p>
        <p>箱子與袋子位置固定，內容物以束帶標示為主。</p>
        <p>更換內容物請ㄧ併更換束帶。空箱以紅色束帶標示。</p>
        <p>- H2 區 -</p>
        <p>DI與吉他配件類。</p>
        <p>- G1 區 -</p>
        <p>器材整理相關雜項。</p>
        </div>
      </div>
    </div>
  );
}

export default CabinetMap;
