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
import { Customer } from "@/types";
import { NewCustomer } from "@/services/customerService";

const formSchema = z.object({
  name: z.string().min(2, "Name muss mindestens 2 Zeichen lang sein."),
  contact_person: z.string().min(2, "Ansprechpartner muss mindestens 2 Zeichen lang sein."),
  address: z.string().min(5, "Adresse muss mindestens 5 Zeichen lang sein."),
  phone: z.string().min(5, "Telefonnummer ist erforderlich."),
  email: z.string().email("Ungültige E-Mail-Adresse."),
  notes: z.string().optional(),
});

interface CustomerFormProps {
  onSubmit: (data: NewCustomer) => void;
  initialData?: Customer | null;
  onCancel: () => void;
  isLoading: boolean;
}

export const CustomerForm = ({ onSubmit, initialData, onCancel, isLoading }: CustomerFormProps) => {
  const form = useForm<NewCustomer>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      contact_person: initialData?.contact_person || "",
      address: initialData?.address || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
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
              <FormLabel>Kundenname</FormLabel>
              <FormControl>
                <Input placeholder="Bau Gmbh" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contact_person"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ansprechpartner</FormLabel>
              <FormControl>
                <Input placeholder="Max Mustermann" {...field} />
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
              <FormLabel>E-Mail</FormLabel>
              <FormControl>
                <Input placeholder="max@bau.de" {...field} />
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
                <Input placeholder="0123 456789" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse</FormLabel>
              <FormControl>
                <Input placeholder="Musterstraße 1, 12345 Musterstadt" {...field} />
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
              <FormLabel>Notizen</FormLabel>
              <FormControl>
                <Textarea placeholder="Zusätzliche Informationen..." {...field} />
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