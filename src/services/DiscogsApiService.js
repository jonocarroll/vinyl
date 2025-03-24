// src/services/DiscogsApiService.js
/**
 * Service to interact with the Discogs API
 * This version uses album artwork directly from the JSON data
 */
class DiscogsApiService {
  constructor() {
    // Default cover image as fallback
    this.defaultCoverImage = '/default-cover.jpg';
  }

  /**
   * Find cover image for an album using the coverImageUrl property
   * @param {Object} album - The album object from the collection
   * @returns {Promise<string>} - The cover image URL
   */
  async findCoverImage(album) {
    try {
      // If the album has a coverImageUrl, use it
      if (album && album.coverImageUrl && this.isValidImageUrl(album.coverImageUrl)) {
        return album.coverImageUrl;
      }
      
      // If no valid coverImageUrl is found, return the default image
      return this.defaultCoverImage;
    } catch (error) {
      console.error('Error finding cover image:', error);
      return this.defaultCoverImage;
    }
  }

  /**
   * Validate a URL is a proper image URL
   * @param {string} url - URL to validate
   * @returns {boolean} - Whether the URL is valid
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    
    // Check if it's an absolute URL or a relative path
    return url.startsWith('http') || url.startsWith('/');
  }
}

export default new DiscogsApiService();