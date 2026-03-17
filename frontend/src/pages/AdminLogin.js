import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Lock, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AdminLogin = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!password) {
      toast.error('Please enter password');
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(password);
      login(data.token);
      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Invalid password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-magical-ink">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1759731224815-87d2706c076c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1ODh8MHwxfHNlYXJjaHwzfHxjb3p5JTIwbWFnaWNhbCUyMGxpYnJhcnklMjByZWFkaW5nJTIwbm9vayUyMHdhcm0lMjBsaWdodGluZ3xlbnwwfHx8fDE3NzM3NDkzMTJ8MA&ixlib=rb-4.1.0&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-floating p-10 border border-magical-moon/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-magical-ink rounded-full mb-4">
              <BookOpen className="w-8 h-8 text-magical-cream" />
            </div>
            <h1 className="text-4xl font-serif text-magical-ink mb-2" data-testid="login-heading">
              Storybook Vault
            </h1>
            <p className="text-magical-plum font-sans text-sm">
              Admin Access
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-sans font-medium text-magical-ink mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-magical-plum/50" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-white/50 border-magical-ink/10 focus:border-magical-rose focus:ring-1 focus:ring-magical-rose rounded-lg font-sans"
                  placeholder="Enter admin password"
                  disabled={loading}
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-magical-ink text-magical-cream hover:bg-magical-plum transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 px-8 py-6 rounded-full font-serif tracking-wide text-base"
              data-testid="login-button"
            >
              {loading ? 'Unlocking...' : 'Enter Vault'}
            </Button>
          </form>
        </div>

        <p className="text-center mt-6 text-magical-cream/70 text-sm font-sans">
          A magical space for your stories
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
