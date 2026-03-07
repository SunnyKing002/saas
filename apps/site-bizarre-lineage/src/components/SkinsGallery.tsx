import React, { useState, useMemo } from 'react';
import { Search, X, Maximize2, Shield, Star, Info } from 'lucide-react';
import './SkinsGallery.css';

export interface SkinItem {
  filename: string;
  name: string;
  stand: string;
  rarity?: string;
  description?: string;
}

interface SkinsGalleryProps {
  initialSkins: SkinItem[];
}

// Helper to assign mock rarity based on names for better UX
const assignMockData = (skins: SkinItem[]) => {
  return skins.map(skin => {
    const nameLower = skin.name.toLowerCase();
    let rarity = "Epic";
    let desc = `A rare cosmetic variant for ${skin.stand}.`;

    if (nameLower.includes("deimos") || nameLower.includes("galaxy") || nameLower.includes("ultimate")) {
      rarity = "Mythical";
      desc = `An ultra-rare Mythical cosmetic for ${skin.stand}, featuring custom aura effects and a complete model overhaul.`;
    } else if (nameLower.includes("kawaii") || nameLower.includes("esdeath") || nameLower.includes("goku")) {
      rarity = "Legendary";
      desc = `A highly sought-after Legendary skin for ${skin.stand} that radically changes its appearance.`;
    }

    return { ...skin, rarity, description: desc };
  });
};

export default function SkinsGallery({ initialSkins }: SkinsGalleryProps) {
  const [search, setSearch] = useState("");
  const [selectedSkin, setSelectedSkin] = useState<SkinItem | null>(null);

  const enhancedSkins = useMemo(() => assignMockData(initialSkins), [initialSkins]);

  const filteredSkins = useMemo(() => {
    return enhancedSkins.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.stand.toLowerCase().includes(search.toLowerCase())
    );
  }, [enhancedSkins, search]);

  const getRarityClass = (rarity?: string) => {
    switch (rarity) {
      case 'Mythical': return 'rarity-mythical';
      case 'Legendary': return 'rarity-legendary';
      default: return 'rarity-epic';
    }
  };

  return (
    <div className="sg-container">
      {/* Controls Bar */}
      <div className="sg-controls">
        <div className="sg-search-wrap">
          <Search className="sg-search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by Skin or Base Stand name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sg-search-input"
          />
        </div>
        <div className="sg-results-count">
          Showing <strong>{filteredSkins.length}</strong> skins
        </div>
      </div>

      {/* Grid */}
      {filteredSkins.length > 0 ? (
        <div className="sg-grid">
          {filteredSkins.map((skin, i) => (
            <div
              key={skin.filename}
              className="sg-card"
              onClick={() => setSelectedSkin(skin)}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="sg-image-wrap">
                <img
                  src={`/bizarre/skins/${skin.filename}`}
                  alt={skin.name}
                  loading="lazy"
                  className="sg-image"
                />
                <div className="sg-image-gradient" />

                {/* View Overlay */}
                <div className="sg-overlay-view">
                  <div className="sg-view-btn">
                    <Maximize2 size={16} /> {skin.name} Skin
                  </div>
                </div>
              </div>

              <div className="sg-card-info">
                <div className={`sg-rarity-badge ${getRarityClass(skin.rarity)}`}>
                  {skin.rarity}
                </div>
                <h3 className="sg-card-title">{skin.name}</h3>
                <p className="sg-card-subtitle">
                  <Shield size={14} /> {skin.stand}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="sg-empty-state">
          <Search size={48} className="sg-empty-icon" />
          <h3 className="sg-empty-title">No Skins Found</h3>
          <p className="sg-empty-desc">Try adjusting your search terms.</p>
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedSkin && (
        <div className="sg-modal-wrapper">
          <div className="sg-modal-backdrop" onClick={() => setSelectedSkin(null)} />

          <div className="sg-modal-content">

            <button
              onClick={() => setSelectedSkin(null)}
              className="sg-modal-close"
              aria-label="Close"
            >
              <X size={24} />
            </button>

            {/* Image Side */}
            <div className="sg-modal-image-col">
              <img
                src={`/bizarre/skins/${selectedSkin.filename}`}
                alt={selectedSkin.name}
                className="sg-modal-image"
              />
            </div>

            {/* Info Side */}
            <div className="sg-modal-info-col">
              <div>
                <span className={`sg-modal-badge ${getRarityClass(selectedSkin.rarity)}`}>
                  {selectedSkin.rarity}
                </span>
              </div>

              <h2 className="sg-modal-title">
                {selectedSkin.name}
              </h2>

              <div className="sg-modal-stand">
                <Shield size={16} /> Base Stand: <strong>{selectedSkin.stand}</strong>
              </div>

              <div className="sg-modal-details">
                <h4 className="sg-modal-section-title">
                  <Info size={14} /> Cosmetic Details
                </h4>
                <p className="sg-modal-desc">
                  {selectedSkin.description}
                </p>

                <div className="sg-modal-alert">
                  <Star className="sg-alert-icon" size={20} />
                  <div>
                    <h4 className="sg-alert-title">Visual Only</h4>
                    <p className="sg-alert-text">Like all skins, this variant offers no statistical advantage in PvP/PvE combat. Hitboxes remain identical to the base Stand.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
