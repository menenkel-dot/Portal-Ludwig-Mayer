import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getServiceItemById, createServiceItemComponent, updateServiceItemComponent, deleteServiceItemComponent, NewServiceItemComponent } from "@/services/serviceCatalogService";
import { getMaterials } from "@/services/materialService";
import { ServiceItemComponent } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, ArrowLeft } from "lucide-react";
import { ServiceItemComponentForm } from "@/components/ServiceItemComponentForm";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";

const ServiceCatalogDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ServiceItemComponent | null>(null);

  const { data: serviceItem, isLoading: isLoadingItem } = useQuery({
    queryKey: ["serviceItem", id],
    queryFn: () => getServiceItemById(id!),
    enabled: !!id,
  });

  const { data: materials, isLoading: isLoadingMaterials } = useQuery({
    queryKey: ["materials"],
    queryFn: getMaterials,
  });

  const mutationOptions = {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["serviceItem", id] });
      setIsDialogOpen(false);
      setSelectedComponent(null);
    },
    onError: (error: Error) => showError(error.message),
  };

  const createMutation = useMutation({
    mutationFn: createServiceItemComponent,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Komponente hinzugefügt.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ componentId, data }: { componentId: string; data: Partial<NewServiceItemComponent> }) => updateServiceItemComponent(componentId, data),
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Komponente aktualisiert.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteServiceItemComponent,
    ...mutationOptions,
    onSuccess: () => {
      mutationOptions.onSuccess();
      showSuccess("Komponente gelöscht.");
    },
  });

  const handleFormSubmit = (data: Omit<NewServiceItemComponent, 'service_item_id'>) => {
    if (!id) return;
    const componentData = { ...data, service_item_id: id };
    if (selectedComponent) {
      updateMutation.mutate({ componentId: selectedComponent.id, data: componentData });
    } else {
      createMutation.mutate(componentData);
    }
  };

  const openDialog = (item: ServiceItemComponent | null = null) => {
    setSelectedComponent(item);
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const totalAmount = useMemo(() => {
    return serviceItem?.service_item_components?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
  }, [serviceItem]);

  if (isLoadingItem) return <div>Lade Position...</div>;
  if (!serviceItem) return <div>Position nicht gefunden.</div>;

  return (
    <div>
      <Link to="/service-catalog" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zum Leistungskatalog
      </Link>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl">{serviceItem.name}</CardTitle>
              <CardDescription>{serviceItem.description || "Keine Beschreibung"}</CardDescription>
              <p className="text-sm text-muted-foreground mt-2">Einheit: {serviceItem.unit || "N/A"}</p>
            </div>
            <Badge variant="secondary" className="text-lg">{formatCurrency(totalAmount)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Komponenten</h2>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Komponente hinzufügen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>{selectedComponent ? "Komponente bearbeiten" : "Neue Komponente hinzufügen"}</DialogTitle>
                </DialogHeader>
                {!isLoadingMaterials && materials && (
                  <ServiceItemComponentForm
                    onSubmit={handleFormSubmit}
                    initialData={selectedComponent}
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
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Menge</TableHead>
                  <TableHead>Einheit</TableHead>
                  <TableHead className="text-right">Preis/Einheit</TableHead>
                  <TableHead className="text-right">Gesamt</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceItem.service_item_components?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                    <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end font-bold text-xl">
          <div>Gesamtsumme: {formatCurrency(totalAmount)}</div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ServiceCatalogDetail;