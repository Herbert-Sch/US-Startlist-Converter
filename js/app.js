/**
 * Main Application
 * Connects all components: Video Player, Speech Recognition, and Translation
 */
class App {
    constructor() {
        this.videoPlayer = null;
        this.speechRecognition = null;
        this.translation = null;
        this.audioProcessor = null;
        
        this.transcriptContainer = document.getElementById('transcript');
        this.sourceLanguageSelect = document.getElementById('source-language');
        this.targetLanguageSelect = document.getElementById('target-language');
        this.startButton = document.getElementById('start-recognition');
        
        this.pendingRecognitions = new Map();
        this.recognitionIdCounter = 0;
        this.useDirectAudio = false; // Flag for direct audio processing
        
        this.init();
    }
    
    init() {
        // Initialize components
        this.videoPlayer = new VideoPlayer();
        this.translation = new TranslationHandler();
        
        // Check if direct audio processing is possible
        this.checkAudioProcessingCapabilities();
        
        // Initialize the speech recognition component only if we're not using direct audio extraction
        if (!this.useDirectAudio) {
            this.speechRecognition = new SpeechRecognitionHandler(document.getElementById('video-player'));
        }
        
        // Setup event listeners
        this.setupEvents();
        
        // Show the welcome message
        this.showWelcomeMessage();
    }
    
    checkAudioProcessingCapabilities() {
        const videoElement = document.getElementById('video-player');
        
        // Check if browser functions for direct audio processing are available
        const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext);
        const hasCaptureStream = !!(videoElement.captureStream || videoElement.mozCaptureStream);
        
        // If the functions are available, initialize the audio processor
        if (hasAudioContext && hasCaptureStream) {
            this.audioProcessor = new AudioProcessor(videoElement);
            
            // Add event listeners for errors and recognized audio data
            this.audioProcessor.onError(error => {
                console.error('Audio processing error:', error);
                this.addErrorMessage(error);
                
                // If the audio processor doesn't work, switch to microphone processing
                if (this.useDirectAudio) {
                    this.useDirectAudio = false;
                    this.updateRecognitionButtonText();
                    this.addInfoMessage("Error in direct audio processing. Switching to microphone mode.");
                    
                    // Initialize the Web Speech API for fallback
                    this.speechRecognition = new SpeechRecognitionHandler(document.getElementById('video-player'));
                    this.setupSpeechRecognitionEvents();
                }
            });
            
            this.useDirectAudio = true;
            console.log("Direct audio extraction enabled");
        } else {
            this.useDirectAudio = false;
            console.log("Direct audio extraction not available, using microphone");
        }
        
