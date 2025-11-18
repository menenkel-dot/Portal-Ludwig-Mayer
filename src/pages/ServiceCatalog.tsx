import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServiceItems, createServiceItem, updateServiceItem, deleteServiceItem, NewServiceItem } from "@/services/serviceCatalogService";
import { ServiceItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search } from "lucide-react";
import { ServiceItemForm } from "@/components/ServiceItemForm";
import { showSuccess, showError } from "@/utils/toast";
import { Link } from "react-router-dom";

const ServiceCatalog = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: serviceItems, isLoading } = useQuery({ queryKey: ["serviceItems"], queryFn: getServiceItems });

  const filteredItems = useMemo(() => {
    if (!serviceItems) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return serviceItems.filter(item =>
      item.name.toLowerCase().includes(lowercasedTerm) ||
      (item.description && item.description.toLowerCase().includes(lowercasedTerm))
    );
  }, [serviceItems, searchTerm]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceItems"] });
      setIsDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({
    mutationFn: createServiceItem,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Position erfolgreich erstellt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewServiceItem> }) => updateServiceItem(id, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Position erfolgreich aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServiceItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceItems"] });
      showSuccess("Position erfolgreich gelöscht.");
      setIsAlertOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFormSubmit = (data: NewServiceItem) => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (item: ServiceItem | null = null) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (item: ServiceItem) => {
    setSelectedItem(item);
    setIsAlertOpen(true);
  };

  if (isLoading) return <div>Lade Leistungskatalog...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Leistungskatalog</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Positionen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Neue Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedItem ? "Position bearbeiten" : "Neue Position anlegen"}</DialogTitle>
              </DialogHeader>
              <ServiceItemForm
                onSubmit={handleFormSubmit}
                initialData={selectedItem}
                onCancel={() => setIsDialogOpen(false)}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Einheit</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Link to={`/service-catalog/${item.id}`} className="hover:underline">
                      {item.name}
                    </Link>
                  </TableCell>
                  <TableCell>{item.unit || "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/service-catalog/${item.id}`}>Komponenten bearbeiten</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDialog(item)}>Stammdaten bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteConfirm(item)} className="text-red-600">Löschen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Die Position "{selectedItem?.name}" und alle zugehörigen Komponenten werden dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServiceCatalog;