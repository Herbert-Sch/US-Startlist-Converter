/**
 * Speech Recognition Handler
 */
class SpeechRecognitionHandler {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.recognition = null;
        this.sourceLanguageSelect = document.getElementById('source-language');
        this.startButton = document.getElementById('start-recognition');
        this.isListening = false;
        this.callbacks = {
            onResult: null,
            onError: null
        };
        
        this.checkBrowserSupport();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.startButton.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening();
                this.startButton.textContent = 'Start Speech Recognition';
                this.startButton.style.backgroundColor = '#28a745';
            } else {
                this.startListening();
                this.startButton.textContent = 'Stop Speech Recognition';
                this.startButton.style.backgroundColor = '#dc3545';
            }
        });
    }
    
    checkBrowserSupport() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error('Speech Recognition is not supported in your browser');
            alert('Speech recognition is not supported in your browser. Please use Chrome or Edge for the best experience.');
            this.startButton.disabled = true;
            this.startButton.textContent = 'Speech Recognition not supported';
            return false;
        }
        
        return true;
    }
    
    initRecognition() {
        if (!this.checkBrowserSupport()) return;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.updateLanguage();
        
        // Set up event listeners
        this.recognition.onresult = (event) => {
            if (this.callbacks.onResult) {
                const results = Array.from(event.results);
                const lastResult = results[results.length - 1];
                const text = lastResult[0].transcript;
                const isFinal = lastResult.isFinal;
                
                this.callbacks.onResult({
                    text,
                    isFinal,
                    confidence: lastResult[0].confidence
                });
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            
            if (this.callbacks.onError) {
                this.callbacks.onError(event.error);
            }
            
            // Auto-restart on error if still listening
            if (this.isListening && event.error !== 'aborted' && event.error !== 'no-speech') {
                this.stopListening();
                setTimeout(() => {
                    if (this.isListening) {
                        this.startListening();
                    }
                }, 1000);
            }
        };
        
        this.recognition.onend = () => {
            // Auto-restart if still in listening mode
            if (this.isListening) {
                this.recognition.start();
            }
        };
        
        // Listen for language changes
        this.sourceLanguageSelect.addEventListener('change', () => {
            this.updateLanguage();
            if (this.isListening) {
                this.stopListening();
                this.startListening();
            }
        });
    }
    
    updateLanguage() {
        if (!this.recognition) return;
        
        const language = this.sourceLanguageSelect.value;
        if (language !== 'auto') {
            this.recognition.lang = language;
        }
    }
    
    startListening() {
        if (!this.recognition) {
            this.initRecognition();
        }
        
        try {
            this.videoElement.muted = false; // Ensure video sound is on
            this.recognition.start();
            this.isListening = true;
            console.log('Speech recognition started');
            
            // Update UI to show that recognition is active
            this.startButton.textContent = 'Stop Speech Recognition';
            this.startButton.style.backgroundColor = '#dc3545';
        } catch (error) {
            console.error('Error starting speech recognition:', error);
            // Try to reinitialize
            this.recognition = null;
            this.initRecognition();
            this.recognition.start();
        }
    }
    
    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
            this.isListening = false;
            console.log('Speech recognition stopped');
            
            // Update UI to show that recognition is inactive
            this.startButton.textContent = 'Start Speech Recognition';
            this.startButton.style.backgroundColor = '#28a745';
        }
    }
    
    onResult(callback) {
        this.callbacks.onResult = callback;
        return this;
    }
    
    onError(callback) {
        this.callbacks.onError = callback;
        return this;
    }
    
    // Handle recognition via audio from video element (experimental)
    setupVideoAudioRecognition() {
        // This is experimental and may not work reliably across browsers
        // For production use, consider using a backend service for more reliable transcription
        
        // Add audio processing here if needed for better results
        // For now, we'll rely on the browser's ability to pick up audio from speakers
        
        // Start speech recognition when video plays
        this.videoElement.addEventListener('play', () => {
            console.log('Video is playing, make sure audio is unmuted for speech recognition');
            this.videoElement.muted = false; // Try to unmute video when play starts
        });
        
        // We now rely on the explicit button click rather than automatic start/stop
        this.videoElement.addEventListener('pause', () => {
            console.log('Video paused, recognition continues if button is active');
        });
    }
}

// Export for use in other modules
window.SpeechRecognitionHandler = SpeechRecognitionHandler; 