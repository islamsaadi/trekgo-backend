import axios from 'axios';

class ImageService {
  async getDestinationImage(destination) {
    const searchQuery = `${destination} travel landscape nature`;
    
    try {
      // Try multiple sources in order
      const image = await this.tryPixabay(searchQuery) || 
                   await this.tryUnsplash(searchQuery) ||
                   await this.tryWikimedia(searchQuery) ||
                   await this.generatePlaceholder(destination);
      
      return image;
    } catch (error) {
      console.error('Image service error:', error);
      // Always return an image - generate placeholder if all else fails
      return this.generatePlaceholder(destination);
    }
  }

  async tryPixabay(query) {
    if (!process.env.PIXABAY_API_KEY) return null;
    
    try {
      const url = `https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&category=travel&per_page=10&min_width=1200&safesearch=true`;
      
      const response = await axios.get(url, { timeout: 5000 });
      const hits = response.data?.hits || [];
      
      // Find best quality image
      for (const hit of hits) {
        if (hit.largeImageURL || hit.webformatURL) {
          return hit.largeImageURL || hit.webformatURL;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Pixabay fetch failed:', error.message);
      return null;
    }
  }

  async tryUnsplash(query) {
    if (!process.env.UNSPLASH_ACCESS_KEY) return null;
    
    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        },
        timeout: 5000
      });
      
      const results = response.data?.results || [];
      
      for (const photo of results) {
        if (photo.urls?.regular || photo.urls?.full) {
          return photo.urls.regular || photo.urls.full;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Unsplash fetch failed:', error.message);
      return null;
    }
  }

  async tryWikimedia(query) {
    try {
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=imageinfo&iiprop=url|size&format=json&origin=*`;
      
      const response = await axios.get(url, { timeout: 5000 });
      const pages = response.data?.query?.pages || {};
      
      // Find landscape oriented images
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        const imageInfo = page.imageinfo?.[0];
        
        if (imageInfo?.url && imageInfo.width > imageInfo.height) {
          return imageInfo.url;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Wikimedia fetch failed:', error.message);
      return null;
    }
  }

  generatePlaceholder(destination) {
    // Generate a high-quality SVG placeholder with gradient and text
    const colors = [
      ['#667eea', '#764ba2'], // Purple gradient
      ['#f093fb', '#f5576c'], // Pink gradient
      ['#4facfe', '#00f2fe'], // Blue gradient
      ['#43e97b', '#38f9d7'], // Green gradient
      ['#fa709a', '#fee140'], // Warm gradient
      ['#30cfd0', '#330867'], // Cool gradient
      ['#a8edea', '#fed6e3'], // Soft gradient
      ['#ff9a9e', '#fecfef'], // Rose gradient
    ];
    
    // Pick a color based on destination hash
    const hash = destination.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorPair = colors[hash % colors.length];
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.3"/>
          </filter>
        </defs>
        <rect width="1200" height="630" fill="url(#grad)"/>
        <text x="50%" y="50%" 
              font-family="Arial, sans-serif" 
              font-size="48" 
              font-weight="bold" 
              fill="white" 
              text-anchor="middle" 
              dominant-baseline="middle"
              filter="url(#shadow)">
          ${this.escapeXml(destination)}
        </text>
        <text x="50%" y="60%" 
              font-family="Arial, sans-serif" 
              font-size="24" 
              fill="white" 
              opacity="0.8"
              text-anchor="middle" 
              dominant-baseline="middle">
          Adventure Awaits
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}

export default new ImageService();