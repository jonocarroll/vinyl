import React, { useState, useEffect } from 'react';
import './VinylStack.css';

function VinylStack({ vinyls, selectedVinylIndex }) {
  const [visibleVinyls, setVisibleVinyls] = useState([]);

  useEffect(() => {
    const totalVinyls = vinyls.length;
    const visible = [];
    
    // Show at most 5 vinyls centered around the selected one
    for (let offset = -2; offset <= 2; offset++) {
      let position = (selectedVinylIndex + offset + totalVinyls) % totalVinyls;
      visible.push({
        index: position,
        vinyl: vinyls[position],
        offset
      });
    }
    
    setVisibleVinyls(visible);
  }, [selectedVinylIndex, vinyls]);

  return (
    <div className="vinyl-stack-container">
      <div className="vinyl-stack">
        {visibleVinyls.map(({ vinyl, offset, index }) => (
          <div
            key={vinyl.id}
            className={`vinyl-cover ${index === selectedVinylIndex ? 'selected' : ''} ${getPositionClass(offset)}`}
            style={{ zIndex: getZIndex(offset) }}
          >
            <img 
              src={vinyl.coverImageUrl || '/default-cover.jpg'}
              alt={`${vinyl.artist} - ${vinyl.title}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const getPositionClass = (offset) => {
  switch (offset) {
    case -2: return 'position-far-left';
    case -1: return 'position-left';
    case 0: return 'position-center';
    case 1: return 'position-right';
    case 2: return 'position-far-right';
    default: return '';
  }
};

const getZIndex = (offset) => {
  return 10 - Math.abs(offset);
};

export default VinylStack;