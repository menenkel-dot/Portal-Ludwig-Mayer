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
import { CalculationItem } from "@/types";
import { NewCalculationItem } from "@/services/calculationItemService";

const formSchema = z.object({
  description: z.string().min(3, "Beschreibung ist erforderlich."),
  quantity: z.coerce.number().positive("Menge muss positiv sein."),
  unit: z.string().optional(),
  unit_price: z.coerce.number().positive("Stückpreis muss positiv sein."),
});

interface CalculationItemFormProps {
  onSubmit: (data: Omit<NewCalculationItem, 'calculation_id'>) => void;
  initialData?: CalculationItem | null;
  onCancel: () => void;
  isLoading: boolean;
}

export const CalculationItemForm = ({ onSubmit, initialData, onCancel, isLoading }: CalculationItemFormProps) => {
  const form = useForm<Omit<NewCalculationItem, 'calculation_id'>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      quantity: initialData?.quantity || 1,
      unit: initialData?.unit || "",
      unit_price: initialData?.unit_price || 0,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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