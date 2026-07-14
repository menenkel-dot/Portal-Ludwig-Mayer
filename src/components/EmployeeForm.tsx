import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Employee } from "@/types";
import { NewEmployee } from "@/services/employeeService";

const formSchema = z.object({
  first_name: z.string().min(2, "Vorname ist erforderlich."),
  last_name: z.string().min(2, "Nachname ist erforderlich."),
  position: z.string().min(3, "Position ist erforderlich."),
  email: z.string().email("Ungültige E-Mail-Adresse.").optional().or(z.literal("")).nullable(),
  phone: z.string().min(5, "Telefonnummer ist erforderlich."),
  hourly_rate: z.coerce.number().positive("Stundensatz muss eine positive Zahl sein."),
  is_active: z.boolean(),
});

interface EmployeeFormProps {
  onSubmit: (data: NewEmployee) => void;
  initialData?: Employee | null;
  onCancel: () => void;
  isLoading: boolean;
}

export const EmployeeForm = ({ onSubmit, initialData, onCancel, isLoading }: EmployeeFormProps) => {
  const form = useForm<NewEmployee>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      position: initialData?.position || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      hourly_rate: initialData?.hourly_rate || 0,
      is_active: initialData?.is_active ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vorname</FormLabel>
                <FormControl>
                  <Input placeholder="Max" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nachname</FormLabel>
                <FormControl>
                  <Input placeholder="Mustermann" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Maurer, Polier" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail (optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="max.mustermann@firma.de" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefon</FormLabel>
              <FormControl>
                <Input placeholder="0176 12345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="hourly_rate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stundensatz (€)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="25.50" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {initialData && (
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Mitarbeiter aktiv</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Inaktive Mitarbeiter können nicht für neue Zeiteinträge ausgewählt werden.
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        )}
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
