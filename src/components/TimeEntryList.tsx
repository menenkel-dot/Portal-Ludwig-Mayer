import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTimeEntries, createTimeEntry, updateTimeEntry, deleteTimeEntry, deleteTimeEntries, NewTimeEntry } from "@/services/timeTrackingService";
import { getEmployees } from "@/services/employeeService";
import { getSites } from "@/services/siteService";
import { TimeEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal, PlusCircle, Search, ArrowUpDown, Trash2, AlertCircle } from "lucide-react";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type SortConfig = {
  key: keyof TimeEntry;
  direction: 'ascending' | 'descending';
} | null;

const ITEMS_PER_PAGE = 10;

const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

export const TimeEntryList = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const totalPages = Math.ceil(sortedTimeEntries.length / ITEMS_PER_PAGE);
  const currentTimeEntries = sortedTimeEntries.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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

  const deleteBulkMutation = useMutation({
    mutationFn: deleteTimeEntries,
    onSuccess: () => {
      showSuccess(`${selectedIds.length} Einträge erfolgreich gelöscht.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
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

  const toggleSelectAll = () => {
    if (selectedIds.length === currentTimeEntries.length && currentTimeEntries.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentTimeEntries.map((e) => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Möchten Sie wirklich ${selectedIds.length} Einträge löschen?`)) {
      deleteBulkMutation.mutate(selectedIds);
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={deleteBulkMutation.isPending}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        {selectedIds.length} löschen
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                        Abbrechen
                    </Button>
                </div>
            )}
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-grow sm:flex-grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Einträge suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-64"
            />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => openDialog()} className="w-full sm:w-auto">
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

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                <TableHead className="w-[50px] px-4 text-center">
                    <Checkbox
                        checked={selectedIds.length === currentTimeEntries.length && currentTimeEntries.length > 0}
                        onCheckedChange={toggleSelectAll}
                    />
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('date')} className="-ml-4">
                    Datum <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('employees')} className="-ml-4">
                    Mitarbeiter <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('sites')} className="-ml-4">
                    Baustelle <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('entry_type')} className="-ml-4">
                    Typ <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('hours_worked')} className="-ml-4">
                    Stunden <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </TableHead>
                <TableHead className="text-right">Lohn (Snapshot)</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {currentTimeEntries.length > 0 ? (
                currentTimeEntries.map((entry) => (
                    <TableRow key={entry.id} className={cn(selectedIds.includes(entry.id) && "bg-primary/5")}>
                    <TableCell className="px-4 text-center">
                        <Checkbox
                            checked={selectedIds.includes(entry.id)}
                            onCheckedChange={() => toggleSelect(entry.id)}
                        />
                    </TableCell>
                    <TableCell>{new Date(entry.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{entry.employees?.first_name} {entry.employees?.last_name}</TableCell>
                    <TableCell>{entry.sites?.name || "-"}</TableCell>
                    <TableCell>
                        <Badge variant={
                        entry.entry_type === 'Arbeit' ? 'secondary' :
                        entry.entry_type === 'Urlaub' ? 'outline' :
                        'default'
                        }>
                        {entry.entry_type}
                        </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.hours_worked.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                        {entry.hourly_rate ? formatCurrency(entry.hourly_rate) : "-"}
                    </TableCell>
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
                    <TableCell colSpan={8} className="h-24 text-center">
                    Keine Ergebnisse gefunden.
                    </TableCell>
                </TableRow>
                )}
            </TableBody>
            </Table>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Seite {currentPage} von {totalPages}
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(p - 1, 1)); }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(p + 1, totalPages)); }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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