// Sound generation using Web Audio API for realistic page flip sounds

export const BUILT_IN_SOUNDS = {
  'Feather Turn': {
    name: 'Feather Turn',
    description: 'Very soft paper whisper',
    type: 'feather'
  },
  'Classic Paper': {
    name: 'Classic Paper',
    description: 'Natural light flip',
    type: 'classic'
  },
  'Warm Brush': {
    name: 'Warm Brush',
    description: 'Gentle textured page sweep',
    type: 'brush'
  },
  'Deluxe Hardcover': {
    name: 'Deluxe Hardcover',
    description: 'Slightly richer bound-book flip',
    type: 'hardcover'
  },
  'Whisper Luxe': {
    name: 'Whisper Luxe',
    description: 'Soft premium muted flip',
    type: 'whisper'
  }
};

// Generate realistic page flip sound using Web Audio API
const generatePageFlipSound = (type, volume) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const duration = type === 'hardcover' ? 0.3 : 0.2;
    
    // Create oscillator for the swoosh sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Configure based on sound type
    switch (type) {
      case 'feather':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + duration);
        break;
      case 'classic':
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + duration);
        break;
      case 'brush':
        oscillator.frequency.setValueAtTime(700, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(180, audioContext.currentTime + duration);
        break;
      case 'hardcover':
        oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + duration);
        break;
      case 'whisper':
        oscillator.frequency.setValueAtTime(900, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(250, audioContext.currentTime + duration);
        break;
      default:
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + duration);
    }
    
    oscillator.type = 'sine';
    
    // Create envelope for natural sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    // Connect and play
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
    
    // Clean up
    setTimeout(() => {
      try {
        audioContext.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }, duration * 1000 + 100);
    
    return true;
  } catch (error) {
    console.log('Web Audio API not supported:', error);
    return false;
  }
};

export const playSound = (soundName, volume = 0.7) => {
  const sound = BUILT_IN_SOUNDS[soundName];
  if (sound && sound.type) {
    generatePageFlipSound(sound.type, volume);
  }
};
