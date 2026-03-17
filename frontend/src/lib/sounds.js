export const BUILT_IN_SOUNDS = {
  'Feather Turn': {
    name: 'Feather Turn',
    description: 'Very soft paper whisper',
    url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
  },
  'Classic Paper': {
    name: 'Classic Paper',
    description: 'Natural light flip',
    url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
  },
  'Warm Brush': {
    name: 'Warm Brush',
    description: 'Gentle textured page sweep',
    url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
  },
  'Deluxe Hardcover': {
    name: 'Deluxe Hardcover',
    description: 'Slightly richer bound-book flip',
    url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
  },
  'Whisper Luxe': {
    name: 'Whisper Luxe',
    description: 'Soft premium muted flip',
    url: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
  }
};

export const playSound = (soundName, volume = 0.7) => {
  const sound = BUILT_IN_SOUNDS[soundName];
  if (sound && sound.url) {
    const audio = new Audio(sound.url);
    audio.volume = volume;
    audio.play().catch(err => console.log('Sound play failed:', err));
  }
};
