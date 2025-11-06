import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotesForSite, createNote, deleteNote, getAttachmentPublicUrl, NewNotePayload } from "@/services/noteService";
import { SiteNote } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Paperclip, Trash2, X, FileText } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Skeleton } from "./ui/skeleton";

interface SiteNotesProps {
  siteId: string;
}

const NoteForm = ({ siteId }: { siteId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const mutation = useMutation({
    mutationFn: createNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", siteId] });
      showSuccess("Notiz erfolgreich hinzugefügt.");
      setContent("");
      setFiles([]);
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) {
      showError("Benutzerinformationen nicht gefunden. Bitte neu anmelden.");
      return;
    }
    if (!content.trim() && files.length === 0) {
      showError("Bitte geben Sie einen Text ein oder fügen Sie eine Datei hinzu.");
      return;
    }

    const payload: NewNotePayload = {
      site_id: siteId,
      user_id: user.id,
      user_email: user.email,
      content: content.trim() || null,
      files,
    };
    mutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Neue Notiz zur Baustellendokumentation hinzufügen..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
              <span>{file.name}</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex justify-between items-center">
        <Button type="button" variant="outline" asChild>
          <label htmlFor="file-upload" className="cursor-pointer">
            <Paperclip className="mr-2 h-4 w-4" />
            Anhänge hinzufügen
            <Input id="file-upload" type="file" multiple onChange={handleFileChange} className="hidden" />
          </label>
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Speichern..." : "Notiz speichern"}
        </Button>
      </div>
    </form>
  );
};

const NoteItem = ({ note, onDelete }: { note: SiteNote, onDelete: (note: SiteNote) => void }) => {
    const { user } = useAuth();
    const isOwner = user?.id === note.user_id;

    return (
        <div className="flex items-start space-x-4 py-4">
            <Avatar>
                <AvatarFallback>{note.user_email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">{note.user_email || "Unbekannter Benutzer"}</p>
                        <p className="text-xs text-muted-foreground">
                            {format(new Date(note.created_at), "dd. MMMM yyyy 'um' HH:mm", { locale: de })}
                        </p>
                    </div>
                    {isOwner && (
                        <Button variant="ghost" size="icon" onClick={() => onDelete(note)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    )}
                </div>
                {note.content && <p className="mt-2 text-sm whitespace-pre-wrap">{note.content}</p>}
                {note.site_note_attachments && note.site_note_attachments.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {note.site_note_attachments.map(att => (
                            <a key={att.id} href={getAttachmentPublicUrl(att.file_path)} target="_blank" rel="noopener noreferrer" className="group relative">
                                {att.file_type.startsWith('image/') ? (
                                    <img src={getAttachmentPublicUrl(att.file_path)} alt={att.file_name} className="rounded-md object-cover aspect-square" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center p-2 border rounded-md aspect-square">
                                        <FileText className="h-8 w-8 text-muted-foreground" />
                                        <p className="text-xs text-center mt-1 truncate">{att.file_name}</p>
                                    </div>
                                )}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export const SiteNotes = ({ siteId }: SiteNotesProps) => {
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes", siteId],
    queryFn: () => getNotesForSite(siteId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes", siteId] });
      showSuccess("Notiz gelöscht.");
    },
    onError: (error: Error) => showError(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notizen & Dokumentation</CardTitle>
      </CardHeader>
      <CardContent>
        <NoteForm siteId={siteId} />
        <div className="mt-6 divide-y">
            {isLoading ? (
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            ) : (
                notes?.map(note => (
                    <NoteItem key={note.id} note={note} onDelete={(noteToDelete) => deleteMutation.mutate(noteToDelete)} />
                ))
            )}
            {!isLoading && (!notes || notes.length === 0) && (
                <p className="text-center text-muted-foreground py-8">Noch keine Notizen vorhanden.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};