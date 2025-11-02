import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDocumentsForSite, uploadDocument, deleteDocument, getDocumentPublicUrl } from "@/services/documentService";
import { SiteDocument } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, FileText, Download, Trash2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";

interface SiteDocumentsProps {
  siteId: string;
}

export const SiteDocuments = ({ siteId }: SiteDocumentsProps) => {
  const queryClient = useQueryClient();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", siteId],
    queryFn: () => getDocumentsForSite(siteId),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, desc }: { file: File, desc: string | null }) => uploadDocument(siteId, file, desc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", siteId] });
      showSuccess("Dokument erfolgreich hochgeladen.");
      setIsUploadDialogOpen(false);
      setFileToUpload(null);
      setDescription("");
    },
    onError: (error: Error) => showError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", siteId] });
      showSuccess("Dokument erfolgreich gelöscht.");
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFileToUpload(event.target.files[0]);
    }
  };

  const handleUploadSubmit = () => {
    if (fileToUpload) {
      uploadMutation.mutate({ file: fileToUpload, desc: description });
    } else {
      showError("Bitte wählen Sie eine Datei aus.");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Dokumente</CardTitle>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusCircle className="mr-2 h-4 w-4" /> Dokument hochladen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Dokument hochladen</DialogTitle>
              <DialogDescription>
                Laden Sie Pläne, Genehmigungen oder andere relevante Dokumente für diese Baustelle hoch.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Datei</Label>
                <Input id="file" type="file" onChange={handleFileChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Beschreibung (optional)</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsUploadDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={handleUploadSubmit} disabled={!fileToUpload || uploadMutation.isPending}>
                {uploadMutation.isPending ? "Lade hoch..." : "Hochladen"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Lade Dokumente...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dateiname</TableHead>
                <TableHead>Größe</TableHead>
                <TableHead>Hochgeladen am</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                      {doc.file_name}
                    </TableCell>
                    <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell>{format(new Date(doc.created_at), "dd.MM.yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <a href={getDocumentPublicUrl(doc.file_path)} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(doc)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">
                    Keine Dokumente für diese Baustelle vorhanden.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};