// src/components/VinylStack.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './VinylStack.css';
import DiscogsApiService from '../services/DiscogsApiService';
import VinylDataService from '../services/VinylDataService';

function VinylStack({ vinyls, selectedVinylIndex }) {
  const [coverImages, setCoverImages] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [visibleVinyls, setVisibleVinyls] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(selectedVinylIndex);
  const prevIndexRef = useRef(selectedVinylIndex);
  
  // Initialize the data service
  const dataService = VinylDataService.getInstance();
  
  // Update visible vinyls when selected index changes
  useEffect(() => {
    if (!vinyls || vinyls.length === 0) return;
    
    // Calculate which vinyls should be visible and in what order
    const totalVinyls = vinyls.length;
    const visible = [];
    
    // Show at most 5 vinyls centered around the selected one
    for (let offset = -2; offset <= 2; offset++) {
      // Calculate position with wrapping (for circular navigation)
      let position = (currentIndex + offset + totalVinyls) % totalVinyls;
      
      // Only add valid indices
      if (position >= 0 && position < totalVinyls) {
        visible.push({
          index: position,
          vinyl: vinyls[position],
          offset
        });
      }
    }
    
    setVisibleVinyls(visible);
    prevIndexRef.current = currentIndex;
  }, [currentIndex, vinyls]);
  
  // Load images from localStorage on mount only
  useEffect(() => {
    console.log('Component mounted, loading saved images');
    
    try {
      // Get cover images from service (which handles validation)
      const savedImages = dataService.getCoverImages();
      console.log('Found saved images:', Object.keys(savedImages).length);
      
      // Only update state if we actually have saved images
      if (Object.keys(savedImages).length > 0) {
        setCoverImages(savedImages);
      } else {
        console.log('No valid saved images found');
      }
    } catch (error) {
      console.error('Error loading saved images:', error);
    }
  }, []);
  
  // Fetch cover art when the selected vinyl changes
  useEffect(() => {
    if (!vinyls || vinyls.length === 0 || currentIndex === undefined) {
      return;
    }
    
    const currentVinyl = vinyls[currentIndex];
    if (!currentVinyl) return;
    
    const fetchCover = async () => {
      // Check if we already have this cover
      if (coverImages[currentVinyl.id]) {
        console.log(`Already have cover for ${currentVinyl.id} in state`);
        return;
      }
      
      // Check if we're already loading this cover
      if (loading[currentVinyl.id]) {
        console.log(`Already loading cover for ${currentVinyl.id}`);
        return;
      }
      
      // Clear any previous errors
      if (errors[currentVinyl.id]) {
        setErrors(prev => {
          const updated = {...prev};
          delete updated[currentVinyl.id];
          return updated;
        });
      }
      
      console.log(`Fetching cover for ${currentVinyl.artist} - ${currentVinyl.title}`);
      
      // Set loading state
      setLoading(prev => ({ ...prev, [currentVinyl.id]: true }));
      
      try {
        // Pass the entire vinyl object instead of individual properties
        const coverUrl = await DiscogsApiService.findCoverImage(currentVinyl);
        
        if (coverUrl && dataService.isValidImageUrl(coverUrl)) {
          console.log(`Found valid cover for ${currentVinyl.id}:`, coverUrl);
          
          // Update component state
          setCoverImages(prev => ({
            ...prev,
            [currentVinyl.id]: coverUrl
          }));
          
          // Save to data service
          dataService.saveCoverImage(currentVinyl.id, coverUrl);
        } else {
          console.warn(`Invalid or missing cover URL for ${currentVinyl.id}`);
          setErrors(prev => ({
            ...prev,
            [currentVinyl.id]: 'Could not find a valid cover image'
          }));
        }
      } catch (error) {
        console.error(`Error fetching cover for ${currentVinyl.id}:`, error);
        setErrors(prev => ({
          ...prev,
          [currentVinyl.id]: `Error: ${error.message || 'Failed to load cover'}`
        }));
      } finally {
        setLoading(prev => ({ ...prev, [currentVinyl.id]: false }));
      }
    };
    
    fetchCover();
  }, [currentIndex, vinyls]);
  
  // Function to handle image loading errors
  const handleImageError = (e, vinyl) => {
    console.log(`Image error for ${vinyl.id}: ${e.target.src}`);
    
    // Remove the failing URL from state
    setCoverImages(prev => {
      const updated = {...prev};
      delete updated[vinyl.id];
      return updated;
    });
    
    // Set error state
    setErrors(prev => ({
      ...prev,
      [vinyl.id]: 'Failed to load image'
    }));
    
    // Set fallback image
    e.target.src = 'default-cover.jpg';
  };
  
  // Fetch all covers but prevent race conditions
  const handleFetchAllCovers = useCallback(async () => {
    console.log('Fetching all covers');
    
    // Reset errors
    setErrors({});
    
    // Create a new loading state object for all vinyls
    const newLoadingState = {};
    vinyls.forEach(vinyl => {
      newLoadingState[vinyl.id] = true;
    });
    setLoading(newLoadingState);
    
    // Track successful and failed fetches
    let successCount = 0;
    let failCount = 0;
    
    // Create a copy of current cover images
    const newCoverImages = {...coverImages};
    
    // Loop through all vinyls and fetch covers
    for (const vinyl of vinyls) {
      try {
        // Pass the entire vinyl object here too
        const coverUrl = await DiscogsApiService.findCoverImage(vinyl);
        
        if (coverUrl && dataService.isValidImageUrl(coverUrl)) {
          // Add to our temporary object
          newCoverImages[vinyl.id] = coverUrl;
          
          // Save to data service (but not localStorage yet - that's debounced)
          dataService.saveCoverImage(vinyl.id, coverUrl);
          successCount++;
        } else {
          failCount++;
          setErrors(prev => ({
            ...prev,
            [vinyl.id]: 'Invalid cover URL'
          }));
        }
      } catch (error) {
        console.error(`Error fetching cover for ${vinyl.id}:`, error);
        failCount++;
        setErrors(prev => ({
          ...prev,
          [vinyl.id]: `Error: ${error.message || 'Failed to fetch'}`
        }));
      } finally {
        setLoading(prev => {
          const updated = {...prev};
          updated[vinyl.id] = false;
          return updated;
        });
      }
    }
    
    // Update state once with all the new images
    setCoverImages(newCoverImages);
    
    console.log(`Fetch complete: ${successCount} succeeded, ${failCount} failed`);
  }, [vinyls, coverImages, dataService]);

  // Get fallback image with color based on artist name
  const getFallbackImage = (vinyl) => {
    if (!vinyl || !vinyl.artist) return '/default-cover.jpg';
    
    const firstLetter = vinyl.artist.charAt(0).toLowerCase();
    const charCode = firstLetter.charCodeAt(0);
    
    // Choose from a set of local fallback images based on first letter
    const fallbackIndex = charCode % 5; // Assuming you have 5 different fallback images
    return `/images/fallback-${fallbackIndex}.jpg`;
  };
  
  // Get z-index for stacked vinyl display
  const getZIndex = (offset) => {
    // Center vinyl should have highest z-index
    return 10 - Math.abs(offset);
  };
  
  // Get position class based on offset
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

  // Handle keydown events for left and right arrow keys
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + vinyls.length) % vinyls.length);
      } else if (event.key === 'ArrowRight') {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % vinyls.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [vinyls.length]);

  return (
    <div className="vinyl-stack-container">
      <div className="vinyl-stack" style={{ transform: `translateX(-${currentIndex * 20}%)` }}>
        {visibleVinyls.map(({ vinyl, offset, index }) => {
          const isSelected = index === currentIndex;
          const imageUrl = coverImages[vinyl.id];
          const isLoading = loading[vinyl.id];
          const hasError = errors[vinyl.id];
          
          return (
            <div
              key={vinyl.id}
              className={`vinyl-cover ${isSelected ? 'selected' : ''} ${getPositionClass(offset)}`}
              style={{ zIndex: getZIndex(offset) }}
            >
              {isLoading ? (
                <div className="loading-cover">
                  <div className="spinner"></div>
                </div>
              ) : hasError ? (
                <div className="error-cover">
                  <img 
                    src={getFallbackImage(vinyl)}
                    alt={`${vinyl.artist} - ${vinyl.title}`} 
                  />
                  <div className="error-message">{hasError}</div>
                </div>
              ) : (
                <img 
                  src={imageUrl || getFallbackImage(vinyl)}
                  alt={`${vinyl.artist} - ${vinyl.title}`} 
                  onError={(e) => handleImageError(e, vinyl)}
                  data-artist={vinyl.artist}
                  data-title={vinyl.title}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* <div style={{ 
        position: "absolute", 
        bottom: "-120px", 
        left: "50%", 
        transform: "translateX(-50%)", 
        display: "flex", 
        flexDirection: "column", 
        gap: "10px" 
      }}>
        <button 
          className="control-button"
          onClick={handleFetchAllCovers}
        >
          Fetch All Covers
        </button>
        <div className="debug-info">
          Covers in cache: {Object.keys(coverImages).length}
          {Object.keys(errors).length > 0 && ` | Errors: ${Object.keys(errors).length}`}
        </div>
      </div> */}
    </div>
  );
}

export default VinylStack;