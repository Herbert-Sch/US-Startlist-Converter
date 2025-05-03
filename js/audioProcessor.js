/**
 * Audio Processor
 * Extrahiert Audio aus dem Video-Stream und bereitet es für die Spracherkennung vor
 */
class AudioProcessor {
    constructor(videoElement) {
        this.videoElement = videoElement;
        this.audioContext = null;
        this.mediaStreamSource = null;
        this.audioProcessor = null;
        this.analyser = null;
        this.isProcessing = false;
        this.audioBuffers = [];
        this.sampleRate = 16000; // Standard für die meisten Spracherkennungs-APIs
        this.bufferSize = 4096;
        this.recordingInterval = null;
        
        // WebSocket für die Kommunikation mit dem Spracherkennungs-Server
        this.socket = null;
        this.serverUrl = 'ws://localhost:3000'; // Ändern Sie dies zur URL Ihres Servers
        this.isConnected = false;
        
        this.callbacks = {
            onAudioData: null,
            onError: null,
            onServerConnection: null
        };
    }
    
    async init() {
        try {
            // Erstelle AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Verbinde Video-Element mit Audio-Kontext
            const mediaStream = await this.captureStream();
            if (!mediaStream) {
                throw new Error("Konnte keinen MediaStream vom Video extrahieren");
            }
            
            this.mediaStreamSource = this.audioContext.createMediaStreamSource(mediaStream);
            
            // Analyzer für Audiovisualisierung
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            // Erstelle ScriptProcessor für die Audioverarbeitung
            // Hinweis: ScriptProcessorNode ist veraltet, aber für unsere Zwecke funktionsfähig
            // In einer Produktionsumgebung sollte AudioWorklet verwendet werden
            this.audioProcessor = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);
            
            // Verarbeite Audio-Daten
            this.audioProcessor.onaudioprocess = (e) => {
                if (this.isProcessing) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    
                    // Kopiere die Daten, da inputData nur eine Referenz ist
                    const audioData = new Float32Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        audioData[i] = inputData[i];
                    }
                    
                    // Speichere die Daten
                    this.audioBuffers.push(audioData);
                    
                    // Rufe Callback auf, wenn vorhanden
                    if (this.callbacks.onAudioData) {
                        this.callbacks.onAudioData(audioData);
                    }
                }
            };
            
            // Verbinde die Komponenten
            this.mediaStreamSource.connect(this.analyser);
            this.analyser.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);
            
            console.log("Audio-Prozessor initialisiert");
            
            // Versuche, eine Verbindung zum Server herzustellen
            this.connectToServer();
            
            return true;
            
        } catch (error) {
            console.error("Fehler bei der Initialisierung des Audio-Prozessors:", error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error.message);
            }
            return false;
        }
    }
    
    connectToServer() {
        try {
            this.socket = new WebSocket(this.serverUrl);
            
            this.socket.onopen = () => {
                console.log("Verbindung zum Spracherkennungs-Server hergestellt");
                this.isConnected = true;
                
                if (this.callbacks.onServerConnection) {
                    this.callbacks.onServerConnection(true);
                }
                
                // Zeige eine Verbindungsnachricht an
                if (window.app && typeof window.app.handleDirectAudioRecognition === 'function') {
                    window.app.handleDirectAudioRecognition(
                        "Verbindung zum Spracherkennungs-Server hergestellt. Audio-Daten werden gestreamt.",
                        true
                    );
                }
            };
            
            this.socket.onclose = () => {
                console.log("Verbindung zum Spracherkennungs-Server getrennt");
                this.isConnected = false;
                
                if (this.callbacks.onServerConnection) {
                    this.callbacks.onServerConnection(false);
                }
                
                // Versuche nach 5 Sekunden erneut zu verbinden
                setTimeout(() => {
                    if (!this.isConnected && this.isProcessing) {
                        this.connectToServer();
                    }
                }, 5000);
            };
            
            this.socket.onerror = (error) => {
                console.error("WebSocket-Fehler:", error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(`WebSocket-Fehler: ${error.message || 'Verbindung fehlgeschlagen'}`);
                }
                
                // Zeige eine Fehlermeldung an
                if (window.app && typeof window.app.handleDirectAudioRecognition === 'function') {
                    window.app.handleDirectAudioRecognition(
                        "Fehler bei der Verbindung zum Spracherkennungs-Server. Stellen Sie sicher, dass der Server läuft und erreichbar ist.",
                        true
                    );
                }
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'recognition' && data.success) {
                        // Erkannten Text an die Anwendung senden
                        if (window.app && typeof window.app.handleDirectAudioRecognition === 'function') {
                            window.app.handleDirectAudioRecognition(data.text, false);
                        }
                    } else if (data.type === 'error') {
                        console.error("Server-Fehler:", data.message);
                        if (this.callbacks.onError) {
                            this.callbacks.onError(data.message);
                        }
                    } else if (data.type === 'connection') {
                        console.log("Server-Nachricht:", data.message);
                    }
                } catch (error) {
                    console.error("Fehler beim Verarbeiten der Server-Antwort:", error);
                }
            };
            
        } catch (error) {
            console.error("Fehler beim Verbinden mit dem Server:", error);
            if (this.callbacks.onError) {
                this.callbacks.onError(`Verbindungsfehler: ${error.message}`);
            }
        }
    }
    
    async captureStream() {
        try {
            // Versuche, den MediaStream vom Video-Element zu extrahieren
            if (this.videoElement.captureStream) {
                console.log("Verwende captureStream für Audio-Extraktion");
                return this.videoElement.captureStream();
            } else if (this.videoElement.mozCaptureStream) {
                console.log("Verwende mozCaptureStream für Audio-Extraktion");
                return this.videoElement.mozCaptureStream();
            } else {
                // Fallback: Wir müssen einen Canvas erstellen und daraus einen Stream erzeugen
                console.log("Direkte Stream-Extraktion nicht unterstützt, verwende Canvas-Methode");
                return this.createCanvasStream();
            }
        } catch (error) {
            console.error("Stream-Extraktion fehlgeschlagen:", error);
            throw error;
        }
    }
    
    createCanvasStream() {
        // Erstelle einen Canvas und 2D-Kontext
        const canvas = document.createElement('canvas');
        canvas.width = 1;  // Minimale Größe, da wir nur Audio benötigen
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        
        // Setze das Video als Quelle für den Canvas (nur für Audio)
        const drawVideo = () => {
            if (this.isProcessing && !this.videoElement.paused && !this.videoElement.ended) {
                ctx.drawImage(this.videoElement, 0, 0, 1, 1);
                requestAnimationFrame(drawVideo);
            }
        };
        
        // Starte das Zeichnen und extrahiere den Stream
        drawVideo();
        return canvas.captureStream(0);  // 0 fps da wir nur Audio benötigen
    }
    
    startProcessing() {
        if (!this.audioContext) {
            this.init().then(success => {
                if (success) {
                    this.isProcessing = true;
                    this.startRecordingInterval();
                    console.log("Audio-Verarbeitung gestartet");
                }
            });
        } else {
            this.isProcessing = true;
            this.startRecordingInterval();
            console.log("Audio-Verarbeitung gestartet");
            
            // Verbinde mit dem Server, wenn noch nicht verbunden
            if (!this.isConnected) {
                this.connectToServer();
            }
        }
        
        // Stelle sicher, dass der Ton des Videos nicht stummgeschaltet ist
        if (this.videoElement.muted) {
            console.log("Video war stummgeschaltet, Ton wird aktiviert");
            this.videoElement.muted = false;
        }
    }
    
    stopProcessing() {
        this.isProcessing = false;
        this.clearRecordingInterval();
        console.log("Audio-Verarbeitung gestoppt");
    }
    
    // Sendet regelmäßig Audio-Daten zur Spracherkennung
    startRecordingInterval() {
        this.clearRecordingInterval();
        
        // Alle 5 Sekunden Audio-Daten sammeln
        this.recordingInterval = setInterval(() => {
            if (this.audioBuffers.length > 0) {
                const combinedBuffer = this.combineAudioBuffers();
                
                // Hier würde normaler Weise die Verarbeitung und Übertragung der Daten erfolgen
                const wavBlob = this.audioBufferToWav(combinedBuffer);
                
                // Sende Audio-Daten an den Server
                this.sendAudioToServer(wavBlob);
                
                // Leere den Buffer für die nächste Aufnahme
                this.audioBuffers = [];
            }
        }, 5000);
    }
    
    clearRecordingInterval() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
    }
    
    combineAudioBuffers() {
        // Berechne die Gesamtlänge aller Buffer
        let totalLength = 0;
        for (const buffer of this.audioBuffers) {
            totalLength += buffer.length;
        }
        
        // Erstelle einen neuen Buffer mit der Gesamtlänge
        const combinedBuffer = new Float32Array(totalLength);
        
        // Fülle den kombinierten Buffer
        let position = 0;
        for (const buffer of this.audioBuffers) {
            combinedBuffer.set(buffer, position);
            position += buffer.length;
        }
        
        return combinedBuffer;
    }
    
    audioBufferToWav(audioBuffer) {
        // Konvertiere Float32Array zu WAV-Format
        const numChannels = 1;
        const bytesPerSample = 2; // 16-bit
        
        // Erstelle den WAV-Header
        const header = new ArrayBuffer(44);
        const view = new DataView(header);
        
        // RIFF Chunk
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + audioBuffer.length * bytesPerSample, true);
        this.writeString(view, 8, 'WAVE');
        
        // Format Chunk
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Format Chunk Größe
        view.setUint16(20, 1, true);  // Format (1 = PCM)
        view.setUint16(22, numChannels, true); // Kanäle
        view.setUint32(24, this.sampleRate, true); // Sample-Rate
        view.setUint32(28, this.sampleRate * numChannels * bytesPerSample, true); // Byte-Rate
        view.setUint16(32, numChannels * bytesPerSample, true); // Block-Ausrichtung
        view.setUint16(34, bytesPerSample * 8, true); // Bits pro Sample
        
        // Data Chunk
        this.writeString(view, 36, 'data');
        view.setUint32(40, audioBuffer.length * bytesPerSample, true);
        
        // Erstelle das WAV-Blob
        const audioData = new Int16Array(audioBuffer.length);
        for (let i = 0; i < audioBuffer.length; i++) {
            // Konvertiere von Float32 (-1.0 bis 1.0) zu Int16 (-32768 bis 32767)
            audioData[i] = Math.max(-1, Math.min(1, audioBuffer[i])) * 0x7FFF;
        }
        
        // Kombiniere Header und Audio-Daten
        const wavBlob = new Blob([header, audioData], { type: 'audio/wav' });
        return wavBlob;
    }
    
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    sendAudioToServer(wavBlob) {
        if (!this.isConnected || !this.socket) {
            console.log("Keine Verbindung zum Server, Audio-Daten werden nicht gesendet");
            return;
        }
        
        // Prüfen, ob Audio tatsächlich Daten enthält
        if (wavBlob.size <= 44) {  // 44 Bytes ist die Größe des WAV-Headers
            console.log("Keine Audio-Daten vorhanden, nichts zu senden");
            return;
        }
        
        // Konvertiere WAV Blob zu Base64
        const reader = new FileReader();
        reader.readAsDataURL(wavBlob);
        reader.onloadend = () => {
            try {
                const base64Data = reader.result;
                
                // Stelle sicher, dass die Daten nicht zu groß sind
                if (base64Data.length > 5000000) {  // ~5MB Limit
                    console.warn("Audio-Daten zu groß für WebSocket, werden abgeschnitten");
                    if (this.callbacks.onError) {
                        this.callbacks.onError("Audio-Daten zu groß, längere Aufnahmen werden in Teile aufgeteilt");
                    }
                }
                
                // Bestimme die Quellsprache aus der Anwendung
                const sourceLang = document.getElementById('source-language').value;
                
                // Sende Audio-Daten an den Server
                this.socket.send(JSON.stringify({
                    type: 'audio',
                    audio: base64Data,
                    languageCode: sourceLang === 'auto' ? 'auto' : sourceLang.split('-')[0]
                }));
                
                console.log("Audio-Daten an Server gesendet, warte auf Erkennung...");
                
            } catch (error) {
                console.error("Fehler beim Senden der Audio-Daten:", error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(`Senden fehlgeschlagen: ${error.message}`);
                }
            }
        };
    }
    
    calculateAudioEnergy() {
        // Berechne die durchschnittliche Energie des Audio-Signals
        // Dies kann verwendet werden, um zu erkennen, ob überhaupt Sprache vorhanden ist
        if (this.audioBuffers.length === 0) return 0;
        
        let totalEnergy = 0;
        let sampleCount = 0;
        
        for (const buffer of this.audioBuffers) {
            for (let i = 0; i < buffer.length; i++) {
                totalEnergy += buffer[i] * buffer[i];  // Quadrat des Samples = Energie
                sampleCount++;
            }
        }
        
        return sampleCount > 0 ? totalEnergy / sampleCount : 0;
    }
    
    onAudioData(callback) {
        this.callbacks.onAudioData = callback;
        return this;
    }
    
    onError(callback) {
        this.callbacks.onError = callback;
        return this;
    }
    
    onServerConnection(callback) {
        this.callbacks.onServerConnection = callback;
        return this;
    }
}

// Export für die Verwendung in anderen Modulen
window.AudioProcessor = AudioProcessor; 