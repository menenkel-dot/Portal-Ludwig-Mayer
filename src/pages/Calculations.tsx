import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCalculations, createCalculation, updateCalculation, deleteCalculation, NewCalculation } from "@/services/calculationService";
import { getSites } from "@/services/siteService";
import { Calculation } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search, ArrowUpDown } from "lucide-react";
import { CalculationForm } from "@/components/CalculationForm";
import { showSuccess, showError } from "@/utils/toast";
import { Link } from "react-router-dom";

type SortConfig = {
  key: keyof Calculation | 'site_name';
  direction: 'ascending' | 'descending';
} | null;

const Calculations = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedCalc, setSelectedCalc] = useState<Calculation | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const { data: calculations, isLoading: isLoadingCalcs } = useQuery({ queryKey: ["calculations"], queryFn: getCalculations });
  const { data: sites, isLoading: isLoadingSites } = useQuery({ queryKey: ["sites"], queryFn: getSites });

  const filteredCalculations = useMemo(() => {
    if (!calculations) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return calculations.filter(calc =>
      calc.name.toLowerCase().includes(lowercasedTerm) ||
      (calc.sites?.name && calc.sites.name.toLowerCase().includes(lowercasedTerm))
    );
  }, [calculations, searchTerm]);

  const sortedCalculations = useMemo(() => {
    let sortableItems = [...filteredCalculations];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'site_name') {
          valA = a.sites?.name || '';
          valB = b.sites?.name || '';
        } else {
          valA = a[sortConfig.key as keyof Calculation];
          valB = b[sortConfig.key as keyof Calculation];
        }
        
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredCalculations, sortConfig]);

  const requestSort = (key: keyof Calculation | 'site_name') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

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
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kalkulationen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
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
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('name')}>
                  Name <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('site_name')}>
                  Baustelle <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('total_amount')}>
                  Gesamtsumme <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCalculations.length > 0 ? (
              sortedCalculations.map((calc) => (
                <TableRow key={calc.id}>
                  <TableCell className="font-medium">
                    <Link to={`/calculations/${calc.id}`} className="hover:underline">
                      {calc.name}
                    </Link>
                  </TableCell>
                  <TableCell>{calc.sites?.name || "N/A"}</TableCell>
                  <TableCell>{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(calc.total_amount)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/calculations/${calc.id}`}>Details anzeigen</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDialog(calc)}>Bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteConfirm(calc)} className="text-red-600">Löschen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
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