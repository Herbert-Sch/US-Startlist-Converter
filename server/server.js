/**
 * HLS Stream Spracherkennung - Server
 * 
 * Ein einfacher Server, der Audio-Daten empfängt und über eine
 * Spracherkennungs-API in Text umwandelt.
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const { Readable } = require('stream');

// Server-Konfiguration
const PORT = process.env.PORT || 3000;
const app = express();

// CORS einstellen für Cross-Origin-Anfragen
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Erhöhte Limit für größere Audio-Pakete

// Statische Dateien aus dem Hauptverzeichnis bereitstellen
app.use(express.static(path.join(__dirname, '..')));

// HTTP-Server erstellen
const server = http.createServer(app);

// WebSocket-Server für Echtzeit-Kommunikation
const wss = new WebSocket.Server({ server });

// Temporäres Verzeichnis für Audio-Dateien
const TEMP_DIR = path.join(__dirname, 'temp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Funktion zum Umwandeln von Base64 in eine WAV-Datei
function base64ToFile(base64Data, filePath) {
    return new Promise((resolve, reject) => {
        const data = base64Data.replace(/^data:audio\/wav;base64,/, '');
        fs.writeFile(filePath, Buffer.from(data, 'base64'), (err) => {
            if (err) reject(err);
            else resolve(filePath);
        });
    });
}

// Funktion zum Konvertieren von WAV zu FLAC (für bessere Kompatibilität mit Spracherkennungs-APIs)
function convertWavToFlac(wavPath, flacPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(wavPath)
            .outputFormat('flac')
            .on('error', err => reject(err))
            .on('end', () => resolve(flacPath))
            .save(flacPath);
    });
}

// Funktion für Spracherkennung mit einem ausgewählten Dienst
// Hier verwenden wir als Beispiel die kostenlose Vosk-API, die offline läuft
// In einer Produktionsumgebung könnten Sie Google Speech-to-Text, Azure Speech, etc. verwenden
async function recognizeSpeech(audioFilePath, languageCode) {
    // Dies ist ein Platzhalter für den tatsächlichen API-Aufruf
    // In der Praxis würden Sie hier die Vosk-API oder eine andere Spracherkennungs-API verwenden
    
    // Beispiel für Google Speech-to-Text API (erfordert API-Schlüssel)
    /*
    const audioBytes = fs.readFileSync(audioFilePath).toString('base64');
    const response = await fetch('https://speech.googleapis.com/v1/speech:recognize?key=YOUR_API_KEY', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            config: {
                encoding: 'FLAC',
                sampleRateHertz: 16000,
                languageCode: languageCode || 'de-DE',
                model: 'default'
            },
            audio: {
                content: audioBytes
            }
        })
    });
    const data = await response.json();
    return data.results?.[0]?.alternatives?.[0]?.transcript || '';
    */

    // Beispiel für lokale Vosk API (offline-fähig, aber erfordert Installation)
    // Diese Funktion würden Sie mit der Vosk-API implementieren
    console.log(`Erkenne Sprache aus Datei: ${audioFilePath} (Sprache: ${languageCode})`);
    
    // Simulierte Erkennung (ersetzen Sie dies durch echte Implementierung)
    return new Promise((resolve) => {
        // Hier würde der tatsächliche Aufruf der Spracherkennungs-API stattfinden
        setTimeout(() => {
            console.log("Audio wird verarbeitet...");
            resolve("Erkannter Text würde hier erscheinen (Server-Implementierung erforderlich)");
        }, 1000);
    });
}

// WebSocket-Verbindungen verwalten
wss.on('connection', (ws) => {
    console.log('Neue WebSocket-Verbindung hergestellt');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'audio') {
                // Audio-Daten empfangen und verarbeiten
                const base64Audio = data.audio;
                const languageCode = data.languageCode;
                
                // Temporäre Dateinamen generieren
                const timestamp = Date.now();
                const wavPath = path.join(TEMP_DIR, `audio_${timestamp}.wav`);
                const flacPath = path.join(TEMP_DIR, `audio_${timestamp}.flac`);
                
                try {
                    // Audio-Daten in Datei speichern
                    await base64ToFile(base64Audio, wavPath);
                    
                    // WAV zu FLAC für bessere Erkennung konvertieren
                    await convertWavToFlac(wavPath, flacPath);
                    
                    // Spracherkennung durchführen
                    const text = await recognizeSpeech(flacPath, languageCode);
                    
                    // Erkannten Text zurücksenden
                    ws.send(JSON.stringify({
                        type: 'recognition',
                        text: text,
                        success: true
                    }));
                    
                    // Temporäre Dateien löschen
                    fs.unlinkSync(wavPath);
                    fs.unlinkSync(flacPath);
                    
                } catch (error) {
                    console.error('Fehler bei der Spracherkennung:', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Fehler bei der Spracherkennung: ${error.message}`
                    }));
                }
            }
        } catch (error) {
            console.error('Fehler beim Verarbeiten der WebSocket-Nachricht:', error);
        }
    });
    
    // Verbindung testen
    ws.send(JSON.stringify({
        type: 'connection',
        message: 'Verbindung zum Spracherkennungs-Server hergestellt'
    }));
    
    ws.on('close', () => {
        console.log('WebSocket-Verbindung geschlossen');
    });
});

// Server starten
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
    console.log(`WebSocket-Server auf ws://localhost:${PORT}`);
}); 