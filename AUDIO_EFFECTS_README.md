# Audio Effects Implementation with RubberBand WASM

This implementation adds pitch and tempo control functionality to the music player using the `rubberband-wasm` library for high-quality audio time-stretching and pitch-shifting.

## Features Added

### 1. Audio Effects Hook (`useAudioEffects.tsx`)
- **Tempo Control**: Adjust playback speed from 0.5x to 2.0x (50% to 200%)
- **Pitch Control**: Adjust pitch from -12 to +12 semitones
- **Real-time Processing**: Uses RubberBand WASM for high-quality audio processing
- **Memory Management**: Proper cleanup and memory management for WASM operations

### 2. Audio Effects Component (`audio-effects.tsx`)
- **Tempo Slider**: Visual slider showing percentage (50% - 200%)
- **Pitch Slider**: Visual slider showing semitones (-12 to +12 st)
- **Apply Button**: Processes audio with current settings
- **Reset Button**: Resets both effects to default values
- **Real-time Feedback**: Shows current values while adjusting

### 3. Enhanced Audio Player (`audio-player.tsx`)
- **Web Audio API Integration**: Plays processed audio using Web Audio API
- **Desktop & Mobile Support**: Effects panel available on both layouts
- **Settings Toggle**: Gear icon to show/hide effects panel
- **Dual Playback**: Supports both original and processed audio

## How It Works

1. **User Interaction**: User adjusts tempo and pitch sliders
2. **Audio Loading**: When "Apply Effects" is clicked, the original audio is fetched
3. **WASM Processing**: Audio is processed using RubberBand WASM library
4. **Playback**: Processed audio is played using Web Audio API instead of HTML5 audio

## Technical Implementation

### RubberBand WASM Integration
```javascript
// Initialize WASM module
const wasm = await WebAssembly.compileStreaming(fetch('/rubberband.wasm'))
const rbApi = await RubberBandInterface.initialize(wasm)

// Create processing state
const rbState = rbApi.rubberband_new(sampleRate, channels, 0, 1, 1)
rbApi.rubberband_set_pitch_scale(rbState, pitchScale)
rbApi.rubberband_set_time_ratio(rbState, tempoRatio)

// Process audio in chunks
rbApi.rubberband_study(rbState, channelArrayPtr, remaining, isFinal ? 1 : 0)
rbApi.rubberband_process(rbState, channelArrayPtr, remaining, isFinal ? 1 : 0)
```

### Web Audio API Playback
```javascript
// Create audio context and nodes
const audioContext = new AudioContext()
const sourceNode = audioContext.createBufferSource()
const gainNode = audioContext.createGain()

// Connect and play processed audio
sourceNode.buffer = processedAudioBuffer
sourceNode.connect(gainNode)
gainNode.connect(audioContext.destination)
sourceNode.start()
```

### UI Integration
- **Mobile**: Effects panel slides in from the expanded player modal
- **Desktop**: Effects panel appears below the main player controls
- **Visual Feedback**: Settings icon changes color when effects are active

## Files Modified/Added

### New Files:
- `resources/js/hooks/useAudioEffects.tsx` - Audio processing hook
- `resources/js/components/audio-effects.tsx` - Effects UI component
- `public/rubberband.wasm` - WebAssembly binary

### Modified Files:
- `resources/js/components/audio-player.tsx` - Enhanced with effects support
- `package.json` - Added rubberband-wasm dependency

## Usage

1. **Open the Music Player**: Start playing any song
2. **Access Effects**: Click the gear/settings icon to show effects panel
3. **Adjust Controls**: Use the tempo and pitch sliders
4. **Apply Effects**: Click "Apply Effects" to process and play the modified audio
5. **Reset**: Use the "Reset" button to return to default values

## Performance Notes

- Processing is done on-demand when "Apply Effects" is clicked
- WASM processing may take a few seconds depending on audio length
- Processed audio is cached until new effects are applied
- Memory is properly managed and cleaned up after processing

## Browser Compatibility

- Requires modern browsers with WebAssembly support
- Web Audio API required for processed audio playback
- Tested on Chrome, Firefox, Safari, and Edge

## Dependencies

- `rubberband-wasm@^3.3.0` - Audio processing library
- Web Audio API - For processed audio playback
- WebAssembly - For WASM module execution