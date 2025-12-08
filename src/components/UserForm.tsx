import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormDescription,
} from "@/components/ui/form";
import { AppUser } from "@/types";

const permissionsList = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Kunden' },
  { id: 'employees', label: 'Mitarbeiter' },
  { id: 'sites', label: 'Baustellen' },
  { id: 'fleet', label: 'Fuhrpark' },
  { id: 'time-tracking', label: 'Zeiterfassung' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Einstellungen' },
];

const departments = ["Geschäftsführung", "Verwaltung", "Kalkulation", "Bauleitung"];

const formSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse."),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben.").optional().or(z.literal('')),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Sie müssen mindestens eine Berechtigung auswählen.",
  }),
  department: z.string().optional(),
});

interface UserFormProps {
  onSubmit: (data: any) => void;
  initialData?: AppUser | null;
  onCancel: () => void;
  isLoading: boolean;
}

export const UserForm = ({ onSubmit, initialData, onCancel, isLoading }: UserFormProps) => {
  const isEditMode = !!initialData;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: initialData?.email || "",
      password: "",
      permissions: initialData?.app_metadata.permissions || [],
      department: initialData?.app_metadata.department || "",
    },
  });

  useEffect(() => {
    form.reset({
      email: initialData?.email || "",
      password: "",
      permissions: initialData?.app_metadata.permissions || [],
      department: initialData?.app_metadata.department || "",
    });
  }, [initialData, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="max.mustermann@firma.de" {...field} disabled={isEditMode} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEditMode && (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Passwort</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Abteilung</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Abteilung auswählen" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {departments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="permissions"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Berechtigungen</FormLabel>
                <FormDescription>
                  Wählen Sie die Seiten aus, auf die der Benutzer zugreifen darf.
                </FormDescription>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {permissionsList.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="permissions"
                    render={({ field }) => (
                      <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(field.value?.filter((value) => value !== item.id));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{item.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>Abbrechen</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Speichern..." : isEditMode ? "Änderungen speichern" : "Benutzer erstellen"}
          </Button>
        </div>
      </form>
    </Form>
  );
};