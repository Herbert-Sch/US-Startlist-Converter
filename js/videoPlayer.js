/**
 * Video Player Handler for HLS Stream
 */
class VideoPlayer {
    constructor() {
        this.videoElement = document.getElementById('video-player');
        this.streamUrlInput = document.getElementById('stream-url');
        this.serverIdInput = document.getElementById('server-id');
        this.loadButton = document.getElementById('load-stream');
        this.hls = null;
        
        this.init();
    }
    
    init() {
        // Check if HLS.js is supported
        if (!Hls.isSupported()) {
            console.error('HLS is not supported in your browser');
            alert('HLS ist in Ihrem Browser nicht unterstützt. Bitte verwenden Sie einen aktuellen Browser wie Chrome, Firefox, Safari oder Edge.');
            return;
        }
        
        // Setup event listeners
        this.loadButton.addEventListener('click', () => this.loadStream());
        this.serverIdInput.addEventListener('input', () => this.updateStreamUrl());
        
        // Ensure sound is on when user interacts with video
        this.videoElement.addEventListener('click', () => {
            this.videoElement.muted = false;
        });
        
        // Initialize stream URL with server ID
        this.updateStreamUrl();
    }
    
    updateStreamUrl() {
        const serverId = this.serverIdInput.value.trim();
        const urlTemplate = this.streamUrlInput.getAttribute('value');
        const url = urlTemplate.replace('[SERVER-ID]', serverId);
        this.streamUrlInput.value = url;
    }
    
    loadStream() {
        const serverId = this.serverIdInput.value.trim();
        
        if (!serverId) {
            alert('Bitte geben Sie eine gültige Server-ID ein');
            return;
        }
        
        // Update stream URL with current server ID
        this.updateStreamUrl();
        const streamUrl = this.streamUrlInput.value.trim();
        
        // Destroy previous instance if exists
        if (this.hls) {
            this.hls.destroy();
        }
        
        this.hls = new Hls({ 
            debug: false,
            enableWorker: true
        });
        
        this.hls.loadSource(streamUrl);
        this.hls.attachMedia(this.videoElement);
        
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            // Try to unmute and play
            this.videoElement.muted = false;
            this.videoElement.play()
                .catch(error => {
                    console.error('Error attempting to play video:', error);
                    // Most browsers require user interaction for autoplay with sound
                    // Let's try with muted first, then user can unmute
                    this.videoElement.muted = true;
                    this.videoElement.play()
                        .then(() => {
                            console.log('Video is playing muted. User needs to click on video to enable sound.');
                        })
                        .catch(err => {
                            console.error('Failed to play even with muted video:', err);
                        });
                });
        });
        
        this.hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error('Network error', data);
                        // Try to recover network error
                        this.hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error('Media error', data);
                        this.hls.recoverMediaError();
                        break;
                    default:
                        // Cannot recover
                        this.hls.destroy();
                        alert('Ein Fehler ist beim Laden des Streams aufgetreten.');
                        break;
                }
            }
        });
    }
}

// Export for use in other modules
window.VideoPlayer = VideoPlayer; 