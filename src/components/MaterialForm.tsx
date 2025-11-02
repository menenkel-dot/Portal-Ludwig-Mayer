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
import { Material } from "@/types";
import { NewMaterial } from "@/services/materialService";

const formSchema = z.object({
  name: z.string().min(3, "Name ist erforderlich."),
  unit: z.string().min(1, "Einheit ist erforderlich (z.B. Stk, m³, lfm)."),
  price_per_unit: z.coerce.number().positive("Preis muss eine positive Zahl sein."),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

interface MaterialFormProps {
  onSubmit: (data: NewMaterial) => void;
  initialData?: Material | null;
  onCancel: () => void;
  isLoading: boolean;
}

export const MaterialForm = ({ onSubmit, initialData, onCancel, isLoading }: MaterialFormProps) => {
  const form = useForm<NewMaterial>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      unit: initialData?.unit || "",
      price_per_unit: initialData?.price_per_unit || 0,
      supplier: initialData?.supplier || "",
      notes: initialData?.notes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Materialname</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Beton C25/30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Einheit</FormLabel>
                <FormControl>
                  <Input placeholder="m³, Stk, lfm" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="price_per_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preis pro Einheit (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="120.50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lieferant (optional)</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Baustoff-Handel GmbH" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notizen (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Artikelnummer, besondere Eigenschaften..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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