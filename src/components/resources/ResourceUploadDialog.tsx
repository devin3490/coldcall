import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, Video, HelpCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

type ResourceCategory = 'scripts' | 'videos' | 'faq';

interface Props {
  onSuccess?: () => void;
}

const categoryConfig = {
  scripts: { label: 'Script d\'appel', icon: FileText, acceptedTypes: '.pdf,.doc,.docx,.txt' },
  videos: { label: 'Formation vidéo', icon: Video, acceptedTypes: '.mp4,.webm,.mov' },
  faq: { label: 'FAQ', icon: HelpCircle, acceptedTypes: '' },
};

export function ResourceUploadDialog({ onSuccess }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('scripts');
  const [file, setFile] = useState<File | null>(null);
  const [faqContent, setFaqContent] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (category !== 'faq' && !file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    if (category === 'faq' && !faqContent.trim()) {
      setError('Le contenu de la FAQ est requis');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let fileUrl = null;
      let fileName = null;

      // Upload file if not FAQ
      if (file && category !== 'faq') {
        const fileExt = file.name.split('.').pop();
        const filePath = `${category}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
      }

      // Insert resource record
      const { error: insertError } = await supabase
        .from('resources')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          category,
          file_url: fileUrl,
          file_name: fileName,
          content: category === 'faq' ? faqContent.trim() : null,
          created_by: user?.id,
        });

      if (insertError) throw insertError;

      toast.success('Ressource ajoutée avec succès');
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Erreur lors de l\'upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTitle('');
    setDescription('');
    setCategory('scripts');
    setFile(null);
    setFaqContent('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const config = categoryConfig[category];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4" />
          Ajouter une ressource
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une ressource</DialogTitle>
          <DialogDescription>
            Uploadez un script, une vidéo de formation ou ajoutez une FAQ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ResourceCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scripts">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Script d'appel
                  </div>
                </SelectItem>
                <SelectItem value="videos">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Formation vidéo
                  </div>
                </SelectItem>
                <SelectItem value="faq">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    FAQ
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la ressource"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle"
              rows={2}
            />
          </div>

          {/* File upload for scripts/videos */}
          {category !== 'faq' && (
            <div className="space-y-2">
              <Label>Fichier *</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={config.acceptedTypes}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-foreground">
                    <config.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour sélectionner un fichier
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category === 'scripts' ? 'PDF, DOC, DOCX, TXT' : 'MP4, WEBM, MOV'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FAQ content */}
          {category === 'faq' && (
            <div className="space-y-2">
              <Label htmlFor="faqContent">Contenu *</Label>
              <Textarea
                id="faqContent"
                value={faqContent}
                onChange={(e) => setFaqContent(e.target.value)}
                placeholder="Réponse à la question..."
                rows={6}
              />
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
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleUpload} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Upload...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Ajouter
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
