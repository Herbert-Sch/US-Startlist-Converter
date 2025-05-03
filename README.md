# HLS Stream Captions and Translation

A web application that recognizes speech from HLS streams, transcribes it, and translates it into various languages.

## Features

- Video playback of HLS streams (compact view on the left side)
- Automatic speech recognition from stream audio
- Real-time display of recognized text
- Selection of source language for speech recognition
- Translation of recognized text into various target languages
- Chronological display of all translated texts with scrolling capability
- Compact design for small browser windows

## Installation and Usage

### Frontend Only (Basic Setup)

1. Download all files to a directory on your web server
2. Open the `index.html` file in a modern browser (Chrome or Edge recommended)
3. Enter the URL of an HLS stream and click "Load Stream"
4. Select the source language (or leave it on automatic detection)
5. Select the desired target language for translation

### Complete Setup with Backend (Recommended for Better Results)

1. **Frontend Installation:**
   - Upload all frontend files to your web server root directory

2. **Backend Installation:**
   - Ensure Node.js (v14+) and npm are installed on your server
   - Install FFmpeg on your server
   - Copy all files from the `server` directory to a location on your server
   - Run `npm install` to install dependencies
   - Start the server with `npm start` (or `npm run dev` for development)
   - The server will run on port 3000 by default

3. **Configuration:**
   - Open `js/audioProcessor.js` and update the WebSocket URL to point to your server
   - For translation capabilities, consider adding a Google Translate API key in `js/translation.js`

## Speech Recognition Notes

- Speech recognition works best in Chrome or Edge
- Good audio quality is important for accurate recognition
- Accuracy may vary depending on accent, background noise, and language complexity
- The application needs access to the microphone (for recognizing audio from the stream)

## Translation

There are two options for translation functionality:

1. **With Google Translate API** (recommended for production applications):
   - Obtain an API key for the Google Translate API
   - Insert this key in the `js/translation.js` file (variable `apiKey`)
   - Set `useGoogleTranslate` to `true`

2. **Free Alternative Method**:
   - The application works without an API key using the MyMemory Translation API
   - This is limited to 5000 characters per day

## Known Limitations

- Browser-based speech recognition has technical limitations and is not suitable for professional captioning
- Recognition does not work on all HLS streams, as the browser cannot directly access the audio of the video for technical reasons
- For a more reliable solution, a server-side approach with direct access to the audio stream is recommended

## Browser Support

- Chrome (recommended)
- Edge
- Firefox (limited support for speech recognition)
- Safari (limited support for speech recognition)

## License

Free to use and modify 