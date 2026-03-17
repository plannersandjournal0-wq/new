import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, getImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Lock, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  
  const viewerRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const imageCache = useRef(new Set());

  useEffect(() => {
    loadStorybook();
  }, [slug]);

  // Detect orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Auto-hide controls after 15 seconds
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

  // Smart image preloading - prioritize next, then next+1, then previous
  useEffect(() => {
    if (!storybook || !authenticated) return;

    const preloadImage = (index) => {
      if (index >= 0 && index < storybook.spreads.length && !imageCache.current.has(index)) {
        const img = new Image();
        img.src = getImageUrl(storybook.spreads[index]);
        img.onload = () => {
          imageCache.current.add(index);
        };
      }
    };

    // Preload in priority order
    preloadImage(currentSpread + 1); // Next spread (highest priority)
    preloadImage(currentSpread + 2); // Next+1
    preloadImage(currentSpread - 1); // Previous
  }, [currentSpread, storybook, authenticated]);

  // Reset rotation when changing spreads
  useEffect(() => {
    setRotation(0);
  }, [currentSpread]);

  const resetHideControlsTimer = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    
    setShowControls(true);
    
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 15000);
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

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
    }

    touchStartRef.current = null;
  };

  const handleTapZone = (direction) => {
    if (direction === 'left') {
      goToPrevious();
    } else {
      goToNext();
    }
  };

  const getNavigationComponent = () => {
    const navStyle = storybook.settings?.navLayout || 'AirBar';
    const toolbarStyle = storybook.settings?.toolbarStyle || 'Glass';
    const totalSpreads = storybook.spreads.length;

    // Get toolbar background based on style
    const getToolbarBg = () => {
      switch (toolbarStyle) {
        case 'Solid Dark':
          return 'bg-black/90';
        case 'Soft Light':
          return 'bg-white/90';
        case 'Invisible Minimal':
          return 'bg-black/30';
        case 'Glass':
        default:
          return 'bg-black/70 backdrop-blur-xl';
      }
    };

    const toolbarBg = getToolbarBg();

    const controls = (className = '') => (
      <>
        <Button
          onClick={goToPrevious}
          disabled={currentSpread === 0}
          size="sm"
          variant="ghost"
          className={`text-white hover:bg-white/20 disabled:opacity-30 ${className}`}
          data-testid="viewer-prev-button"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
        
        {storybook.settings?.showPageNumbers && (
          <span className="text-white font-sans text-xs sm:text-sm px-2 sm:px-4 text-center" data-testid="viewer-page-indicator">
            {currentSpread + 1}/{totalSpreads}
          </span>
        )}
        
        <Button
          onClick={goToNext}
          disabled={currentSpread === totalSpreads - 1}
          size="sm"
          variant="ghost"
          className={`text-white hover:bg-white/20 disabled:opacity-30 ${className}`}
          data-testid="viewer-next-button"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>

        <div className="mx-1 sm:mx-2 h-5 sm:h-6 w-px bg-white/20" />

        <Button
          onClick={handleRotate}
          size="sm"
          variant="ghost"
          className={`text-white hover:bg-white/20 ${rotation !== 0 ? 'bg-white/20 ring-2 ring-white/40' : ''} ${className}`}
          title="Rotate 90°"
          data-testid="viewer-rotate"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>

        <Button
          onClick={handleFullscreen}
          size="sm"
          variant="ghost"
          className={`text-white hover:bg-white/20 ${isFullscreen ? 'bg-white/20 ring-2 ring-white/40' : ''} ${className}`}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          data-testid="viewer-fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
        </Button>

        {storybook.settings?.soundEnabled && (
          <Button
            onClick={() => setSoundOn(!soundOn)}
            size="sm"
            variant="ghost"
            className={`text-white hover:bg-white/20 ${className}`}
            title={soundOn ? "Mute" : "Unmute"}
            data-testid="viewer-sound-toggle"
          >
            {soundOn ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </Button>
        )}
      </>
    );

    // PORTRAIT MODE: Always horizontal at bottom for all styles except GhostEdges
    if (isPortrait && navStyle !== 'GhostEdges') {
      return (
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 sm:gap-2 ${toolbarBg} px-3 sm:px-6 py-2 sm:py-3 rounded-full border border-white/10 shadow-2xl max-w-[95vw] flex-wrap justify-center`}>
          {controls('h-8 w-8 sm:h-9 sm:w-9 p-0')}
        </div>
      );
    }

    // LANDSCAPE MODE OR DESKTOP
    switch (navStyle) {
      case 'AirBar':
        return (
          <div className={`absolute ${isPortrait ? 'bottom-4' : 'left-4 top-1/2 -translate-y-1/2'} ${isPortrait ? 'left-1/2 -translate-x-1/2' : ''} flex ${isPortrait ? 'flex-row' : 'flex-col'} items-center gap-2 ${toolbarBg} px-4 py-3 ${isPortrait ? 'rounded-full' : 'rounded-2xl'} border border-white/10 shadow-2xl`}>
            {controls('h-9 w-9 p-0')}
          </div>
        );

      case 'CinemaDock':
        return (
          <div className={`absolute ${isPortrait ? 'bottom-0 left-0 right-0' : 'left-0 top-0 bottom-0'} flex ${isPortrait ? 'flex-row' : 'flex-col'} items-center justify-center gap-3 ${toolbarBg} ${isPortrait ? 'px-8 py-4' : 'px-4 py-8'} ${isPortrait ? 'border-t' : 'border-r'} border-white/10`}>
            {controls('h-10 w-10 p-0')}
          </div>
        );

      case 'SideRails':
        if (isPortrait) {
          // Mobile fallback: horizontal bottom bar
          return (
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row items-center gap-2 ${toolbarBg} px-4 py-3 rounded-full border border-white/10 shadow-2xl`}>
              {controls('h-8 w-8 p-0')}
            </div>
          );
        }
        // Landscape: true side rails
        return (
          <>
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 ${toolbarBg} p-2 rounded-2xl border border-white/10`}>
              <Button onClick={goToPrevious} disabled={currentSpread === 0} size="sm" variant="ghost" className="text-white hover:bg-white/20 h-10 w-10 p-0 disabled:opacity-30">
                <ChevronLeft className="w-6 h-6" />
              </Button>
            </div>
            <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 ${toolbarBg} p-2 rounded-2xl border border-white/10`}>
              <Button onClick={goToNext} disabled={currentSpread === totalSpreads - 1} size="sm" variant="ghost" className="text-white hover:bg-white/20 h-10 w-10 p-0 disabled:opacity-30">
                <ChevronRight className="w-6 h-6" />
              </Button>
            </div>
            {storybook.settings?.showPageNumbers && (
              <div className={`absolute top-4 left-1/2 -translate-x-1/2 ${toolbarBg} px-4 py-2 rounded-full`}>
                <span className="text-white font-sans text-sm">{currentSpread + 1}/{totalSpreads}</span>
              </div>
            )}
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-row items-center gap-2 ${toolbarBg} px-4 py-2 rounded-full border border-white/10`}>
              <Button onClick={handleRotate} size="sm" variant="ghost" className={`text-white hover:bg-white/20 h-8 w-8 p-0 ${rotation !== 0 ? 'bg-white/20' : ''}`}>
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button onClick={handleFullscreen} size="sm" variant="ghost" className={`text-white hover:bg-white/20 h-8 w-8 p-0 ${isFullscreen ? 'bg-white/20' : ''}`}>
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
              {storybook.settings?.soundEnabled && (
                <Button onClick={() => setSoundOn(!soundOn)} size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 p-0">
                  {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </Button>
              )}
            </div>
          </>
        );

      case 'HaloTop':
        return (
          <div className={`absolute ${isPortrait ? 'top-4' : 'left-4 top-1/2 -translate-y-1/2'} ${isPortrait ? 'left-1/2 -translate-x-1/2' : ''} flex ${isPortrait ? 'flex-row' : 'flex-col'} items-center gap-2 ${toolbarBg} px-4 py-3 ${isPortrait ? 'rounded-full' : 'rounded-2xl'} border border-white/10 shadow-lg`}>
            {controls('h-9 w-9 p-0')}
          </div>
        );

      case 'GhostEdges':
        return (
          <>
            <Button
              onClick={goToPrevious}
              disabled={currentSpread === 0}
              size="sm"
              variant="ghost"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-12 w-12 p-0 disabled:opacity-20"
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
            <Button
              onClick={goToNext}
              disabled={currentSpread === totalSpreads - 1}
              size="sm"
              variant="ghost"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-12 w-12 p-0 disabled:opacity-20"
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
            {storybook.settings?.showPageNumbers && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white/90 font-sans text-xs">{currentSpread + 1}/{totalSpreads}</span>
              </div>
            )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 flex gap-1 bg-black/40 backdrop-blur-sm p-1 rounded-full"
            >
              <Button onClick={handleRotate} size="sm" variant="ghost" className={`text-white/70 hover:text-white h-8 w-8 p-0 ${rotation !== 0 ? 'bg-white/20' : ''}`}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button onClick={handleFullscreen} size="sm" variant="ghost" className={`text-white/70 hover:text-white h-8 w-8 p-0 ${isFullscreen ? 'bg-white/20' : ''}`}>
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              {storybook.settings?.soundEnabled && (
                <Button onClick={() => setSoundOn(!soundOn)} size="sm" variant="ghost" className="text-white/70 hover:text-white h-8 w-8 p-0">
                  {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </Button>
              )}
            </motion.div>
          </>
        );

      default:
        return null;
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
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-floating p-6 sm:p-10 border border-magical-moon/20">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-magical-ink rounded-full mb-4">
                <Lock className="w-8 h-8 text-magical-gold" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-magical-ink mb-2" data-testid="password-gate-title">
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
                className="w-full bg-magical-ink text-magical-cream hover:bg-magical-plum transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 px-6 py-5 sm:px-8 sm:py-6 rounded-full font-serif tracking-wide text-base"
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

  const themeBackground = storybook.settings?.themePreset === 'Midnight Navy' ? '#1C2340' : '#F7F1E8';
  
  // Calculate image dimensions based on rotation
  const isRotated = rotation === 90 || rotation === 270;

  return (
    <div 
      ref={viewerRef}
      className="min-h-screen relative flex flex-col overflow-hidden"
      style={{ backgroundColor: themeBackground }}
      onMouseMove={handleUserActivity}
      onTouchMove={handleUserActivity}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      data-testid="customer-viewer"
    >
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8 relative">
        {/* Tap zones */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-[20%] z-10 cursor-pointer"
          onClick={() => handleTapZone('left')}
          data-testid="tap-zone-left"
        />
        <div 
          className="absolute right-0 top-0 bottom-0 w-[20%] z-10 cursor-pointer"
          onClick={() => handleTapZone('right')}
          data-testid="tap-zone-right"
        />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpread}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-0"
          >
            {imageLoading && (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-magical-plum/5 via-magical-rose/5 to-magical-plum/5 rounded-xl z-10"
                style={{
                  width: isRotated ? '70vh' : '95vw',
                  height: isRotated ? '95vw' : '70vh',
                  maxWidth: isRotated ? '80vh' : '90vw',
                  maxHeight: isRotated ? '90vw' : '85vh'
                }}
              >
                <div className="w-10 h-10 border-4 border-magical-gold border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <img
              src={getImageUrl(storybook.spreads[currentSpread])}
              alt={`Spread ${currentSpread + 1}`}
              loading="eager"
              onLoad={() => setImageLoading(false)}
              className={`shadow-2xl page-shadow transition-opacity duration-300 object-contain ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                borderRadius: storybook.settings?.roundedCorners ? `${storybook.settings.cornerRadius}px` : '0px',
                maxWidth: isRotated ? '85vh' : '95vw',
                maxHeight: isRotated ? '95vw' : '85vh',
                width: 'auto',
                height: 'auto'
              }}
              data-testid="viewer-spread-image"
            />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="z-20"
            >
              {getNavigationComponent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomerViewer;
