import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { Phone, LogOut, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AppHeader() {
  const { profile, logout } = useAuth();
  const { isSessionActive, sessionDuration } = useSession();
  const navigate = useNavigate();

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-primary/20 text-primary';
      case 'caller': return 'bg-success/20 text-success';
      case 'supervisor': return 'bg-warning/20 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <header className="glass border-b border-border/50 sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center">
            <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <span className="font-semibold text-foreground text-sm sm:text-base">Tdia ColdCall</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {isSessionActive && (
            <div className="flex items-center gap-1.5 sm:gap-2 bg-success/10 text-success px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg animate-pulse-glow">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-mono text-xs sm:text-sm">{formatDuration(sessionDuration)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-foreground">{profile?.name || 'Utilisateur'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(profile?.role || '')}`}>
                  {profile?.role || 'caller'}
                </span>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 sm:h-9 sm:w-9">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
