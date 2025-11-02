import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCalculations } from "@/services/calculationService";
import { getCalculationItems, createCalculationItem, updateCalculationItem, deleteCalculationItem, NewCalculationItem } from "@/services/calculationItemService";
import { getMaterials } from "@/services/materialService";
import { CalculationItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, ArrowLeft } from "lucide-react";
import { CalculationItemForm } from "@/components/CalculationItemForm";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";

const CalculationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CalculationItem | null>(null);

  const { data: calculations } = useQuery({ queryKey: ["calculations"], queryFn: getCalculations });
  const calculation = calculations?.find(c => c.id === id);

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["calculationItems", id],
    queryFn: () => getCalculationItems(id!),
    enabled: !!id,
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ["materials"],
    queryFn: getMaterials,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculationItems", id] });
      queryClient.invalidateQueries({ queryKey: ["calculations"] }); // To update total amount
      setIsDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({
    mutationFn: createCalculationItem,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Posten hinzugefügt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Partial<NewCalculationItem> }) => updateCalculationItem(itemId, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Posten aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCalculationItem,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Posten gelöscht.");
    },
  });

  const handleFormSubmit = (data: Omit<NewCalculationItem, 'calculation_id'>) => {
    if (!id) return;
    const itemData = { ...data, calculation_id: id };
    if (selectedItem) {
      updateMutation.mutate({ itemId: selectedItem.id, data: itemData });
    } else {
      createMutation.mutate(itemData);
    }
  };

  const openDialog = (item: CalculationItem | null = null) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  if (!calculation) return <div>Kalkulation nicht gefunden.</div>;

  return (
    <div>
      <Link to="/calculations" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zu allen Kalkulationen
      </Link>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{calculation.name}</CardTitle>
              <CardDescription>{calculation.description || "Keine Beschreibung"}</CardDescription>
              <p className="text-sm text-muted-foreground mt-2">Baustelle: {calculation.sites?.name || "N/A"}</p>
            </div>
            <Badge variant="secondary" className="text-lg">{formatCurrency(calculation.total_amount)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Posten</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Posten hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedItem ? "Posten bearbeiten" : "Neuen Posten hinzufügen"}</DialogTitle>
                </DialogHeader>
                {!isLoadingMaterials && materials && (
                  <CalculationItemForm
                    onSubmit={handleFormSubmit}
                    initialData={selectedItem}
                    materials={materials}
                    onCancel={() => setIsDialogOpen(false)}
                    isLoading={createMutation.isPending || updateMutation.isPending}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead className="text-right">Menge</TableHead>
                  <TableHead>Einheit</TableHead>
                  <TableHead className="text-right">Preis/Einheit</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingItems ? (
                  <TableRow><TableCell colSpan={6} className="text-center">Lade Posten...</TableCell></TableRow>
                ) : (
                  items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.description}
                        {item.material_id && (
                          <p className="text-xs text-muted-foreground">
                            aus Materialkatalog
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.total_price)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog(item)}>Bearbeiten</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteMutation.mutate(item.id)} className="text-red-600">Löschen</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end font-bold text-xl">
          <div>Gesamtsumme: {formatCurrency(calculation.total_amount)}</div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default CalculationDetail;