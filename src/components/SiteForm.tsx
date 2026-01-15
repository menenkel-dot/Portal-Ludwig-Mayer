import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Customer, Site, Employee } from "@/types";
import { NewSite } from "@/services/siteService";

const formSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein."),
  address: z.string().min(5, "Adresse muss mindestens 5 Zeichen lang sein."),
  customer_id: z.string({ required_error: "Bitte einen Kunden auswählen." }),
  construction_manager_id: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  status: z.enum(["Geplant", "Kalkuliert", "Geprüft", "In Arbeit", "Abgeschlossen"]),
  planned_hours: z.coerce.number().min(0, "Stunden müssen eine positive Zahl sein.").optional().nullable(),
  notes: z.string().optional(),
});

interface SiteFormProps {
  onSubmit: (data: NewSite) => void;
  initialData?: Site | null;
  customers: Customer[];
  employees: Employee[];
  onCancel: () => void;
  isLoading: boolean;
}

export const SiteForm = ({ onSubmit, initialData, customers, employees, onCancel, isLoading }: SiteFormProps) => {
  const form = useForm<NewSite>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      address: initialData?.address || "",
      customer_id: initialData?.customer_id || "",
      construction_manager_id: initialData?.construction_manager_id || null,
      start_date: initialData?.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : null,
      end_date: initialData?.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : null,
      status: initialData?.status || "Geplant",
      planned_hours: initialData?.planned_hours || 0,
      notes: initialData?.notes || "",
    },
  });

  const handleValidSubmit = (data: NewSite) => {
    const processedData = {
      ...data,
      construction_manager_id: data.construction_manager_id === '--none--' ? null : data.construction_manager_id,
      start_date: data.start_date || null,
    };
    onSubmit(processedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValidSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Baustellenname</FormLabel>
              <FormControl>
                <Input placeholder="Projekt Musterbau" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kunde</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Kunde auswählen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="construction_manager_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bauführer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Bauführer auswählen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="--none--">Kein Bauführer</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.last_name} {employee.first_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Input placeholder="Baustellenweg 2, 54321 Baustadt" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Startdatum (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enddatum (optional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Geplant">Geplant</SelectItem>
                    <SelectItem value="Kalkuliert">Kalkuliert</SelectItem>
                    <SelectItem value="Geprüft">Geprüft</SelectItem>
                    <SelectItem value="In Arbeit">In Arbeit</SelectItem>
                    <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="planned_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Soll-Stunden</FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="z.B. 400" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notizen</FormLabel>
              <FormControl>
                <Textarea placeholder="Besonderheiten der Baustelle..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </form>
    </Form>
  );
};