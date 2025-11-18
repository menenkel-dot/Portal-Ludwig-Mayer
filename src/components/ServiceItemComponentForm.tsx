import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceItemComponent, Material } from "@/types";
import { NewServiceItemComponent } from "@/services/serviceCatalogService";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  description: z.string().min(3, "Beschreibung ist erforderlich."),
  quantity: z.coerce.number().min(0, "Menge darf nicht negativ sein."),
  unit: z.string().optional().nullable(),
  unit_price: z.coerce.number().min(0, "Preis darf nicht negativ sein."),
  material_id: z.string().optional().nullable(),
  type: z.enum(["Material", "Lohn", "Sonstiges"]),
});

interface ServiceItemComponentFormProps {
  onSubmit: (data: Omit<NewServiceItemComponent, 'service_item_id'>) => void;
  initialData?: ServiceItemComponent | null;
  materials: Material[];
  onCancel: () => void;
  isLoading: boolean;
}

export const ServiceItemComponentForm = ({ onSubmit, initialData, materials, onCancel, isLoading }: ServiceItemComponentFormProps) => {
  const form = useForm<Omit<NewServiceItemComponent, 'service_item_id'>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      quantity: initialData?.quantity || 1,
      unit: initialData?.unit || "",
      unit_price: initialData?.unit_price || 0,
      material_id: initialData?.material_id || null,
      type: initialData?.type || "Material",
    },
  });

  const [open, setOpen] = React.useState(false);
  const componentType = form.watch("type");

  const handleMaterialSelect = (material: Material) => {
    form.setValue("material_id", material.id);
    form.setValue("description", material.name);
    form.setValue("unit", material.unit);
    form.setValue("unit_price", material.price_per_unit);
    setOpen(false);
  };

  React.useEffect(() => {
    if (componentType !== 'Material') {
      form.setValue('material_id', null);
    }
  }, [componentType, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Art der Komponente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Material">Material</SelectItem>
                  <SelectItem value="Lohn">Lohn</SelectItem>
                  <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {componentType === 'Material' && (
          <FormItem>
            <FormLabel>Material aus Katalog (optional)</FormLabel>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", !form.watch("material_id") && "text-muted-foreground")}>
                    {form.watch("material_id") ? materials.find((m) => m.id === form.watch("material_id"))?.name : "Material auswählen"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Material suchen..." />
                  <CommandList>
                    <CommandEmpty>Kein Material gefunden.</CommandEmpty>
                    <CommandGroup>
                      {materials.map((material) => (
                        <CommandItem value={material.name} key={material.id} onSelect={() => handleMaterialSelect(material)}>
                          <Check className={cn("mr-2 h-4 w-4", material.id === form.watch("material_id") ? "opacity-100" : "opacity-0")} />
                          {material.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormItem>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Beton C25/30, Rüstkosten, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Menge</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Einheit</FormLabel>
                <FormControl>
                  <Input placeholder="m³, h, Stk" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unit_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preis/Einheit (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>Abbrechen</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </form>
    </Form>
  );
};