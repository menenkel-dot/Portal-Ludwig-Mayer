import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, NewMaterial } from "@/services/materialService";
import { Material } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search } from "lucide-react";
import { MaterialForm } from "@/components/MaterialForm";
import { showSuccess, showError } from "@/utils/toast";

const Materials = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: getMaterials,
  });

  const filteredMaterials = useMemo(() => {
    if (!materials) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return materials.filter(material =>
      material.name.toLowerCase().includes(lowercasedTerm) ||
      (material.supplier && material.supplier.toLowerCase().includes(lowercasedTerm))
    );
  }, [materials, searchTerm]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      setIsDialogOpen(false);
      setSelectedMaterial(null);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({
    mutationFn: createMaterial,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Material erfolgreich angelegt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewMaterial> }) => updateMaterial(id, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Material erfolgreich aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      showSuccess("Material erfolgreich gelöscht.");
      setIsAlertOpen(false);
      setSelectedMaterial(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFormSubmit = (data: NewMaterial) => {
    if (selectedMaterial) {
      updateMutation.mutate({ id: selectedMaterial.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (material: Material | null = null) => {
    setSelectedMaterial(material);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (material: Material) => {
    setSelectedMaterial(material);
    setIsAlertOpen(true);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  if (isLoading) return <div>Lade Materialien...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Materialverwaltung</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Materialien suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Neues Material
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>{selectedMaterial ? "Material bearbeiten" : "Neues Material anlegen"}</DialogTitle>
              </DialogHeader>
              <MaterialForm
                onSubmit={handleFormSubmit}
                initialData={selectedMaterial}
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
              <TableHead>Lieferant</TableHead>
              <TableHead>Einheit</TableHead>
              <TableHead>Preis/Einheit</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell className="font-medium">{material.name}</TableCell>
                  <TableCell>{material.supplier || "-"}</TableCell>
                  <TableCell>{material.unit}</TableCell>
                  <TableCell>{formatCurrency(material.price_per_unit)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(material)}>Bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteConfirm(material)} className="text-red-600">Löschen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
              Diese Aktion kann nicht rückgängig gemacht werden. Das Material "{selectedMaterial?.name}" wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedMaterial && deleteMutation.mutate(selectedMaterial.id)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Materials;