import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, getImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Volume2, VolumeX, Lock, Maximize2, Minimize2, Hash, X, RotateCcw } from 'lucide-react';
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
  const [showGoTo, setShowGoTo] = useState(false);
  const [goToValue, setGoToValue] = useState('');
  const [shakeGoTo, setShakeGoTo] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Simplified state - only what's needed
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLandscapeMode, setIsLandscapeMode] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(false);
  const rotateHintShownRef = useRef(false);
  
  const viewerRef = useRef(null);
  const hideControlsTimerRef = useRef(null);
  const touchStartRef = useRef(null);
  const imageCache = useRef(new Map());
  const loadingImages = useRef(new Set());
  const goToRef = useRef(null);

  // Load storybook and handle resize
  useEffect(() => {
    loadStorybook();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
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

  // Fullscreen change listener - handles both button clicks and system exits (swipe down, back button)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      
      // If user exited fullscreen (by any method), clean up landscape mode
      if (!isNowFullscreen) {
        const isMobileDevice = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobileDevice && screen.orientation?.unlock) {
          try {
            screen.orientation.unlock();
          } catch (e) {
            // Silently ignore unlock errors
          }
        }
        setIsLandscapeMode(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Cleanup on unmount - unlock orientation and exit fullscreen
  useEffect(() => {
    return () => {
      try {
        if (screen.orientation?.unlock) screen.orientation.unlock();
        if (document.fullscreenElement) document.exitFullscreen();
      } catch (e) {
        // Silently ignore cleanup errors
      }
    };
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
      setImageLoaded(false);
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
      setImageLoaded(false);
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
      setShakeGoTo(true);
      setTimeout(() => setShakeGoTo(false), 500);
      return;
    }

    setImageLoaded(false);
    setCurrentSpread(pageNum - 1);
    if (soundOn && storybook.settings?.soundEnabled && storybook.settings?.defaultSound) {
      setTimeout(() => {
        playSound(storybook.settings.defaultSound, storybook.settings.soundVolume || 0.7);
      }, 50);
    }

    setShowGoTo(false);
    setGoToValue('');
    resetHideControlsTimer();
  };

  // Clean fullscreen handler with orientation lock for mobile
  const handleFullscreen = async () => {
    if (!viewerRef.current) return;
    
    const isMobileDevice = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    try {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Enter fullscreen
        if (viewerRef.current.requestFullscreen) {
          await viewerRef.current.requestFullscreen();
        } else if (viewerRef.current.webkitRequestFullscreen) {
          await viewerRef.current.webkitRequestFullscreen();
        }
        
        // On mobile: switch to landscape nav mode and try orientation lock
        if (isMobileDevice) {
          // Always switch to landscape nav when entering fullscreen on mobile
          setIsLandscapeMode(true);
          
          // Try to lock orientation (works on Android, fails silently on iOS)
          if (screen.orientation?.lock) {
            try {
              await screen.orientation.lock('landscape');
            } catch (orientationErr) {
              // iOS Safari: orientation lock not supported - show rotate hint
              if (isIOS && !rotateHintShownRef.current) {
                rotateHintShownRef.current = true;
                setShowRotateHint(true);
                setTimeout(() => setShowRotateHint(false), 3000);
              }
              console.log('Orientation lock not supported on this device');
            }
          }
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
        
        // On mobile: unlock orientation and switch back to portrait nav
        if (isMobileDevice) {
          if (screen.orientation?.unlock) {
            try {
              screen.orientation.unlock();
            } catch (e) {
              // Silently ignore
            }
          }
          setIsLandscapeMode(false);
        }
      }
    } catch (error) {
      console.log('Fullscreen error:', error.message);
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

  // Helper function for toolbar styling
  const getToolbarStyles = () => {
    const toolbarStyle = storybook?.settings?.toolbarStyle || 'Glass';
    
    let bg, textColor;
    switch (toolbarStyle) {
      case 'Solid Dark':
        bg = 'bg-black/90';
        textColor = 'text-white';
        break;
      case 'Soft Light':
        bg = 'bg-white/90';
        textColor = 'text-magical-ink';
        break;
      case 'Invisible Minimal':
        bg = 'bg-black/30';
        textColor = 'text-white';
        break;
      case 'Glass':
      default:
        bg = 'bg-black/70 backdrop-blur-xl';
        textColor = 'text-white';
    }
    
    return { bg, textColor };
  };

  // Mobile Portrait Bottom Nav - horizontal bar at bottom (above Emergent badge)
  const getMobilePortraitNav = () => {
    const totalSpreads = storybook.spreads.length;
    const { bg, textColor } = getToolbarStyles();
    const dividerColor = textColor === 'text-magical-ink' ? 'bg-magical-ink/20' : 'bg-white/20';

    return (
      <div className={`fixed bottom-14 left-4 right-4 z-20 ${bg} flex items-center justify-center gap-3 px-4 py-2.5 rounded-full border border-white/10 shadow-2xl`}>
        <Button
          onClick={goToPrevious}
          disabled={currentSpread === 0}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-9 w-9 p-0 rounded-full disabled:opacity-30`}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {storybook.settings?.showPageNumbers && (
          <span className={`${textColor} font-sans text-xs px-1`}>
            {currentSpread + 1}/{totalSpreads}
          </span>
        )}

        <Button
          onClick={goToNext}
          disabled={currentSpread === totalSpreads - 1}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-9 w-9 p-0 rounded-full disabled:opacity-30`}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        <div className={`w-px h-5 ${dividerColor}`} />

        <Button
          onClick={() => { setShowGoTo(!showGoTo); resetHideControlsTimer(); }}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-9 w-9 p-0 rounded-full`}
        >
          <Hash className="w-4 h-4" />
        </Button>

        <Button
          onClick={handleFullscreen}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-9 w-9 p-0 rounded-full`}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>

        {storybook.settings?.soundEnabled && (
          <Button
            onClick={() => setSoundOn(!soundOn)}
            size="sm"
            variant="ghost"
            className={`${textColor} hover:bg-white/20 h-9 w-9 p-0 rounded-full`}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        )}
      </div>
    );
  };

  // Mobile Landscape Left Nav - vertical bar on left side (fullscreen mode)
  const getMobileLandscapeNav = () => {
    const totalSpreads = storybook.spreads.length;
    const { bg, textColor } = getToolbarStyles();
    const dividerColor = textColor === 'text-magical-ink' ? 'bg-magical-ink/20' : 'bg-white/20';

    return (
      <div className={`fixed left-3 top-1/2 -translate-y-1/2 z-20 ${bg} rounded-full py-3 px-1 flex flex-col items-center gap-1 shadow-2xl border border-white/10`}>
        <Button
          onClick={goToPrevious}
          disabled={currentSpread === 0}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-10 w-10 p-0 disabled:opacity-30 rounded-full`}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        {storybook.settings?.showPageNumbers && (
          <span className={`${textColor} font-sans text-[10px] px-1 text-center leading-tight my-1`}>
            {currentSpread + 1}/{totalSpreads}
          </span>
        )}
        
        <Button
          onClick={goToNext}
          disabled={currentSpread === totalSpreads - 1}
          size="sm"
          variant="ghost"
          className={`${textColor} hover:bg-white/20 h-10 w-10 p-0 disabled:opacity-30 rounded-full`}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>

        <div className={`w-6 h-px my-1 ${dividerColor}`} />

        <Button
          onClick={() => { setShowGoTo(!showGoTo); resetHideControlsTimer(); }}
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

        <div className={`w-6 h-px my-1 ${dividerColor}`} />
      </div>
    );
  };

  // Desktop navigation (unchanged)
  const getDesktopNavigation = () => {
    const navStyle = storybook.settings?.navLayout || 'AirBar';
    const totalSpreads = storybook.spreads.length;
    const { bg, textColor } = getToolbarStyles();

    switch (navStyle) {
      case 'CinemaDock':
        return (
          <div className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 ${bg} px-8 py-4 border-t border-white/10`}>
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
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 ${bg} px-4 py-3 rounded-full border border-white/10 shadow-2xl`}>
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

  // Determine GoTo popup positioning based on mode
  const getGoToPopupClass = () => {
    if (isMobile && isLandscapeMode) {
      // Landscape mode: position to the right of left nav
      return "fixed left-16 top-1/2 -translate-y-1/2 z-30";
    } else {
      // Portrait mode (or desktop): position above bottom nav
      return "fixed bottom-28 left-1/2 -translate-x-1/2 z-30";
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
  
  // Track if image is ready (either from cache or just loaded)
  const isImageReady = imageCache.current.has(currentSpread) || imageLoaded;

  // Image sizing - give more room for bottom nav in mobile portrait
  const imageMaxHeight = isMobile && !isLandscapeMode ? '75vh' : '88vh';

  // Reset imageLoaded when spread changes
  const handleImageLoad = () => {
    imageCache.current.set(currentSpread, true);
    setImageLoaded(true);
  };

  return (
    <div 
      ref={viewerRef}
      className="min-h-screen relative flex flex-col"
      style={{ backgroundColor: themeBackground }}
      onMouseMove={handleUserActivity}
      onTouchMove={handleUserActivity}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* iOS Rotate Hint Toast */}
      <AnimatePresence>
        {showRotateHint && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm font-medium">Rotate phone for best experience</span>
          </motion.div>
        )}
      </AnimatePresence>

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
            {!isImageReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-magical-plum/5 via-magical-rose/5 to-magical-plum/5 rounded-xl z-10 min-w-[300px] min-h-[200px]">
                <div className="w-8 h-8 border-4 border-magical-gold border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            <img
              src={getImageUrl(storybook.spreads[currentSpread])}
              alt={`Spread ${currentSpread + 1}`}
              loading="eager"
              onLoad={handleImageLoad}
              className={`shadow-2xl page-shadow transition-opacity duration-200 object-contain ${isImageReady ? 'opacity-100' : 'opacity-0'}`}
              style={{
                borderRadius: storybook.settings?.roundedCorners ? `${storybook.settings.cornerRadius}px` : '0px',
                maxWidth: '95vw',
                maxHeight: imageMaxHeight,
                width: 'auto',
                height: 'auto'
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation - Mobile (portrait/landscape) or Desktop */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isMobile 
                ? (isLandscapeMode 
                    ? getMobileLandscapeNav()   // Landscape fullscreen: left side vertical nav
                    : getMobilePortraitNav()    // Portrait default: bottom horizontal nav
                  )
                : (isLandscapeMode 
                    ? getMobileLandscapeNav()   // Mobile device in fullscreen but viewport > 768
                    : getDesktopNavigation()    // Desktop: existing nav unchanged
                  )
              }
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
              className={`${getGoToPopupClass()} bg-white rounded-xl shadow-2xl p-3 ${shakeGoTo ? 'animate-shake' : ''}`}
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
