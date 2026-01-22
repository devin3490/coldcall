import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { CSVUploadDialog } from '@/components/admin/CSVUploadDialog';
import { CallerSessionsDialog } from '@/components/admin/CallerSessionsDialog';
import { CallbackListDialog } from '@/components/admin/CallbackListDialog';
import { useAdminStats } from '@/hooks/useAdminStats';
import { 
  Users, 
  Clock, 
  TrendingUp,
  Target,
  CheckCircle2,
  PhoneMissed,
  BarChart3,
  Loader2,
  Timer
} from 'lucide-react';

export default function AdminDashboard() {
  const { stats, isLoading, refetch } = useAdminStats();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatSessionTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard Admin</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Vue d'ensemble de l'activité</p>
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <CreateUserDialog />
          <CSVUploadDialog onSuccess={refetch} />
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
        <div className="glass rounded-xl p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Callers</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.totalCallers || 0}</p>
          <p className="text-xs sm:text-sm text-success">{stats?.activeCallers || 0} actifs</p>
        </div>

        <div className="glass rounded-xl p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Leads</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.totalLeads || 0}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">{stats?.completedLeads || 0} complétés</p>
        </div>

        <div className="glass rounded-xl p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Durée moy.</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.avgCallDuration || '0:00'}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">par appel</p>
        </div>

        <div className="glass rounded-xl p-3 sm:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground">Taux booking</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{stats?.closeRate || '0%'}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">moyenne globale</p>
        </div>
      </div>

      {/* Caller Performance */}
      <div className="glass rounded-xl p-3 sm:p-6 mb-6 sm:mb-8">
        <h2 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Performance des callers
        </h2>
        
        {/* Mobile Cards View */}
        <div className="block lg:hidden space-y-3">
          {stats?.callers && stats.callers.length > 0 ? (
            stats.callers.map((caller) => (
              <div key={caller.id} className="bg-secondary/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <span className="text-xs font-medium text-foreground">
                        {caller.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{caller.name}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${caller.has_active_session ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${caller.has_active_session ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {caller.has_active_session ? 'En session' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                  <CallerSessionsDialog callerId={caller.id} callerName={caller.name} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-background/50 rounded p-2">
                    <p className="text-lg font-bold text-foreground">{caller.leads_count}</p>
                    <p className="text-xs text-muted-foreground">Leads</p>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <p className="text-lg font-bold text-success">{caller.completed_count}</p>
                    <p className="text-xs text-muted-foreground">Complétés</p>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <p className={`text-lg font-bold ${caller.booking_rate >= 50 ? 'text-success' : caller.booking_rate >= 25 ? 'text-warning' : 'text-foreground'}`}>
                      {caller.booking_rate}%
                    </p>
                    <p className="text-xs text-muted-foreground">Booking</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Aucun caller trouvé.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          {stats?.callers && stats.callers.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Caller</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Leads</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Complétés</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Temps session</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Temps d'appel</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Taux booking</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Taux rejet</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.callers.map((caller) => (
                  <tr key={caller.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                          <span className="text-sm font-medium text-foreground">
                            {caller.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{caller.name}</span>
                          <p className="text-xs text-muted-foreground">{caller.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-foreground">{caller.leads_count}</td>
                    <td className="py-4 px-4 text-center text-success">{caller.completed_count}</td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Timer className="w-3 h-3 text-warning" />
                        <span className="font-mono text-foreground">{formatSessionTime(caller.total_session_time)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{caller.sessions_count} sessions</p>
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-foreground">{formatDuration(caller.total_duration)}</td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-medium ${caller.booking_rate >= 50 ? 'text-success' : caller.booking_rate >= 25 ? 'text-warning' : 'text-foreground'}`}>
                        {caller.booking_rate}%
                      </span>
                      <p className="text-xs text-muted-foreground">{caller.booked_count}/{caller.answered_count}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`font-medium ${caller.rejection_rate >= 75 ? 'text-destructive' : caller.rejection_rate >= 50 ? 'text-warning' : 'text-foreground'}`}>
                        {caller.rejection_rate}%
                      </span>
                      <p className="text-xs text-muted-foreground">{caller.rejected_count}/{caller.answered_count}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${caller.has_active_session ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${caller.has_active_session ? 'bg-success' : 'bg-muted-foreground'}`} />
                        {caller.has_active_session ? 'En session' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <CallerSessionsDialog callerId={caller.id} callerName={caller.name} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun caller trouvé. Créez des comptes caller pour commencer.
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <div className="glass rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
            Résultats des appels
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {[
              { label: 'Pas de réponse', count: stats?.noAnswerLeads || 0, color: 'bg-warning' },
              { label: 'Pas intéressé', count: stats?.notInterestedLeads || 0, color: 'bg-muted' },
              { label: 'Intéressé', count: stats?.interestedLeads || 0, color: 'bg-primary' },
              { label: 'Conclu', count: stats?.closedLeads || 0, color: 'bg-success' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${item.color}`} />
                  <span className="text-xs sm:text-sm text-foreground">{item.label}</span>
                </div>
                <span className="font-medium text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
            <PhoneMissed className="w-4 h-4 sm:w-5 sm:h-5 text-warning" />
            Callback List
          </h3>
          <p className="text-3xl sm:text-4xl font-bold text-warning mb-2">{stats?.callbackCount || 0}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">leads à rappeler</p>
          <CallbackListDialog />
        </div>
      </div>
    </div>
  );
}
