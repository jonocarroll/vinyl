// src/App.jsx
import React, { useState, useEffect } from 'react';
import './App.css';
import VinylStack from './components/VinylStack';
import TrackList from './components/TrackList';
import VinylDataService from './services/VinylDataService';

function App() {
  const [vinylData, setVinylData] = useState([]);
  const [selectedVinylIndex, setSelectedVinylIndex] = useState(0);
  const [instructions, setInstructions] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Initialize the data service
  const dataService = VinylDataService.getInstance();

  useEffect(() => {
    // Fetch vinyl data
    const fetchVinylData = async () => {
      setLoading(true);
      try {
        console.log('Fetching vinyl data...');
        
        // Load data from the service
        const data = await dataService.loadData();
        console.log('Vinyl data loaded:', data.vinyls);
        
        // Check if we have valid data
        if (Array.isArray(data.vinyls) && data.vinyls.length > 0) {
          setVinylData(data.vinyls);
        } else {
          throw new Error('No vinyl data found or invalid data format');
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching vinyl data:', error);
        setError('Failed to load vinyl collection. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchVinylData();

    // Hide instructions after 5 seconds
    const timer = setTimeout(() => {
      setInstructions(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        setSelectedVinylIndex(prevIndex => 
          prevIndex > 0 ? prevIndex - 1 : vinylData.length - 1
        );
      } else if (event.key === 'ArrowRight') {
        setSelectedVinylIndex(prevIndex => 
          prevIndex < vinylData.length - 1 ? prevIndex + 1 : 0
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [vinylData.length]);

  const handleSliderChange = (event) => {
    setSelectedVinylIndex(Number(event.target.value));
  };

  return (
    <div className="app-container">
      <header>
        <h1>My Vinyl Collection</h1>
      </header>
      
      {instructions && (
        <div className="instructions">
          <p>Use the slider to browse through your vinyl collection. Click on a record to select it.</p>
        </div>
      )}
      
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your vinyl collection...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <main>
          <div className="vinyl-display-area">
            <VinylStack 
              vinyls={vinylData} 
              selectedVinylIndex={selectedVinylIndex}
            />
            
            <div className="slider-container" style={{ marginTop: '220px' }}>
              <input 
                type="range" 
                min="0" 
                max={vinylData.length - 1} 
                value={selectedVinylIndex} 
                onChange={handleSliderChange} 
                className="vinyl-slider"
              />
            </div>
          </div>
          
          {vinylData[selectedVinylIndex] && (
            <TrackList vinyl={vinylData[selectedVinylIndex]} />
          )}
        </main>
      )}
    </div>
  );
}

export default App;