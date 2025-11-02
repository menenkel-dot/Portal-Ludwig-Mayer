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
import { CalculationItem, Material } from "@/types";
import { NewCalculationItem } from "@/services/calculationItemService";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  description: z.string().min(3, "Beschreibung ist erforderlich."),
  quantity: z.coerce.number().positive("Menge muss positiv sein."),
  unit: z.string().optional(),
  unit_price: z.coerce.number().positive("Stückpreis muss positiv sein."),
  material_id: z.string().optional().nullable(),
});

interface CalculationItemFormProps {
  onSubmit: (data: Omit<NewCalculationItem, 'calculation_id'>) => void;
  initialData?: CalculationItem | null;
  materials: Material[];
  onCancel: () => void;
  isLoading: boolean;
}

export const CalculationItemForm = ({ onSubmit, initialData, materials, onCancel, isLoading }: CalculationItemFormProps) => {
  const form = useForm<Omit<NewCalculationItem, 'calculation_id'>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      quantity: initialData?.quantity || 1,
      unit: initialData?.unit || "",
      unit_price: initialData?.unit_price || 0,
      material_id: initialData?.material_id || null,
    },
  });

  const [open, setOpen] = React.useState(false);

  const handleMaterialSelect = (material: Material) => {
    form.setValue("material_id", material.id);
    form.setValue("description", material.name);
    form.setValue("unit", material.unit);
    form.setValue("unit_price", material.price_per_unit);
    setOpen(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormItem>
          <FormLabel>Material aus Katalog (optional)</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between",
                    !form.watch("material_id") && "text-muted-foreground"
                  )}
                >
                  {form.watch("material_id")
                    ? materials.find((m) => m.id === form.watch("material_id"))?.name
                    : "Material auswählen"}
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
                      <CommandItem
                        value={material.name}
                        key={material.id}
                        onSelect={() => handleMaterialSelect(material)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            material.id === form.watch("material_id") ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {material.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FormItem>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung</FormLabel>
              <FormControl>
                <Textarea placeholder="z.B. Beton C25/30" {...field} />
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
                  <Input placeholder="m³, h, Stk" {...field} />
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