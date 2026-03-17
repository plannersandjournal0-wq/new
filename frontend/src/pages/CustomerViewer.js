import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, getImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Lock, RotateCw, Maximize, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { playSound } from '@/lib/sounds';

const CustomerViewer = () => {
  const { slug } = useParams();
  const [storybook, setStorybook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [fillScreen, setFillScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const viewerRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const touchStartRef = useRef(null);

  useEffect(() => {
    loadStorybook();
  }, [slug]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (authenticated && storybook) {
      resetHideControlsTimer();
    }
    
    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, [authenticated, storybook]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const resetHideControlsTimer = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    
    setShowControls(true);
    
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleUserActivity = () => {
    resetHideControlsTimer();
  };

  const loadStorybook = async () => {
    try {
      const data = await api.getStorybookBySlug(slug);
      setStorybook(data);
      
      if (data.passwordProtected) {
        setRequiresPassword(true);
      } else {
        setAuthenticated(true);
      }

      if (data.settings?.soundEnabled !== undefined) {
        setSoundOn(data.settings.soundEnabled);
      }
    } catch (error) {
      toast.error('Storybook not found');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      toast.error('Please enter password');
      return;
    }

    setVerifying(true);
    try {
      const result = await api.verifyPassword(storybook.id, password);
      if (result.valid) {
        setAuthenticated(true);
        setRequiresPassword(false);
        toast.success('Access granted!');
      } else {
        toast.error('Invalid password');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const goToPrevious = () => {
    if (currentSpread > 0) {
      setImageLoading(true);
      setCurrentSpread(currentSpread - 1);
      // Play sound reliably
      if (soundOn && storybook.settings?.soundEnabled && storybook.settings?.defaultSound) {
        setTimeout(() => {
          playSound(storybook.settings.defaultSound, storybook.settings.soundVolume || 0.7);
        }, 50);
      }
      resetHideControlsTimer();
    }
  };

  const goToNext = () => {
    if (currentSpread < storybook.spreads.length - 1) {
      setImageLoading(true);
      setCurrentSpread(currentSpread + 1);
      // Play sound reliably
      if (soundOn && storybook.settings?.soundEnabled && storybook.settings?.defaultSound) {
        setTimeout(() => {
          playSound(storybook.settings.defaultSound, storybook.settings.soundVolume || 0.7);
        }, 50);
      }
      resetHideControlsTimer();
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    resetHideControlsTimer();
  };

  const handleFillScreen = () => {
    setFillScreen(!fillScreen);
    resetHideControlsTimer();
  };

  const handleFullscreen = async () => {
    if (!viewerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await viewerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      toast.error('Fullscreen not supported');
    }
    resetHideControlsTimer();
  };

  // Touch swipe handlers
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    resetHideControlsTimer();
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStartRef.current - touchEnd;

    // Swipe threshold: 50px
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swiped left - go to next
        goToNext();
      } else {
        // Swiped right - go to previous
        goToPrevious();
      }
    }

    touchStartRef.current = null;
  };

  // Tap zone handlers for mobile
  const handleTapZone = (direction) => {
    if (direction === 'left') {
      goToPrevious();
    } else {
      goToNext();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-magical-ink flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-magical-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-magical-cream font-serif text-lg">Loading your story...</p>
        </div>
      </div>
    );
  }

  if (!storybook) {
    return (
      <div className="min-h-screen bg-magical-ink flex items-center justify-center">
        <div className="text-center">
          <p className="text-magical-cream font-serif text-xl">Storybook not found</p>
        </div>
      </div>
    );
  }

  if (requiresPassword && !authenticated) {
    return (
      <div className="min-h-screen bg-magical-ink flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-floating p-10 border border-magical-moon/20">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-magical-ink rounded-full mb-4">
                <Lock className="w-8 h-8 text-magical-gold" />
              </div>
              <h2 className="text-3xl font-serif text-magical-ink mb-2" data-testid="password-gate-title">
                {storybook.title}
              </h2>
              {storybook.subtitle && (
                <p className="text-magical-plum font-sans text-sm">
                  {storybook.subtitle}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-sans font-medium text-magical-ink mb-2">
                  This storybook is password protected
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  placeholder="Enter password"
                  className="bg-white/50 border-magical-ink/10 focus:border-magical-rose rounded-lg"
                  data-testid="customer-password-input"
                />
              </div>

              <Button
                onClick={handlePasswordSubmit}
                disabled={verifying || !password}
                className="w-full bg-magical-ink text-magical-cream hover:bg-magical-plum transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 px-8 py-6 rounded-full font-serif tracking-wide text-base"
                data-testid="customer-password-submit"
              >
                {verifying ? 'Verifying...' : 'Enter Storybook'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalSpreads = storybook.spreads.length;
  const themeBackground = storybook.settings?.themePreset === 'Midnight Navy' ? '#1C2340' : '#F7F1E8';

  return (
    <div 
      ref={viewerRef}
      className="min-h-screen relative flex flex-col"
      style={{ backgroundColor: themeBackground }}
      onMouseMove={handleUserActivity}
      onTouchMove={handleUserActivity}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="customer-viewer"
    >
      <div className="flex-1 flex items-center justify-center p-2 sm:p-8 relative overflow-hidden">
        {/* Invisible tap zones for mobile */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer md:hidden"
          onClick={() => handleTapZone('left')}
          data-testid="tap-zone-left"
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-1/4 z-10 cursor-pointer md:hidden"
          onClick={() => handleTapZone('right')}
          data-testid="tap-zone-right"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpread}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="relative z-0"
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              width: fillScreen ? '100vw' : 'auto',
              height: fillScreen ? '100vh' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-magical-ink/20 backdrop-blur-sm z-10">
                <div className="w-8 h-8 border-4 border-magical-gold border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <img
              src={getImageUrl(storybook.spreads[currentSpread])}
              alt={`Spread ${currentSpread + 1}`}
              loading="eager"
              onLoad={() => setImageLoading(false)}
              className={`shadow-2xl page-shadow transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'} ${fillScreen ? 'w-full h-full' : 'max-h-[75vh] sm:max-h-[85vh] w-auto max-w-[95vw]'}`}
              style={{
                borderRadius: storybook.settings?.roundedCorners ? `${storybook.settings.cornerRadius}px` : '0px',
                objectFit: fillScreen ? 'contain' : 'initial'
              }}
              data-testid="viewer-spread-image"
            />
          </motion.div>
        </AnimatePresence>

        {/* Mobile-responsive controls - More compact on mobile */}
        {showControls && (
          <div className="absolute bottom-2 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-0.5 sm:gap-2 bg-black/70 backdrop-blur-xl px-2 sm:px-6 py-1.5 sm:py-3 rounded-full border border-white/10 z-20 shadow-xl">
            <Button
              onClick={goToPrevious}
              disabled={currentSpread === 0}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 h-7 w-7 sm:h-10 sm:w-10 p-0 disabled:opacity-30"
              data-testid="viewer-prev-button"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            
            {storybook.settings?.showPageNumbers && (
              <span className="text-white font-sans text-[10px] sm:text-sm px-1.5 sm:px-4 min-w-[45px] sm:min-w-[60px] text-center" data-testid="viewer-page-indicator">
                {currentSpread + 1}/{totalSpreads}
              </span>
            )}
            
            <Button
              onClick={goToNext}
              disabled={currentSpread === totalSpreads - 1}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 h-7 w-7 sm:h-10 sm:w-10 p-0 disabled:opacity-30"
              data-testid="viewer-next-button"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>

            <div className="mx-0.5 sm:mx-2 h-4 sm:h-6 w-px bg-white/20" />

            <Button
              onClick={handleRotate}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 h-7 w-7 sm:h-10 sm:w-10 p-0"
              title="Rotate 90°"
              data-testid="viewer-rotate"
            >
              <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <Button
              onClick={handleFillScreen}
              size="sm"
              variant="ghost"
              className={`text-white hover:bg-white/20 h-7 w-7 sm:h-10 sm:w-10 p-0 ${fillScreen ? 'bg-white/20' : ''}`}
              title="Fill Screen"
              data-testid="viewer-fill-screen"
            >
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <Button
              onClick={handleFullscreen}
              size="sm"
              variant="ghost"
              className={`text-white hover:bg-white/20 h-7 w-7 sm:h-10 sm:w-10 p-0 ${isFullscreen ? 'bg-white/20' : ''}`}
              title="Fullscreen"
              data-testid="viewer-fullscreen"
            >
              <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            {storybook.settings?.soundEnabled && (
              <Button
                onClick={() => setSoundOn(!soundOn)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20 h-7 w-7 sm:h-10 sm:w-10 p-0"
                title={soundOn ? "Mute" : "Unmute"}
                data-testid="viewer-sound-toggle"
              >
                {soundOn ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerViewer;
