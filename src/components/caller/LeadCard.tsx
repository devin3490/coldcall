import { Lead } from '@/contexts/LeadsContext';
import { Button } from '@/components/ui/button';
import { Phone, Building2, User, ChevronRight } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  isActive: boolean;
  order: number;
  onCall: () => void;
}

export function LeadCard({ lead, isActive, order, onCall }: LeadCardProps) {
  return (
    <div 
      className={`
        glass rounded-xl p-5 transition-all duration-300
        ${isActive 
          ? 'ring-2 ring-primary shadow-lg shadow-primary/10' 
          : 'opacity-60'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold
            ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
          `}>
            {order}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">{lead.companyName}</h3>
            </div>
            
            {lead.contactName && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{lead.contactName}</p>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-mono text-muted-foreground">{lead.phone}</p>
            </div>
          </div>
        </div>

        {isActive && (
          <Button variant="call" size="lg" onClick={onCall}>
            <Phone className="w-4 h-4" />
            Appeler
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
