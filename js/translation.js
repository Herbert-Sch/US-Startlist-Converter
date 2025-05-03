/**
 * Translation Handler
 * Uses translation APIs
 */
class TranslationHandler {
    constructor() {
        this.targetLanguageSelect = document.getElementById('target-language');
        this.apiKey = ''; // Sie können einen Google API-Schlüssel hier einfügen
        this.useGoogleTranslate = false; // Auf 'false' gesetzt, um die kostenlose Alternative zu nutzen
        
        // Cache for translations to reduce API calls
        this.translationCache = {};
    }
    
    /**
     * Translate text using selected translation API
     * @param {string} text - Text to translate
     * @param {string} sourceLang - Source language code (auto for automatic detection)
     * @param {string} targetLang - Target language code
     * @returns {Promise<string>} - Translated text
     */
    async translateText(text, sourceLang = 'auto') {
        if (!text || text.trim() === '') {
            return '';
        }
        
        const targetLang = this.targetLanguageSelect.value;
        
        // Skip translation if source and target are the same
        if (sourceLang === targetLang && sourceLang !== 'auto') {
            return text;
        }
        
        // Check cache
        const cacheKey = `${text}-${sourceLang}-${targetLang}`;
        if (this.translationCache[cacheKey]) {
            return this.translationCache[cacheKey];
        }
        
        // If API key is provided, use Google Translate API
        if (this.apiKey && this.useGoogleTranslate) {
            try {
                const translatedText = await this.googleTranslate(text, sourceLang, targetLang);
                this.translationCache[cacheKey] = translatedText;
                return translatedText;
            } catch (error) {
                console.error('Translation API error:', error);
                // Fall back to the alternate method
                return this.translateWithMyMemory(text, sourceLang, targetLang);
            }
        } else {
            // Use free alternative translation
            return this.translateWithMyMemory(text, sourceLang, targetLang);
        }
    }
    
    /**
     * Translate using Google Translate API
     */
    async googleTranslate(text, sourceLang, targetLang) {
        const url = `https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: sourceLang === 'auto' ? undefined : sourceLang,
                target: targetLang,
                format: 'text'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Translation API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.data.translations[0].translatedText;
    }
    
    /**
     * Translate with MyMemory API
     * @param {string} text - Text to translate
     * @param {string} sourceLang - Source language code
     * @param {string} targetLang - Target language code
     * @returns {Promise<string>} - Translated text
     */
    async translateWithMyMemory(text, sourceLang, targetLang) {
        try {
            if (sourceLang === 'auto') {
                // Da MyMemory Autodetect unterstützt, lassen wir es als "auto" bei der Anfrage
                sourceLang = 'auto';
            } else {
                // Konvertiere Sprachcode-Format (de-DE -> de)
                sourceLang = sourceLang.split('-')[0];
            }
            
            // Begrenze die Textlänge, um innerhalb der API-Limits zu bleiben
            const maxLength = 500;
            if (text.length > maxLength) {
                text = text.substring(0, maxLength) + '...';
            }
            
            // MyMemory API - kostenlos für weniger als 5000 Zeichen pro Tag
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
            
            console.log(`Übersetze mit MyMemory: ${sourceLang} -> ${targetLang}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`MyMemory API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.responseStatus === 200) {
                // Cache the result
                this.translationCache[`${text}-${sourceLang}-${targetLang}`] = data.responseData.translatedText;
                return data.responseData.translatedText;
            } else {
                throw new Error(`MyMemory translation error: ${data.responseStatus}`);
            }
        } catch (error) {
            console.error('Error with translation API:', error);
            // Absoluter Fallback: Originaltext mit Hinweis zurückgeben
            return `[Übersetzung nicht verfügbar] ${text}`;
        }
    }
}

// Export for use in other modules
window.TranslationHandler = TranslationHandler; 