import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SettingsPanel from '@/components/studio/SettingsPanel';
import PreviewCanvas from '@/components/studio/PreviewCanvas';
import PublishPanel from '@/components/studio/PublishPanel';

const PreviewStudio = () => {
  const { storybookId } = useParams();
  const navigate = useNavigate();
  const [storybook, setStorybook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    loadStorybook();
  }, [storybookId]);

  const loadStorybook = async () => {
    try {
      const data = await api.getStorybook(storybookId);
      setStorybook(data);
      setSettings(data.settings);
    } catch (error) {
      toast.error('Failed to load storybook');
      navigate('/admin/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newStatus = null) => {
    setSaving(true);
    try {
      const updateData = {
        settings: settings,
      };
      if (newStatus) {
        updateData.status = newStatus;
      }
      
      await api.updateStorybook(storybookId, updateData);
      toast.success(newStatus === 'published' ? 'Storybook published!' : 'Changes saved');
      
      if (newStatus) {
        await loadStorybook();
      }
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-magical-cream flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-magical-plum border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-magical-ink font-serif text-lg">Loading studio...</p>
        </div>
      </div>
    );
  }

  if (!storybook || !settings) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-magical-cream">
      <header className="border-b border-magical-moon/30 bg-white/90 backdrop-blur-sm px-6 py-3 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/admin/dashboard')}
            variant="ghost"
            size="sm"
            className="text-magical-plum hover:text-magical-ink"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <div className="border-l border-magical-moon h-6" />
          <div>
            <h2 className="font-serif text-lg text-magical-ink" data-testid="studio-storybook-title">
              {storybook.title}
            </h2>
            <p className="text-xs text-magical-plum">
              {storybook.spreadCount} spreads · {storybook.orientation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-sans ${
            storybook.status === 'published' 
              ? 'bg-magical-teal text-white' 
              : 'bg-magical-moon text-magical-ink'
          }`} data-testid="storybook-status-badge">
            {storybook.status}
          </span>
          
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            variant="outline"
            size="sm"
            className="border-magical-moon/20 rounded-full"
            data-testid="save-draft-button"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="bg-magical-ink text-magical-cream hover:bg-magical-plum rounded-full"
            data-testid="publish-button"
          >
            {storybook.status === 'published' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <SettingsPanel 
          settings={settings} 
          updateSettings={updateSettings}
        />

        <div className="flex-1 flex items-center justify-center bg-magical-ink p-8 overflow-auto">
          <PreviewCanvas 
            storybook={storybook}
            settings={settings}
          />
        </div>

        <PublishPanel 
          storybook={storybook}
          onUpdate={loadStorybook}
        />
      </div>
    </div>
  );
};

export default PreviewStudio;
