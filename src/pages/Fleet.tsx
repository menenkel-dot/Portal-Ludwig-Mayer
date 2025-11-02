import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getVehicles, createVehicle, updateVehicle, deleteVehicle, NewVehicle } from "@/services/vehicleService";
import { Vehicle } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { VehicleForm } from "@/components/VehicleForm";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";

const Fleet = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setIsDialogOpen(false);
      setSelectedVehicle(null);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({
    mutationFn: createVehicle,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Fahrzeug erfolgreich hinzugefügt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewVehicle> }) => updateVehicle(id, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Fahrzeug erfolgreich aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      showSuccess("Fahrzeug erfolgreich entfernt.");
      setIsAlertOpen(false);
      setSelectedVehicle(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFormSubmit = (data: NewVehicle) => {
    if (selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (vehicle: Vehicle | null = null) => {
    setSelectedVehicle(vehicle);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsAlertOpen(true);
  };

  if (isLoading) return <div>Lade Fuhrpark...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fuhrparkverwaltung</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Neues Fahrzeug
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
              <DialogTitle>{selectedVehicle ? "Fahrzeug bearbeiten" : "Neues Fahrzeug anlegen"}</DialogTitle>
            </DialogHeader>
            <VehicleForm
              onSubmit={handleFormSubmit}
              initialData={selectedVehicle}
              onCancel={() => setIsDialogOpen(false)}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fahrzeug</TableHead>
              <TableHead>Kennzeichen</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Standort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles?.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.manufacturer} {vehicle.model}</TableCell>
                <TableCell>{vehicle.license_plate}</TableCell>
                <TableCell>{vehicle.vehicle_type}</TableCell>
                <TableCell>{vehicle.location}</TableCell>
                <TableCell>
                  <Badge variant={
                    vehicle.status === 'Verfügbar' ? 'default' :
                    vehicle.status === 'In Wartung' ? 'destructive' :
                    'secondary'
                  }>
                    {vehicle.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(vehicle)}>Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteConfirm(vehicle)} className="text-red-600">Löschen</DropdownMenuItem>
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
              Diese Aktion kann nicht rückgängig gemacht werden. Das Fahrzeug "{selectedVehicle?.manufacturer} {selectedVehicle?.model}" wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedVehicle && deleteMutation.mutate(selectedVehicle.id)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Fleet;