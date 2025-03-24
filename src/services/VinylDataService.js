// src/services/VinylDataService.js
class VinylDataService {
  static instance = null;
  
  constructor() {
    this.vinyls = [];
    this.coverImages = {};
    this.dataLoaded = false;
    this.loadingPromise = null;
    
    // Flag to prevent excessive localStorage operations
    this.storageDebounceTimer = null;
    this.pendingStorageUpdates = false;
    
    console.log("Initialized VinylDataService");
  }

  static getInstance() {
    if (!VinylDataService.instance) {
      VinylDataService.instance = new VinylDataService();
    }
    return VinylDataService.instance;
  }

  async loadData() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise(async (resolve, reject) => {
      try {
        const vinylsResponse = await fetch('/data/vinyl-collection.json');
        if (!vinylsResponse.ok) {
          throw new Error(`HTTP error! status: ${vinylsResponse.status}`);
        }
        this.vinyls = await vinylsResponse.json();
        
        // Try to load saved cover images with validation
        this.loadCoverImagesFromStorage();

        this.dataLoaded = true;
        resolve({ vinyls: this.vinyls, coverImages: this.coverImages });
      } catch (error) {
        console.error('Error loading vinyl data:', error);
        reject(error);
      }
    });

    return this.loadingPromise;
  }

  /**
   * Load and validate cover images from localStorage
   */
  loadCoverImagesFromStorage() {
    try {
      const savedCoverImages = localStorage.getItem('coverImages');
      if (savedCoverImages) {
        try {
          const parsed = JSON.parse(savedCoverImages);
          
          // Validate each cover image URL
          const validated = {};
          let validCount = 0;
          let invalidCount = 0;
          
          for (const [id, url] of Object.entries(parsed)) {
            if (this.isValidImageUrl(url)) {
              validated[id] = url;
              validCount++;
            } else {
              invalidCount++;
            }
          }
          
          if (invalidCount > 0) {
            console.warn(`Found ${invalidCount} invalid cover URLs in localStorage`);
          }
          
          console.log(`Loaded ${validCount} valid cover images from localStorage`);
          this.coverImages = validated;
          
          // Re-save the validated data
          if (invalidCount > 0) {
            this.debouncedSaveCoverImages(validated);
          }
        } catch (parseError) {
          console.error("JSON parse error for localStorage coverImages:", parseError);
          this.coverImages = {};
          // Clear corrupted data
          localStorage.removeItem('coverImages');
        }
      } else {
        console.log("No saved cover images found in localStorage");
        this.coverImages = {};
      }
    } catch (error) {
      console.error("Error accessing localStorage:", error);
      this.coverImages = {};
    }
  }

  getVinyls() {
    return this.vinyls;
  }

  getCoverImages() {
    // Return the current in-memory cache instead of reloading from localStorage
    return this.coverImages;
  }

  /**
   * Check if a URL is a valid image URL
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether URL is valid
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    
    // Basic checks for valid URLs
    return (
      url.startsWith('http') || 
      url.startsWith('/') || 
      url.startsWith('./') || 
      url.startsWith('../')
    );
  }

  /**
   * Save a single cover image to local memory and debounce localStorage updates
   * @param {string} vinylId - The vinyl ID
   * @param {string} imageUrl - The image URL
   * @returns {Object} - Updated cover images object
   */
  saveCoverImage(vinylId, imageUrl) {
    if (!vinylId) {
      console.error("Cannot save cover image: missing vinylId");
      return this.coverImages;
    }
    
    // Validate the URL before saving
    if (!this.isValidImageUrl(imageUrl)) {
      console.warn(`Not saving invalid image URL for vinyl ${vinylId}: ${imageUrl}`);
      return this.coverImages;
    }
    
    // Update the in-memory cache
    this.coverImages[vinylId] = imageUrl;
    
    // Debounce localStorage write
    this.debouncedSaveCoverImages(this.coverImages);
    
    return this.coverImages;
  }

  /**
   * Debounced method to save cover images to localStorage
   * @param {Object} coverImagesObj - Object with vinylId keys and imageUrl values
   */
  debouncedSaveCoverImages(coverImagesObj) {
    // Mark that we have pending updates
    this.pendingStorageUpdates = true;
    
    // Clear existing timer
    if (this.storageDebounceTimer) {
      clearTimeout(this.storageDebounceTimer);
    }
    
    // Set new timer to batch updates
    this.storageDebounceTimer = setTimeout(() => {
      if (this.pendingStorageUpdates) {
        try {
          localStorage.setItem('coverImages', JSON.stringify(coverImagesObj));
          console.log(`Saved ${Object.keys(coverImagesObj).length} cover images to localStorage`);
        } catch (error) {
          console.error("Error saving to localStorage:", error);
          
          // If quota exceeded, try to clear invalid entries and retry
          if (error.name === 'QuotaExceededError') {
            this.pruneInvalidCovers();
            try {
              localStorage.setItem('coverImages', JSON.stringify(this.coverImages));
            } catch (retryError) {
              console.error("Still unable to save to localStorage after pruning:", retryError);
            }
          }
        }
        this.pendingStorageUpdates = false;
      }
    }, 2000); // Debounce for 2 seconds
  }

  /**
   * Save multiple cover images at once
   * @param {Object} coverImagesObj - Object with vinylId keys and imageUrl values
   */
  saveCoverImages(coverImagesObj) {
    if (!coverImagesObj || typeof coverImagesObj !== 'object') {
      console.error("Invalid coverImages object");
      return;
    }
    
    // Validate all URLs first
    const validated = {};
    for (const [id, url] of Object.entries(coverImagesObj)) {
      if (this.isValidImageUrl(url)) {
        validated[id] = url;
      }
    }
    
    this.coverImages = validated;
    this.debouncedSaveCoverImages(validated);
  }

  /**
   * Remove any invalid cover URLs from memory and storage
   */
  pruneInvalidCovers() {
    console.log("Pruning invalid cover images");
    const validated = {};
    let removedCount = 0;
    
    for (const [id, url] of Object.entries(this.coverImages)) {
      if (this.isValidImageUrl(url)) {
        validated[id] = url;
      } else {
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} invalid cover image URLs`);
      this.coverImages = validated;
      this.debouncedSaveCoverImages(validated);
    }
  }

  clearCoverImages() {
    console.log("Clearing all cover images");
    this.coverImages = {};
    try {
      localStorage.removeItem('coverImages');
      console.log("Cleared cover images from localStorage");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  }
}

export default VinylDataService;