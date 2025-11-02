import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSites, createSite, updateSite, deleteSite, NewSite } from "@/services/siteService";
import { getCustomers } from "@/services/customerService";
import { Site } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { SiteForm } from "@/components/SiteForm";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const Sites = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  const { data: sites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      setIsDialogOpen(false);
      setSelectedSite(null);
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  };

  const createMutation = useMutation({
    mutationFn: createSite,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Baustelle erfolgreich erstellt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewSite> }) =>
      updateSite(id, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Baustelle erfolgreich aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sites"] });
      showSuccess("Baustelle erfolgreich gelöscht.");
      setIsAlertOpen(false);
      setSelectedSite(null);
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const handleFormSubmit = (data: NewSite) => {
    if (selectedSite) {
      updateMutation.mutate({ id: selectedSite.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (site: Site | null = null) => {
    setSelectedSite(site);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (site: Site) => {
    setSelectedSite(site);
    setIsAlertOpen(true);
  };

  if (isLoadingSites || isLoadingCustomers) return <div>Lade Daten...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Baustellenverwaltung</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Neue Baustelle
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>
                {selectedSite ? "Baustelle bearbeiten" : "Neue Baustelle anlegen"}
              </DialogTitle>
            </DialogHeader>
            {customers && (
              <SiteForm
                onSubmit={handleFormSubmit}
                initialData={selectedSite}
                customers={customers}
                onCancel={() => setIsDialogOpen(false)}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead>Startdatum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites?.map((site) => (
              <TableRow key={site.id}>
                <TableCell className="font-medium">
                  <Link to={`/sites/${site.id}`} className="hover:underline">
                    {site.name}
                  </Link>
                </TableCell>
                <TableCell>{site.customers?.name || "N/A"}</TableCell>
                <TableCell>{new Date(site.start_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={
                    site.status === 'Abgeschlossen' ? 'secondary' :
                    site.status === 'In Arbeit' ? 'default' :
                    'outline'
                  }>
                    {site.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Menü öffnen</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(site)}>
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteConfirm(site)} className="text-red-600">
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Baustelle "{selectedSite?.name}" wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedSite && deleteMutation.mutate(selectedSite.id)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Sites;