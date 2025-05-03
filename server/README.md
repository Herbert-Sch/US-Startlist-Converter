# HLS Stream Spracherkennung Server

Dieser Server empfängt Audio-Daten vom Browser-Client, führt eine Spracherkennung durch und sendet die erkannten Texte zurück.

## Voraussetzungen

- Node.js (Version 14 oder höher)
- npm (Node Package Manager)
- FFmpeg (für die Audio-Konvertierung)

## Installation

1. Installieren Sie Node.js und npm von [nodejs.org](https://nodejs.org/)

2. Installieren Sie FFmpeg:
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **CentOS/RHEL**: `sudo yum install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Laden Sie die Binärdateien von [ffmpeg.org](https://ffmpeg.org/download.html) herunter und fügen Sie sie zum PATH hinzu

3. Klonen Sie das Repository oder kopieren Sie die Serverdateien auf Ihren Server

4. Installieren Sie die Abhängigkeiten:
   ```
   cd server
   npm install
   ```

## Spracherkennung einrichten

Sie haben verschiedene Optionen für die Spracherkennung:

### Option 1: Google Speech-to-Text API (Cloud-basiert)

1. Erstellen Sie ein Google Cloud-Konto und aktivieren Sie die Speech-to-Text API
2. Erstellen Sie einen API-Schlüssel
3. Fügen Sie den API-Schlüssel in `server.js` ein (suchen Sie nach `YOUR_API_KEY`)
4. Aktivieren Sie den entsprechenden Code in der `recognizeSpeech`-Funktion

### Option 2: Vosk (lokal, offline-fähig)

1. Installieren Sie Vosk:
   ```
   npm install vosk
   ```

2. Laden Sie ein passendes Sprachmodell herunter von [alphacephei.com/vosk/models](https://alphacephei.com/vosk/models)

3. Implementieren Sie die Vosk-API in der `recognizeSpeech`-Funktion. Hier ist ein Beispiel:
   ```javascript
   const vosk = require('vosk');
   const fs = require('fs');
   const { Readable } = require('stream');
   const wav = require('wav');

   // Laden Sie das Modell beim Start
   const MODEL_PATH = path.join(__dirname, 'models/vosk-model-de-0.21');
   const model = new vosk.Model(MODEL_PATH);

   async function recognizeSpeech(audioFilePath, languageCode) {
     return new Promise((resolve, reject) => {
       try {
         const recognizer = new vosk.Recognizer({model: model, sampleRate: 16000});
         
         const wfReader = new wav.Reader();
         const wfReadable = new Readable().wrap(wfReader);
         
         wfReader.on('format', () => {
           wfReadable.on('data', (data) => {
             if (recognizer.acceptWaveform(data)) {
               const result = recognizer.result();
               resolve(result.text);
             }
           });
           
           wfReadable.on('end', () => {
             const finalResult = recognizer.finalResult();
             resolve(finalResult.text);
             recognizer.free();
           });
         });
         
         fs.createReadStream(audioFilePath).pipe(wfReader);
       } catch (error) {
         reject(error);
       }
     });
   }
   ```

### Option 3: Mozilla DeepSpeech (lokal, offline-fähig)

Eine weitere Option wäre DeepSpeech, die ähnlich wie Vosk funktioniert, aber andere Sprachmodelle verwendet.

## Server starten

```
npm start
```

Für die Entwicklung mit automatischem Neuladen:
```
npm run dev
```

Der Server läuft dann auf Port 3000 (oder dem in der Umgebungsvariable `PORT` angegebenen Port).

## Verbinden mit dem Client

Die Web-Anwendung muss auf dieselbe WebSocket-URL zugreifen. Ändern Sie in der Datei `js/audioProcessor.js` des Client die WebSocket-Verbindung URL, sodass sie auf Ihren Server zeigt.

## Fehlerbehebung

- **FFmpeg nicht gefunden**: Stellen Sie sicher, dass FFmpeg installiert ist und im PATH verfügbar ist
- **Sprachmodelle nicht gefunden**: Überprüfen Sie die Pfade zu den Sprachmodellen
- **Verbindungsprobleme**: Überprüfen Sie Firewall-Einstellungen und ob der Server auf dem richtigen Port läuft 