        this.updateRecognitionButtonText();
    }
    
    updateRecognitionButtonText() {
        // Update the button text based on the active mode
        if (this.useDirectAudio) {
            this.startButton.textContent = 'Start Direct Stream Recognition';
            this.startButton.setAttribute('data-mode', 'direct');
        } else {
            this.startButton.textContent = 'Start Microphone Recognition';
            this.startButton.setAttribute('data-mode', 'mic');
        }
    }
    
    setupEvents() {
        // Handle language selection changes
        this.targetLanguageSelect.addEventListener('change', () => {
            // Re-translate all existing transcripts
            this.retranslateExistingTranscripts();
        });
        
        // Setup speech recognition events if we're using it
        if (!this.useDirectAudio && this.speechRecognition) {
            this.setupSpeechRecognitionEvents();
        }
        
        // Override the default click handler for the start button
        this.startButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Check which mode is active and perform the corresponding action
            if (this.useDirectAudio) {
                this.toggleDirectAudioRecognition();
            } else if (this.speechRecognition) {
                // Let the original click handler be active
                if (this.speechRecognition.isListening) {
                    this.speechRecognition.stopListening();
                } else {
                    this.speechRecognition.startListening();
                }
            }
            
            return false;
        });
    }
    
    setupSpeechRecognitionEvents() {
        if (!this.speechRecognition) return;
        
        // Handle speech recognition results
        this.speechRecognition.onResult(result => {
            this.handleSpeechResult(result);
        });
        
        this.speechRecognition.onError(error => {
            console.error('Speech recognition error in app:', error);
            this.addErrorMessage(error);
        });
    }
    
    toggleDirectAudioRecognition() {
        if (!this.audioProcessor) return;
        
        if (this.audioProcessor.isProcessing) {
            // Stop audio processing
            this.audioProcessor.stopProcessing();
            this.startButton.textContent = 'Start Direct Stream Recognition';
            this.startButton.style.backgroundColor = '#28a745';
        } else {
            // Start audio processing
            this.audioProcessor.startProcessing();
            this.startButton.textContent = 'Stop Direct Stream Recognition';
            this.startButton.style.backgroundColor = '#dc3545';
        }
    }
    
    // This method is called by the audio processor when text is recognized
    handleDirectAudioRecognition(recognizedText) {
        if (!recognizedText) return;
        
        console.log('Recognized text from direct audio:', recognizedText);
        
        // Process the recognized text the same way as with the Web Speech API
        const recognitionId = this.recognitionIdCounter++;
        this.pendingRecognitions.set(recognitionId, recognizedText);
        
        // Translate the text
        const sourceLang = this.sourceLanguageSelect.value === 'auto' ? 'auto' : this.sourceLanguageSelect.value.split('-')[0];
        
        this.translation.translateText(recognizedText, sourceLang)
            .then(translatedText => {
                // Add the translated text
                this.addTranscriptEntry(recognizedText, translatedText, sourceLang, recognitionId);
                
                // Remove the text from pending recognitions
                this.pendingRecognitions.delete(recognitionId);
            })
            .catch(error => {
                console.error('Error translating text:', error);
                this.pendingRecognitions.delete(recognitionId);
            });
    }
    
    showWelcomeMessage() {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.classList.add('transcript-entry', 'welcome-message');
        
        const messageText = document.createElement('div');
        messageText.classList.add('translated-text');
        
        // Customized message depending on available mode
        if (this.useDirectAudio) {
            messageText.innerHTML = `
                <p>Welcome to Stream Speech Recognition and Translation!</p>
                <p><strong>Direct audio extraction is available!</strong></p>
                <ol>
                    <li>Load the stream with the correct server ID</li>
                    <li>Click on "Start Direct Stream Recognition"</li>
                    <li>The recognized speech will be automatically extracted from the stream audio</li>
                </ol>
                <p>Recognized speech and translations will appear in this list.</p>
            `;
        } else {
            messageText.innerHTML = `
                <p>Welcome to Stream Speech Recognition and Translation!</p>
                <p>Your browser doesn't support direct audio extraction, but you can still use the microphone mode:</p>
                <ol>
                    <li>Load the stream and unmute the audio</li>
                    <li>Click on "Start Microphone Recognition"</li>
                    <li>Your microphone will pick up the audio from your speakers</li>
                </ol>
                <p>Recognized speech and translations will appear in this list.</p>
            `;
        }
        
        welcomeMessage.appendChild(messageText);
        this.transcriptContainer.appendChild(welcomeMessage);
    }
    
    addInfoMessage(message) {
        const infoMessage = document.createElement('div');
        infoMessage.classList.add('transcript-entry', 'info-message');
        
        const messageText = document.createElement('div');
        messageText.classList.add('info-text');
        messageText.textContent = message;
        
        infoMessage.appendChild(messageText);
        
        if (this.transcriptContainer.firstChild) {
            this.transcriptContainer.insertBefore(infoMessage, this.transcriptContainer.firstChild);
        } else {
            this.transcriptContainer.appendChild(infoMessage);
        }
        
        // Auto-remove after some time
        setTimeout(() => {
            infoMessage.remove();
        }, 8000);
    }
    
    addErrorMessage(error) {
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('transcript-entry', 'error-message');
        
        const messageText = document.createElement('div');
        messageText.classList.add('error-text');
        messageText.textContent = `Error in speech recognition: ${error}`;
        
        errorMessage.appendChild(messageText);
        
        if (this.transcriptContainer.firstChild) {
            this.transcriptContainer.insertBefore(errorMessage, this.transcriptContainer.firstChild);
        } else {
            this.transcriptContainer.appendChild(errorMessage);
        }
        
        // Auto-remove after some time
        setTimeout(() => {
            errorMessage.remove();
        }, 5000);
    }
    
    async handleSpeechResult(result) {
        const { text, isFinal, confidence } = result;
        
        if (isFinal && text.trim()) {
            console.log('Final speech recognition result:', text);
            
            // For final results, get a unique ID and store in pending recognitions
            const recognitionId = this.recognitionIdCounter++;
            this.pendingRecognitions.set(recognitionId, text);
            
            try {
                // Translate the text
                const sourceLang = this.sourceLanguageSelect.value === 'auto' ? 'auto' : this.sourceLanguageSelect.value.split('-')[0];
                const translatedText = await this.translation.translateText(text, sourceLang);
                
                // Add to transcript
                this.addTranscriptEntry(text, translatedText, sourceLang, recognitionId);
                
                // Remove from pending recognitions
                this.pendingRecognitions.delete(recognitionId);
            } catch (error) {
                console.error('Error handling speech result:', error);
                this.pendingRecognitions.delete(recognitionId);
            }
        }
    }
    
    addTranscriptEntry(originalText, translatedText, sourceLang, id) {
        const entryElement = document.createElement('div');
        entryElement.classList.add('transcript-entry');
        entryElement.dataset.recognitionId = id;
        entryElement.dataset.originalText = originalText;
        entryElement.dataset.sourceLang = sourceLang;
        
        const originalElement = document.createElement('div');
        originalElement.classList.add('original-text');
        originalElement.textContent = originalText;
        
        const translatedElement = document.createElement('div');
        translatedElement.classList.add('translated-text');
        translatedElement.textContent = translatedText;
        
        entryElement.appendChild(originalElement);
        entryElement.appendChild(translatedElement);
        
        // Insert at the top for reverse chronological order
        if (this.transcriptContainer.firstChild) {
            this.transcriptContainer.insertBefore(entryElement, this.transcriptContainer.firstChild);
        } else {
            this.transcriptContainer.appendChild(entryElement);
        }
        
        // Limit the number of entries to prevent memory issues
        this.limitTranscriptEntries(100);
    }
    
    limitTranscriptEntries(maxEntries) {
        const entries = this.transcriptContainer.querySelectorAll('.transcript-entry:not(.welcome-message):not(.error-message):not(.info-message)');
        if (entries.length > maxEntries) {
            for (let i = maxEntries; i < entries.length; i++) {
                entries[i].remove();
            }
        }
    }
    
    async retranslateExistingTranscripts() {
        const entries = this.transcriptContainer.querySelectorAll('.transcript-entry:not(.welcome-message):not(.error-message):not(.info-message)');
        const targetLang = this.targetLanguageSelect.value;
        
        for (const entry of entries) {
            const originalText = entry.dataset.originalText;
            const sourceLang = entry.dataset.sourceLang;
            
            try {
                const translatedText = await this.translation.translateText(originalText, sourceLang);
                const translatedElement = entry.querySelector('.translated-text');
                if (translatedElement) {
                    translatedElement.textContent = translatedText;
                }
            } catch (error) {
                console.error('Error retranslating text:', error);
            }
        }
    }
}

// Initialize the app when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
}); 