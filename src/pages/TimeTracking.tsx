import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry, NewTimeEntry } from "@/services/timeTrackingService";
import { getEmployees } from "@/services/employeeService";
import { getSites } from "@/services/siteService";
import { TimeEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Search, ArrowUpDown } from "lucide-react";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { showSuccess, showError } from "@/utils/toast";

type SortConfig = {
  key: keyof TimeEntry;
  direction: 'ascending' | 'descending';
} | null;

const TimeTracking = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' });

  const { data: timeEntries, isLoading: isLoadingEntries } = useQuery({ queryKey: ["timeEntries"], queryFn: getTimeEntries });
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const { data: sites, isLoading: isLoadingSites } = useQuery({ queryKey: ["sites"], queryFn: getSites });

  const filteredTimeEntries = useMemo(() => {
    if (!timeEntries) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return timeEntries.filter(entry => {
      const employeeName = `${entry.employees?.first_name || ''} ${entry.employees?.last_name || ''}`.toLowerCase();
      const siteName = (entry.sites?.name || '').toLowerCase();
      const date = new Date(entry.date).toLocaleDateString().toLowerCase();

      return employeeName.includes(lowercasedTerm) ||
             siteName.includes(lowercasedTerm) ||
             date.includes(lowercasedTerm);
    });
  }, [timeEntries, searchTerm]);

  const sortedTimeEntries = useMemo(() => {
    let sortableItems = [...filteredTimeEntries];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'employees') {
          valA = `${a.employees?.last_name} ${a.employees?.first_name}`;
          valB = `${b.employees?.last_name} ${b.employees?.first_name}`;
        } else if (sortConfig.key === 'sites') {
          valA = a.sites?.name || '';
          valB = b.sites?.name || '';
        } else {
          valA = a[sortConfig.key];
          valB = b[sortConfig.key];
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
  }, [filteredTimeEntries, sortConfig]);

  const requestSort = (key: keyof TimeEntry) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      setIsDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({
    mutationFn: createTimeEntry,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Zeiteintrag erfolgreich erstellt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NewTimeEntry> }) => updateTimeEntry(id, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Zeiteintrag erfolgreich aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTimeEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
      showSuccess("Zeiteintrag erfolgreich gelöscht.");
      setIsAlertOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: Error) => showError(error.message),
  });

  const handleFormSubmit = (data: NewTimeEntry) => {
    if (selectedEntry) {
      updateMutation.mutate({ id: selectedEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openDialog = (entry: TimeEntry | null = null) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  const openDeleteConfirm = (entry: TimeEntry) => {
    setSelectedEntry(entry);
    setIsAlertOpen(true);
  };

  if (isLoadingEntries || isLoadingEmployees || isLoadingSites) return <div>Lade Daten...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Zeiterfassung</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Einträge suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Neuer Eintrag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>{selectedEntry ? "Eintrag bearbeiten" : "Neuen Zeiteintrag erstellen"}</DialogTitle>
              </DialogHeader>
              {employees && sites && (
                <TimeEntryForm
                  onSubmit={handleFormSubmit}
                  initialData={selectedEntry}
                  employees={employees}
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
                <Button variant="ghost" onClick={() => requestSort('date')}>
                  Datum <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('employees')}>
                  Mitarbeiter <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('sites')}>
                  Baustelle <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('hours_worked')}>
                  Stunden <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTimeEntries.length > 0 ? (
              sortedTimeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                  <TableCell>{entry.employees?.first_name} {entry.employees?.last_name}</TableCell>
                  <TableCell>{entry.sites?.name}</TableCell>
                  <TableCell>{entry.hours_worked.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDialog(entry)}>Bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDeleteConfirm(entry)} className="text-red-600">Löschen</DropdownMenuItem>
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
              Dieser Zeiteintrag wird dauerhaft gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedEntry && deleteMutation.mutate(selectedEntry.id)}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TimeTracking;