import * as React from "react";
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
import { Employee, Site, TimeEntry } from "@/types";
import { NewTimeEntry } from "@/services/timeTrackingService";

const formSchema = z.object({
  employee_id: z.string({ required_error: "Bitte einen Mitarbeiter auswählen." }),
  site_id: z.string().optional().nullable(),
  date: z.string().min(1, "Datum ist erforderlich."),
  hours_worked: z.coerce.number().positive("Stunden müssen eine positive Zahl sein."),
  hourly_rate: z.coerce.number().optional(), // Snapshot des Lohns
  description: z.string().optional(),
  entry_type: z.enum([
    "Arbeit",
    "Urlaub",
    "Schlechtwetter",
    "Krank",
    "Feiertag",
    "Unbezahlter Urlaub",
    "Krank Unfall",
    "Krank Krankenkasse",
    "Fehlt entschuldigt",
    "Fehlt unentschuldigt",
    "Freier Tag",
    "Kurzarbeitergeld"
  ]),
}).refine(data => {
    if (data.entry_type === 'Arbeit') {
        return !!data.site_id;
    }
    return true;
}, {
    message: "Für 'Arbeit' muss eine Baustelle ausgewählt werden.",
    path: ["site_id"],
});

interface TimeEntryFormProps {
  onSubmit: (data: NewTimeEntry) => void;
  initialData?: TimeEntry | null;
  employees: Employee[];
  sites: Site[];
  onCancel: () => void;
  isLoading: boolean;
}

export const TimeEntryForm = ({ onSubmit, initialData, employees, sites, onCancel, isLoading }: TimeEntryFormProps) => {
  const form = useForm<NewTimeEntry>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_id: initialData?.employee_id || "",
      site_id: initialData?.site_id || "",
      date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      hours_worked: initialData?.hours_worked || 0,
      hourly_rate: initialData?.hourly_rate || 0,
      description: initialData?.description || "",
      entry_type: initialData?.entry_type || "Arbeit",
    },
  });

  const entryType = form.watch("entry_type");
  const employeeId = form.watch("employee_id");

  // Wenn der Mitarbeiter geändert wird, aktualisiere den Snapshot-Lohn (nur bei neuen Einträgen)
  React.useEffect(() => {
    if (!initialData && employeeId) {
      const selectedEmployee = employees.find(e => e.id === employeeId);
      if (selectedEmployee) {
        form.setValue('hourly_rate', selectedEmployee.hourly_rate);
      }
    }
  }, [employeeId, employees, form, initialData]);

  React.useEffect(() => {
    if (entryType === 'Urlaub' || entryType === 'Schlechtwetter' || entryType === 'Krank') {
      form.setValue('site_id', null);
      if (!initialData || initialData.hours_worked === 0) {
        form.setValue('hours_worked', 9);
      }
    }
  }, [entryType, form, initialData]);

  const sortedEmployees = React.useMemo(() => {
    return [...employees].sort((a, b) => a.last_name.localeCompare(b.last_name));
  }, [employees]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Datum</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="entry_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Art des Eintrags</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Arbeit">Arbeit</SelectItem>
                    <SelectItem value="Urlaub">Urlaub</SelectItem>
                    <SelectItem value="Schlechtwetter">Schlechtwetter</SelectItem>
                    <SelectItem value="Krank">Krank</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="employee_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mitarbeiter</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Mitarbeiter auswählen" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {sortedEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.last_name}, {employee.first_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {entryType === 'Arbeit' && (
          <FormField
            control={form.control}
            name="site_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Baustelle</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Baustelle auswählen" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="hours_worked"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Stunden</FormLabel>
                <FormControl>
                    <Input type="number" step="0.25" placeholder="9" {...field} />
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
                    <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Beschreibung (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Kurze Beschreibung..." {...field} />
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