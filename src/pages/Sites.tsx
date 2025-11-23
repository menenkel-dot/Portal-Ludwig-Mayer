import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSites, createSite, updateSite, deleteSite, NewSite } from "@/services/siteService";
import { getCustomers } from "@/services/customerService";
import { getEmployees } from "@/services/employeeService";
import { Site } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { MoreHorizontal, PlusCircle, Search, ArrowUpDown } from "lucide-react";
import { SiteForm } from "@/components/SiteForm";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

type SortConfig = {
  key: keyof Site | 'employees';
  direction: 'ascending' | 'descending';
} | null;

const ITEMS_PER_PAGE = 10;

const statusOrder: (Site['status'])[] = ['Geplant', 'Kalkuliert', 'Geprüft', 'In Arbeit', 'Abgeschlossen'];

const Sites = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: sites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const filteredSites = useMemo(() => {
    if (!sites) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return sites.filter(site =>
      site.name.toLowerCase().includes(lowercasedTerm) ||
      (site.customers?.name && site.customers.name.toLowerCase().includes(lowercasedTerm)) ||
      site.address.toLowerCase().includes(lowercasedTerm)
    );
  }, [sites, searchTerm]);

  const sortedSites = useMemo(() => {
    let sortableItems = [...filteredSites];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'customers') {
          valA = a.customers?.name || '';
          valB = b.customers?.name || '';
        } else if (sortConfig.key === 'employees') {
          valA = a.employees ? `${a.employees.last_name} ${a.employees.first_name}` : '';
          valB = b.employees ? `${b.employees.last_name} ${b.employees.first_name}` : '';
        } else if (sortConfig.key === 'status') {
          valA = statusOrder.indexOf(a.status);
          valB = statusOrder.indexOf(b.status);
        } else {
          valA = a[sortConfig.key as keyof Site];
          valB = b[sortConfig.key as keyof Site];
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
  }, [filteredSites, sortConfig]);

  const totalPages = Math.ceil(sortedSites.length / ITEMS_PER_PAGE);
  const currentSites = sortedSites.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const requestSort = (key: keyof Site | 'employees') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

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

  if (isLoadingSites || isLoadingCustomers || isLoadingEmployees) return <div>Lade Daten...</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Baustellenverwaltung</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Baustellen suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full sm:w-64"
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> Neue Baustelle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[625px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedSite ? "Baustelle bearbeiten" : "Neue Baustelle anlegen"}
                </DialogTitle>
              </DialogHeader>
              {customers && employees && (
                <SiteForm
                  onSubmit={handleFormSubmit}
                  initialData={selectedSite}
                  customers={customers}
                  employees={employees}
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
                <Button variant="ghost" onClick={() => requestSort('customers')}>
                  Kunde <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('employees')}>
                  Bauführer <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('start_date')}>
                  Startdatum <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => requestSort('status')}>
                  Status <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentSites.length > 0 ? (
              currentSites.map((site) => (
                <TableRow key={site.id}>
                  <TableCell className="font-medium">
                    <Link to={`/sites/${site.id}`} className="hover:underline">
                      {site.name}
                    </Link>
                  </TableCell>
                  <TableCell>{site.customers?.name || "N/A"}</TableCell>
                  <TableCell>{site.employees ? `${site.employees.first_name} ${site.employees.last_name}` : "-"}</TableCell>
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
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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