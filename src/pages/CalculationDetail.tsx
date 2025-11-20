import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCalculations, updateCalculation } from "@/services/calculationService";
import { getCalculationItems, createCalculationItem, updateCalculationItem, deleteCalculationItem, addServiceItemToCalculation, NewCalculationItem } from "@/services/calculationItemService";
import { getMaterials } from "@/services/materialService";
import { getServiceItems } from "@/services/serviceCatalogService";
import { CalculationItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, ArrowLeft, ChevronRight, ChevronDown } from "lucide-react";
import { CalculationItemForm } from "@/components/CalculationItemForm";
import { CalculationSummary } from "@/components/CalculationSummary";
import { showSuccess, showError } from "@/utils/toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

const CalculationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<{ item: CalculationItem | null, parentId: string | null }>({ item: null, parentId: null });

  const { data: calculations, isLoading: isLoadingCalculations } = useQuery({ queryKey: ["calculations"], queryFn: getCalculations });
  const calculation = calculations?.find(c => c.id === id);

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["calculationItems", id],
    queryFn: () => getCalculationItems(id!),
    enabled: !!id,
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery({ queryKey: ["materials"], queryFn: getMaterials });
  const { data: serviceItems, isLoading: isLoadingServiceItems } = useQuery({ queryKey: ["serviceItems"], queryFn: getServiceItems });

  const itemsHierarchy = useMemo(() => {
    if (!items) return [];
    const itemMap = new Map(items.map(item => [item.id, { ...item, children: [] as CalculationItem[] }]));
    const topLevelItems: (CalculationItem & { children: CalculationItem[] })[] = [];

    items.forEach(item => {
      if (item.parent_item_id) {
        const parent = itemMap.get(item.parent_item_id);
        if (parent) {
          parent.children.push(item);
        }
      } else {
        topLevelItems.push(itemMap.get(item.id)!);
      }
    });
    return topLevelItems;
  }, [items]);

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculationItems", id] });
      queryClient.invalidateQueries({ queryKey: ["calculations"] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({ mutationFn: createCalculationItem, ...mutationOptions, onSuccess: () => { mutationOptions.onSuccess(); showSuccess("Posten hinzugefügt."); } });
  const updateItemMutation = useMutation({ mutationFn: ({ itemId, data }: { itemId: string; data: Partial<NewCalculationItem> }) => updateCalculationItem(itemId, data), ...mutationOptions, onSuccess: () => { mutationOptions.onSuccess(); showSuccess("Posten aktualisiert."); } });
  const deleteItemMutation = useMutation({ mutationFn: deleteCalculationItem, ...mutationOptions, onSuccess: () => { mutationOptions.onSuccess(); showSuccess("Posten gelöscht."); } });
  const addServiceItemMutation = useMutation({ mutationFn: ({ calcId, serviceId, qty }: { calcId: string, serviceId: string, qty: number }) => addServiceItemToCalculation(calcId, serviceId, qty), ...mutationOptions, onSuccess: () => { mutationOptions.onSuccess(); showSuccess("Leistungsposition hinzugefügt."); } });
  const updateCalcMutation = useMutation({ mutationFn: (data: Partial<Calculation>) => updateCalculation(id!, data), ...mutationOptions, onSuccess: () => { mutationOptions.onSuccess(); showSuccess("Zuschläge gespeichert."); } });

  const handleFormSubmit = (data: Omit<NewCalculationItem, 'calculation_id'>, isServiceItem: boolean) => {
    if (!id) return;
    if (isServiceItem && data.service_item_id) {
      addServiceItemMutation.mutate({ calcId: id, serviceId: data.service_item_id, qty: data.quantity });
    } else {
      const itemData = { ...data, calculation_id: id };
      if (dialogState.item) {
        updateItemMutation.mutate({ itemId: dialogState.item.id, data: itemData });
      } else {
        createMutation.mutate(itemData);
      }
    }
  };

  const openDialog = (item: CalculationItem | null = null, parentId: string | null = null) => {
    setDialogState({ item, parentId });
    setIsDialogOpen(true);
  };

  const isLoading = isLoadingCalculations || isLoadingItems || isLoadingMaterials || isLoadingServiceItems;

  if (isLoading) return <div>Lade Kalkulation...</div>;
  if (!calculation) return <div>Kalkulation nicht gefunden.</div>;

  return (
    <div className="space-y-6">
      <Link to="/calculations" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zu allen Kalkulationen
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{calculation.name}</CardTitle>
          <CardDescription>{calculation.description || "Keine Beschreibung"}</CardDescription>
          <p className="text-sm text-muted-foreground pt-2">Baustelle: {calculation.sites?.name || "N/A"}</p>
        </CardHeader>
      </Card>

      <CalculationSummary calculation={calculation} onUpdate={(data) => updateCalcMutation.mutate(data)} isUpdating={updateCalcMutation.isPending} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Positionen</CardTitle>
          <Button onClick={() => openDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Position hinzufügen</Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader><TableRow><TableHead className="w-12"></TableHead><TableHead>Beschreibung</TableHead><TableHead className="text-right">Menge</TableHead><TableHead>Einheit</TableHead><TableHead className="text-right">Preis/Einheit</TableHead><TableHead className="text-right">Gesamt</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
              <TableBody>
                {itemsHierarchy.map(item => <CalculationItemRow key={item.id} item={item} onEdit={openDialog} onDelete={deleteItemMutation.mutate} />)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogState.item ? "Position bearbeiten" : "Neue Position hinzufügen"}</DialogTitle></DialogHeader>
          {materials && serviceItems && (
            <CalculationItemForm
              onSubmit={handleFormSubmit}
              initialData={dialogState.item}
              materials={materials}
              serviceItems={serviceItems}
              onCancel={() => setIsDialogOpen(false)}
              isLoading={createMutation.isPending || updateItemMutation.isPending || addServiceItemMutation.isPending}
              parentItemId={dialogState.parentId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CalculationItemRow = ({ item, onEdit, onDelete }: { item: CalculationItem & { children: CalculationItem[] }, onEdit: (item: CalculationItem | null, parentId?: string | null) => void, onDelete: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isServiceItem = !!item.service_item_id;

  return (
    <Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
      <>
        <TableRow className={cn(isServiceItem && "bg-muted/50")}>
          <TableCell>
            {isServiceItem && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            )}
          </TableCell>
          <TableCell className="font-medium">{item.description}</TableCell>
          <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
          <TableCell>{item.unit}</TableCell>
          <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
          <TableCell className="text-right font-semibold">{formatCurrency(item.total_price)}</TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>Bearbeiten</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-red-600">Löschen</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        {isServiceItem && (
          <CollapsibleContent asChild>
            <>
              {item.children.map(child => (
                <TableRow key={child.id} className="bg-background">
                  <TableCell></TableCell>
                  <TableCell className="pl-12 text-muted-foreground">{child.description}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{child.quantity.toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{child.unit}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(child.unit_price)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(child.total_price)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(child, item.id)}>Bearbeiten</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(child.id)} className="text-red-600">Löschen</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </>
          </CollapsibleContent>
        )}
      </>
    </Collapsible>
  );
};

export default CalculationDetail;