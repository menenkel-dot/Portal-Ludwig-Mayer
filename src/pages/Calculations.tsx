import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCalculations, createCalculation, updateCalculation, deleteCalculation, NewCalculation } from "@/services/calculationService";
import { getSites } from "@/services/siteService";
import { Calculation } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { CalculationForm } from "@/components/CalculationForm";
import { showSuccess, showError } from "@/utils/toast";

const Calculations = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCalc, setSelectedCalc] = useState<Calculation | null>(null);

  const { data: calculations, isLoading: isLoadingCalcs } = useQuery({ queryKey: ["calculations"], queryFn: getCalculations });
  const { data: sites, isLoading: isLoadingSites } = useQuery({ queryKey: ["sites"], queryFn: getSites });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculations"] });
      setIsDialogOpen(false);
      setSelectedCalc(null);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({
    mutationFn: createCalculation,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Kalkulation erfolgreich erstellt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewCalculation> }) => updateCalculation(id, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Kalkulation erfolgreich aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCalculation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculations"] });
      showSuccess("Kalkulation erfolgreich gelöscht.");
      setIsAlertOpen(false);
      setSelectedCalc(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFormSubmit = (data: NewCalculation) => {
    if (selectedCalc) {
      updateMutation.mutate({ id: selectedCalc.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (calc: Calculation | null = null) => {
    setSelectedCalc(calc);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (calc: Calculation) => {
    setSelectedCalc(calc);
    setIsAlertOpen(true);
  };

  if (isLoadingCalcs || isLoadingSites) return <div>Lade Daten...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kalkulationen</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Neue Kalkulation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCalc ? "Kalkulation bearbeiten" : "Neue Kalkulation anlegen"}</DialogTitle>
            </DialogHeader>
            {sites && (
              <CalculationForm
                onSubmit={handleFormSubmit}
                initialData={selectedCalc}
                sites={sites}
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
              <TableHead>Baustelle</TableHead>
              <TableHead>Gesamtsumme</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calculations?.map((calc) => (
              <TableRow key={calc.id}>
                <TableCell className="font-medium">{calc.name}</TableCell>
                <TableCell>{calc.sites?.name || "N/A"}</TableCell>
                <TableCell>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(calc.total_amount)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Details anzeigen</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDialog(calc)}>Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteConfirm(calc)} className="text-red-600">Löschen</DropdownMenuItem>
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
              Diese Aktion kann nicht rückgängig gemacht werden. Die Kalkulation "{selectedCalc?.name}" wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedCalc && deleteMutation.mutate(selectedCalc.id)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Calculations;