import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { NewUserPayload } from "@/services/userService";

const permissionsList = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'customers', label: 'Kunden' },
  { id: 'employees', label: 'Mitarbeiter' },
  { id: 'sites', label: 'Baustellen' },
  { id: 'fleet', label: 'Fuhrpark' },
  { id: 'materials', label: 'Materialien' },
  { id: 'calculations', label: 'Kalkulation' },
  { id: 'service-catalog', label: 'Leistungskatalog' },
  { id: 'time-tracking', label: 'Zeiterfassung' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Einstellungen' },
];

const formSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse."),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein."),
  permissions: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "Sie müssen mindestens eine Berechtigung auswählen.",
  }),
});

interface UserFormProps {
  onSubmit: (data: NewUserPayload) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const UserForm = ({ onSubmit, onCancel, isLoading }: UserFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      permissions: [],
    },
  });

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
                <Input type="email" placeholder="max.mustermann@firma.de" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                return checked
                                  ? field.onChange([...field.value, item.id])
                                  : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== item.id
                                      )
                                    );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {item.label}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Speichern..." : "Benutzer erstellen"}
          </Button>
        </div>
      </form>
    </Form>
  );
};