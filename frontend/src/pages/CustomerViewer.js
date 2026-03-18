import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, getImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Volume2, VolumeX, Lock, Maximize2, Minimize2, Hash, X } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [showGoTo, setShowGoTo] = useState(false);
  const [goToValue, setGoToValue] = useState('');
  const [shakeGoTo, setShakeGoTo] = useState(false);
  
  const viewerRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const imageCache = useRef(new Map());
  const loadingImages = useRef(new Set());
  const goToRef = useRef(null);

  useEffect(() => {
    loadStorybook();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [slug]);

  // Auto-hide controls after 14 seconds
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

  // Close GoTo popup on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showGoTo && goToRef.current && !goToRef.current.contains(e.target)) {
        setShowGoTo(false);
        setGoToValue('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showGoTo]);

  // Smart image preloading
  useEffect(() => {
    if (!storybook || !authenticated) return;

    const preloadImage = (index) => {
      if (index < 0 || index >= storybook.spreads.length) return;
      if (imageCache.current.has(index)) return;
      if (loadingImages.current.has(index)) return;

      loadingImages.current.add(index);
      
      const img = new Image();
      const url = getImageUrl(storybook.spreads[index]);
      
      img.onload = () => {
        imageCache.current.set(index, img);
        loadingImages.current.delete(index);
      };
      
      img.onerror = () => {
        loadingImages.current.delete(index);
      };
      
      img.src = url;
    };

    if (!imageCache.current.has(currentSpread)) {
      preloadImage(currentSpread);
    }
    preloadImage(currentSpread + 1);
    preloadImage(currentSpread + 2);
    preloadImage(currentSpread - 1);
  }, [currentSpread, storybook, authenticated]);

  const resetHideControlsTimer = () => {
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    
    setShowControls(true);
    
    hideControlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 14000);
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
      setCurrentSpread(currentSpread + 1);
      if (soundOn && storybook.settings?.soundEnabled && storybook.settings?.defaultSound) {
        setTimeout(() => {
          playSound(storybook.settings.defaultSound, storybook.settings.soundVolume || 0.7);
        }, 50);
      }
      resetHideControlsTimer();
    }
  };

  const handleGoToPage = () => {
    const pageNum = parseInt(goToValue);
    const totalSpreads = storybook.spreads.length;

    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalSpreads) {
      // Shake animation
      setShakeGoTo(true);
      setTimeout(() => setShakeGoTo(false), 500);
      return;
    }

    // Navigate to page
    setCurrentSpread(pageNum - 1);
    if (soundOn && storybook.settings?.soundEnabled && storybook.settings?.defaultSound) {
      setTimeout(() => {
        playSound(storybook.settings.defaultSound, storybook.settings.soundVolume || 0.7);
      }, 50);
    }

    // Close popup
    setShowGoTo(false);
    setGoToValue('');
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

  // Mobile vertical left nav
  const getMobileVerticalNav = () => {
    const totalSpreads = storybook.spreads.length;
    const toolbarStyle = storybook.settings?.toolbarStyle || 'Glass';
    
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
    const textColor = toolbarStyle === 'Soft Light' ? 'text-magical-ink' : 'text-white';

    return (
      <div className={`fixed left-3 top-1/2 -translate-y-1/2 z-20 ${toolbarBg} rounded-full py-3 px-1 flex flex-col items-center gap-1 shadow-2xl border border-white/10`}>
        <Button
          onClick={goToPrevious}
          disabled={currentSpread === 0}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-10 w-10 p-0 disabled:opacity-30 rounded-full`}
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        
        {storybook.settings?.showPageNumbers && (
          <span className={`${textColor} font-sans text-[10px] px-1 text-center leading-tight my-1`}>
            {currentSpread + 1}<br />{totalSpreads}
          </span>
        )}
        
        <Button
          onClick={goToNext}
          disabled={currentSpread === totalSpreads - 1}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-10 w-10 p-0 disabled:opacity-30 rounded-full`}
        >
          <ChevronDown className="w-5 h-5" />
        </Button>

        <div className={`w-6 h-px my-1 ${toolbarStyle === 'Soft Light' ? 'bg-magical-ink/20' : 'bg-white/20'}`} />

        <Button
          onClick={() => {
            setShowGoTo(!showGoTo);
            resetHideControlsTimer();
          }}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-10 w-10 p-0 rounded-full`}
        >
          <Hash className="w-5 h-5" />
        </Button>

        <Button
          onClick={handleFullscreen}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-10 w-10 p-0 rounded-full ${isFullscreen ? 'bg-white/20' : ''}`}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </Button>

        {storybook.settings?.soundEnabled && (
          <Button
            onClick={() => setSoundOn(!soundOn)}
            size="sm"
            variant="ghost"
            className={`${textColor} hover:bg-white/20 h-10 w-10 p-0 rounded-full`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        )}

        <div className={`w-6 h-px my-1 ${toolbarStyle === 'Soft Light' ? 'bg-magical-ink/20' : 'bg-white/20'}`} />
      </div>
    );
  };

  // Desktop navigation (unchanged)
  const getDesktopNavigation = () => {
    const navStyle = storybook.settings?.navLayout || 'AirBar';
    const toolbarStyle = storybook.settings?.toolbarStyle || 'Glass';
    const totalSpreads = storybook.spreads.length;

    const getToolbarBg = () => {
      switch (toolbarStyle) {
        case 'Solid Dark':
          return 'bg-black/90';
        case 'Soft Light':
          return 'bg-white/90 text-magical-ink';
        case 'Invisible Minimal':
          return 'bg-black/30';
        case 'Glass':
        default:
          return 'bg-black/70 backdrop-blur-xl';
      }
    };

    const toolbarBg = getToolbarBg();
    const textColor = toolbarStyle === 'Soft Light' ? 'text-magical-ink' : 'text-white';

    // Navigation components (same as before for desktop)
    switch (navStyle) {
      case 'CinemaDock':
        return (
          <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 ${toolbarBg} px-8 py-4 border-t border-white/10`}>
            <Button onClick={goToPrevious} disabled={currentSpread === 0} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-10 w-10 p-0`}>
              <ChevronUp className="w-6 h-6" />
            </Button>
            {storybook.settings?.showPageNumbers && <span className={`${textColor} font-sans text-sm px-4`}>{currentSpread + 1}/{totalSpreads}</span>}
            <Button onClick={goToNext} disabled={currentSpread === totalSpreads - 1} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-10 w-10 p-0`}>
              <ChevronDown className="w-6 h-6" />
            </Button>
            <div className="mx-2 h-6 w-px bg-white/20" />
            <Button onClick={handleFullscreen} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-10 w-10 p-0`}>
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            {storybook.settings?.soundEnabled && (
              <Button onClick={() => setSoundOn(!soundOn)} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-10 w-10 p-0`}>
                {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            )}
          </div>
        );

      case 'GhostEdges':
        return (
          <>
            <Button onClick={goToPrevious} disabled={currentSpread === 0} size="sm" variant="ghost" className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-12 w-12 p-0">
              <ChevronUp className="w-8 h-8" />
            </Button>
            <Button onClick={goToNext} disabled={currentSpread === totalSpreads - 1} size="sm" variant="ghost" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 h-12 w-12 p-0">
              <ChevronDown className="w-8 h-8" />
            </Button>
            {storybook.settings?.showPageNumbers && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full">
                <span className="text-white/90 font-sans text-xs">{currentSpread + 1}/{totalSpreads}</span>
              </div>
            )}
          </>
        );

      default:
        return (
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 ${toolbarBg} px-4 py-3 rounded-full border border-white/10 shadow-2xl`}>
            <Button onClick={goToPrevious} disabled={currentSpread === 0} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-9 w-9 p-0`}>
              <ChevronUp className="w-6 h-6" />
            </Button>
            {storybook.settings?.showPageNumbers && <span className={`${textColor} font-sans text-sm px-4`}>{currentSpread + 1}/{totalSpreads}</span>}
            <Button onClick={goToNext} disabled={currentSpread === totalSpreads - 1} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-9 w-9 p-0`}>
              <ChevronDown className="w-6 h-6" />
            </Button>
            <div className="mx-2 h-6 w-px bg-white/20" />
            <Button onClick={handleFullscreen} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-9 w-9 p-0`}>
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
            {storybook.settings?.soundEnabled && (
              <Button onClick={() => setSoundOn(!soundOn)} size="sm" variant="ghost" className={`${textColor} hover:bg-white/20 h-9 w-9 p-0`}>
                {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            )}
          </div>
        );
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
              <h2 className="text-2xl sm:text-3xl font-serif text-magical-ink mb-2">
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
                />
              </div>

              <Button
                onClick={handlePasswordSubmit}
                disabled={verifying || !password}
                className="w-full bg-magical-ink text-magical-cream hover:bg-magical-plum transition-all shadow-lg px-6 py-5 sm:px-8 sm:py-6 rounded-full font-serif"
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
  const currentImageCached = imageCache.current.has(currentSpread);

  // Apply forced landscape transform on mobile portrait
  const shouldForceLandscape = isMobile && isPortrait;
  const landscapeStyles = shouldForceLandscape ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vh',
    height: '100vw',
    transform: 'rotate(90deg) translateY(-100%)',
    transformOrigin: 'top left',
    overflow: 'hidden'
  } : {};

  return (
    <div 
      ref={viewerRef}
      className="min-h-screen relative flex flex-col"
      style={{ backgroundColor: themeBackground, ...landscapeStyles }}
      onMouseMove={handleUserActivity}
      onTouchMove={handleUserActivity}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8 relative overflow-hidden">
        {/* Tap zones */}
        <div className="absolute left-0 top-0 bottom-0 w-[20%] z-10 cursor-pointer" onClick={() => handleTapZone('left')} />
        <div className="absolute right-0 top-0 bottom-0 w-[20%] z-10 cursor-pointer" onClick={() => handleTapZone('right')} />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpread}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="relative z-0"
          >
            {!currentImageCached && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-magical-plum/5 via-magical-rose/5 to-magical-plum/5 rounded-xl z-10 min-w-[300px] min-h-[200px]">
                <div className="w-8 h-8 border-4 border-magical-gold border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <img
              src={getImageUrl(storybook.spreads[currentSpread])}
              alt={`Spread ${currentSpread + 1}`}
              loading="eager"
              className={`shadow-2xl page-shadow transition-opacity duration-200 object-contain ${currentImageCached ? 'opacity-100' : 'opacity-0'}`}
              style={{
                borderRadius: storybook.settings?.roundedCorners ? `${storybook.settings.cornerRadius}px` : '0px',
                maxWidth: '95vw',
                maxHeight: '85vh',
                width: 'auto',
                height: 'auto'
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation - Mobile vertical left nav or Desktop nav */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isMobile ? getMobileVerticalNav() : getDesktopNavigation()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Go To Page popup */}
        <AnimatePresence>
          {showGoTo && (
            <motion.div
              ref={goToRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`fixed left-16 top-1/2 -translate-y-1/2 z-30 bg-white rounded-xl shadow-2xl p-3 ${shakeGoTo ? 'animate-shake' : ''}`}
            >
              <style>{`
                @keyframes shake {
                  0%, 100% { transform: translateX(0); }
                  25% { transform: translateX(-5px); }
                  75% { transform: translateX(5px); }
                }
                .animate-shake {
                  animation: shake 0.3s ease-in-out;
                }
              `}</style>
              
              <button
                onClick={() => {
                  setShowGoTo(false);
                  setGoToValue('');
                }}
                className="absolute -top-2 -right-2 bg-magical-ink text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-magical-plum"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-2">
                <label className="text-xs font-sans font-medium text-magical-ink block">
                  Go to page
                </label>
                <Input
                  type="number"
                  min="1"
                  max={storybook.spreads.length}
                  value={goToValue}
                  onChange={(e) => setGoToValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleGoToPage()}
                  className="w-16 text-center border rounded-lg text-sm"
                  placeholder="1"
                  autoFocus
                />
                <Button
                  onClick={handleGoToPage}
                  className="w-full bg-magical-ink text-white rounded-lg px-3 py-1 text-sm hover:bg-magical-plum"
                >
                  Go
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomerViewer;
