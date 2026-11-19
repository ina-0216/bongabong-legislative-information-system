/**
 * Translates English text to Tagalog using the free MyMemory API.
 * @param {string} text - The English text to translate.
 * @returns {Promise<string>} - The Tagalog translation, or the original text if it fails.
 */
async function translateToTagalog(text) {
  if (!text || text.trim() === '') return '';

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|tl`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
    
    console.warn('Translation API returned unexpected format:', data);
    return ''; // Return empty so the user knows it failed and doesn't save garbage
  } catch (error) {
    console.error('Translation error:', error.message);
    return ''; // Fallback to empty
  }
}

module.exports = {
  translateToTagalog
};
