import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCustomers, createCustomer, updateCustomer, deleteCustomer, NewCustomer } from "@/services/customerService";
import { Customer } from "@/types";
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
import { CustomerForm } from "@/components/CustomerForm";
import { showSuccess, showError } from "@/utils/toast";

const Customers = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading, isError } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setIsDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  };

  const createMutation = useMutation({
    mutationFn: createCustomer,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Kunde erfolgreich erstellt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewCustomer> }) =>
      updateCustomer(id, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Kunde erfolgreich aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      showSuccess("Kunde erfolgreich gelöscht.");
      setIsAlertOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const handleFormSubmit = (data: NewCustomer) => {
    if (selectedCustomer) {
      updateMutation.mutate({ id: selectedCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (customer: Customer | null = null) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsAlertOpen(true);
  };

  if (isLoading) return <div>Lade Kunden...</div>;
  if (isError) return <div>Fehler beim Laden der Kunden.</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Kundenverwaltung</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Neuer Kunde
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedCustomer ? "Kunde bearbeiten" : "Neuen Kunden anlegen"}
              </DialogTitle>
            </DialogHeader>
            <CustomerForm
              onSubmit={handleFormSubmit}
              initialData={selectedCustomer}
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
              <TableHead>Name</TableHead>
              <TableHead>Ansprechpartner</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.contact_person}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Menü öffnen</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDialog(customer)}>
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteConfirm(customer)} className="text-red-600">
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
              Diese Aktion kann nicht rückgängig gemacht werden. Der Kunde "{selectedCustomer?.name}" wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedCustomer && deleteMutation.mutate(selectedCustomer.id)}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;