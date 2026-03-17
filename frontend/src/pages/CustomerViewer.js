import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api, getImageUrl } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Volume2, VolumeX, Lock } from 'lucide-react';
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
  const [zoom, setZoom] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    loadStorybook();
  }, [slug]);

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
      if (soundOn && storybook.settings?.soundEnabled) {
        playSound(storybook.settings.defaultSound, storybook.settings.soundVolume);
      }
    }
  };

  const goToNext = () => {
    if (currentSpread < storybook.spreads.length - 1) {
      setCurrentSpread(currentSpread + 1);
      if (soundOn && storybook.settings?.soundEnabled) {
        playSound(storybook.settings.defaultSound, storybook.settings.soundVolume);
      }
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
      className="min-h-screen relative flex flex-col"
      style={{ backgroundColor: themeBackground }}
      onMouseMove={() => setShowControls(true)}
      data-testid="customer-viewer"
    >
      <div className="text-center py-6">
        <h1 className="text-4xl md:text-5xl font-serif text-magical-ink mb-2" data-testid="viewer-title">
          {storybook.title}
        </h1>
        {storybook.subtitle && (
          <p className="text-lg text-magical-plum font-sans" data-testid="viewer-subtitle">
            {storybook.subtitle}
          </p>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-8 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSpread}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ 
              transform: `scale(${zoom})`,
              borderRadius: storybook.settings?.roundedCorners ? `${storybook.settings.cornerRadius}px` : '0px'
            }}
          >
            <img
              src={getImageUrl(storybook.spreads[currentSpread])}
              alt={`Spread ${currentSpread + 1}`}
              className="max-h-[75vh] w-auto shadow-2xl page-shadow"
              style={{
                borderRadius: storybook.settings?.roundedCorners ? `${storybook.settings.cornerRadius}px` : '0px'
              }}
              data-testid="viewer-spread-image"
            />
          </motion.div>
        </AnimatePresence>

        {showControls && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10">
            <Button
              onClick={goToPrevious}
              disabled={currentSpread === 0}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              data-testid="viewer-prev-button"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            {storybook.settings?.showPageNumbers && (
              <span className="text-white font-sans text-sm px-4" data-testid="viewer-page-indicator">
                {currentSpread + 1} / {totalSpreads}
              </span>
            )}
            
            <Button
              onClick={goToNext}
              disabled={currentSpread === totalSpreads - 1}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
              data-testid="viewer-next-button"
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

            <div className="mx-2 h-6 w-px bg-white/20" />

            <Button
              onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <ZoomIn className="w-5 h-5" />
            </Button>

            <Button
              onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              <ZoomOut className="w-5 h-5" />
            </Button>

            {storybook.settings?.soundEnabled && (
              <Button
                onClick={() => setSoundOn(!soundOn)}
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
              >
                {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerViewer;
