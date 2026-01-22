import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CSVRow {
  company_name?: string;
  companyName?: string;
  Name?: string;
  contact_name?: string;
  contactName?: string;
  phone?: string;
  telephone?: string;
  'Phone number'?: string;
}

interface ParsedLead {
  company_name: string;
  contact_name: string | null;
  phone: string;
}

interface Props {
  onSuccess?: () => void;
}

export function CSVUploadDialog({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Veuillez sélectionner un fichier CSV');
      return;
    }

    setFile(selectedFile);
    setError('');

    Papa.parse<CSVRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const leads: ParsedLead[] = results.data
          .filter(row => {
            const companyName = row.company_name || row.companyName || row.Name;
            const phone = row.phone || row.telephone || row['Phone number'];
            return companyName && phone;
          })
          .map(row => ({
            company_name: (row.company_name || row.companyName || row.Name || '').trim(),
            contact_name: (row.contact_name || row.contactName || '').trim() || null,
            phone: (row.phone || row.telephone || row['Phone number'] || '').trim()
          }));

        if (leads.length === 0) {
          setError('Aucun lead valide trouvé. Assurez-vous que le CSV contient les colonnes: Name (ou company_name), Phone number (ou phone)');
          return;
        }

        setParsedLeads(leads);
      },
      error: (err) => {
        setError(`Erreur de parsing: ${err.message}`);
      }
    });
  };

  const handleUpload = async () => {
    if (parsedLeads.length === 0) return;

    setIsLoading(true);
    setError('');

    try {
      // Fetch active callers to distribute leads
      const { data: callers, error: callersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'caller')
        .eq('is_active', true);

      if (callersError) throw callersError;

      if (!callers || callers.length === 0) {
        setError('Aucun caller actif trouvé. Ajoutez des callers avant d\'importer des leads.');
        setIsLoading(false);
        return;
      }

      // Get current max lead_order
      const { data: maxOrderData } = await supabase
        .from('leads')
        .select('lead_order')
        .order('lead_order', { ascending: false })
        .limit(1);

      let currentOrder = (maxOrderData?.[0]?.lead_order || 0) + 1;

      // Distribute leads round-robin among callers
      const leadsToInsert = parsedLeads.map((lead, index) => ({
        company_name: lead.company_name,
        contact_name: lead.contact_name,
        phone: lead.phone,
        status: 'pending',
        assigned_to: callers[index % callers.length].id,
        lead_order: currentOrder + index
      }));

      const { error: insertError } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (insertError) throw insertError;

      toast.success(`${leadsToInsert.length} leads importés avec succès`, {
        description: `Distribués entre ${callers.length} callers`,
        icon: <CheckCircle2 className="w-4 h-4" />
      });

      // Reset state
      setFile(null);
      setParsedLeads([]);
      setOpen(false);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onSuccess?.();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erreur lors de l\'import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setParsedLeads([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Upload className="w-4 h-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer des leads</DialogTitle>
          <DialogDescription>
            Uploadez un fichier CSV avec les colonnes: Name, Phone number (ou company_name, phone)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input zone */}
          <div 
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-foreground">
                <FileText className="w-5 h-5 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">Cliquez pour sélectionner un fichier CSV</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {parsedLeads.length > 0 && (
            <div className="bg-secondary/50 rounded-lg p-4">
              <p className="text-sm font-medium text-foreground mb-2">
                {parsedLeads.length} leads trouvés
              </p>
              <div className="max-h-32 overflow-y-auto space-y-1 text-sm text-muted-foreground">
                {parsedLeads.slice(0, 5).map((lead, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{lead.company_name}</span>
                    <span className="font-mono">{lead.phone}</span>
                  </div>
                ))}
                {parsedLeads.length > 5 && (
                  <p className="text-center text-muted-foreground">
                    ... et {parsedLeads.length - 5} autres
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Annuler
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleUpload}
              disabled={parsedLeads.length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Import...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Importer {parsedLeads.length > 0 && `(${parsedLeads.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
