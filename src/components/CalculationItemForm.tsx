import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CalculationItem, Material, ServiceItem } from "@/types";
import { NewCalculationItem } from "@/services/calculationItemService";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  description: z.string().min(3, "Beschreibung ist erforderlich."),
  quantity: z.coerce.number().positive("Menge muss positiv sein."),
  unit: z.string().optional().nullable(),
  factor: z.coerce.number().optional().nullable(),
  unit_price: z.coerce.number().min(0, "Stückpreis darf nicht negativ sein."),
  material_id: z.string().optional().nullable(),
  service_item_id: z.string().optional().nullable(),
  parent_item_id: z.string().optional().nullable(),
});

interface CalculationItemFormProps {
  onSubmit: (data: Omit<NewCalculationItem, 'calculation_id'>, isServiceItem: boolean) => void;
  initialData?: CalculationItem | null;
  materials: Material[];
  serviceItems: ServiceItem[];
  onCancel: () => void;
  isLoading: boolean;
  parentItemId?: string | null;
}

export const CalculationItemForm = ({ onSubmit, initialData, materials, serviceItems, onCancel, isLoading, parentItemId = null }: CalculationItemFormProps) => {
  const form = useForm<Omit<NewCalculationItem, 'calculation_id'>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      quantity: initialData?.quantity || 1,
      unit: initialData?.unit || "",
      factor: initialData?.factor || 1,
      unit_price: initialData?.unit_price || 0,
      material_id: initialData?.material_id || null,
      service_item_id: initialData?.service_item_id || null,
      parent_item_id: parentItemId,
    },
  });

  const [materialPopoverOpen, setMaterialPopoverOpen] = React.useState(false);
  const [serviceItemPopoverOpen, setServiceItemPopoverOpen] = React.useState(false);

  const handleMaterialSelect = (material: Material) => {
    form.setValue("material_id", material.id);
    form.setValue("service_item_id", null);
    form.setValue("description", material.name);
    form.setValue("unit", material.unit);
    form.setValue("unit_price", material.price_per_unit);
    setMaterialPopoverOpen(false);
  };

  const handleServiceItemSelect = (serviceItem: ServiceItem) => {
    form.setValue("service_item_id", serviceItem.id);
    form.setValue("material_id", null);
    form.setValue("description", serviceItem.name);
    form.setValue("unit", serviceItem.unit || "");
    form.setValue("unit_price", 0); // Will be calculated by backend
    setServiceItemPopoverOpen(false);
  };

  const handleFormSubmit = (data: Omit<NewCalculationItem, 'calculation_id'>) => {
    const isServiceItem = !!data.service_item_id;
    onSubmit(data, isServiceItem);
  };

  const isSubItem = !!parentItemId || !!initialData?.parent_item_id;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {!isSubItem && (
          <div className="grid grid-cols-2 gap-4">
            <FormItem>
              <FormLabel>Material aus Katalog</FormLabel>
              <Popover open={materialPopoverOpen} onOpenChange={setMaterialPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !form.watch("material_id") && "text-muted-foreground")}>
                      {form.watch("material_id") ? materials.find((m) => m.id === form.watch("material_id"))?.name : "Material auswählen"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command><CommandInput placeholder="Material suchen..." /><CommandList><CommandEmpty>Kein Material gefunden.</CommandEmpty><CommandGroup>
                        {materials.map((material) => (
                          <CommandItem value={material.name} key={material.id} onSelect={() => handleMaterialSelect(material)}>
                            <Check className={cn("mr-2 h-4 w-4", material.id === form.watch("material_id") ? "opacity-100" : "opacity-0")} />
                            {material.name}
                          </CommandItem>
                        ))}
                  </CommandGroup></CommandList></Command>
                </PopoverContent>
              </Popover>
            </FormItem>
            <FormItem>
              <FormLabel>Leistung aus Katalog</FormLabel>
              <Popover open={serviceItemPopoverOpen} onOpenChange={setServiceItemPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !form.watch("service_item_id") && "text-muted-foreground")}>
                      {form.watch("service_item_id") ? serviceItems.find((s) => s.id === form.watch("service_item_id"))?.name : "Leistung auswählen"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command><CommandInput placeholder="Leistung suchen..." /><CommandList><CommandEmpty>Keine Leistung gefunden.</CommandEmpty><CommandGroup>
                        {serviceItems.map((item) => (
                          <CommandItem value={item.name} key={item.id} onSelect={() => handleServiceItemSelect(item)}>
                            <Check className={cn("mr-2 h-4 w-4", item.id === form.watch("service_item_id") ? "opacity-100" : "opacity-0")} />
                            {item.name}
                          </CommandItem>
                        ))}
                  </CommandGroup></CommandList></Command>
                </PopoverContent>
              </Popover>
            </FormItem>
          </div>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl><Textarea placeholder="Manuelle Beschreibung..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className={cn("grid gap-4", isSubItem ? "grid-cols-4" : "grid-cols-3")}>
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem><FormLabel>Menge</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem><FormLabel>Einheit</FormLabel><FormControl><Input placeholder="m³, h, Stk" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )}
          />
          {isSubItem && (
            <FormField
              control={form.control}
              name="factor"
              render={({ field }) => (
                <FormItem><FormLabel>Faktor</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem><FormLabel>Preis/Einheit (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )}
          />
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>Abbrechen</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? "Speichern..." : "Speichern"}</Button>
        </div>
      </form>
    </Form>
  );
};