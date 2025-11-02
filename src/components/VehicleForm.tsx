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
import { Vehicle } from "@/types";
import { NewVehicle } from "@/services/vehicleService";

const formSchema = z.object({
  license_plate: z.string().min(3, "Kennzeichen ist erforderlich."),
  vehicle_type: z.string().min(2, "Fahrzeugtyp ist erforderlich."),
  manufacturer: z.string().min(2, "Hersteller ist erforderlich."),
  model: z.string().min(1, "Modell ist erforderlich."),
  status: z.enum(["Verfügbar", "Im Einsatz", "In Wartung"]),
  location: z.string().min(3, "Standort ist erforderlich."),
  next_maintenance: z.string().optional().nullable(),
  notes: z.string().optional(),
});

interface VehicleFormProps {
  onSubmit: (data: NewVehicle) => void;
  initialData?: Vehicle | null;
  onCancel: () => void;
  isLoading: boolean;
}

export const VehicleForm = ({ onSubmit, initialData, onCancel, isLoading }: VehicleFormProps) => {
  const form = useForm<NewVehicle>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      license_plate: initialData?.license_plate || "",
      vehicle_type: initialData?.vehicle_type || "",
      manufacturer: initialData?.manufacturer || "",
      model: initialData?.model || "",
      status: initialData?.status || "Verfügbar",
      location: initialData?.location || "",
      next_maintenance: initialData?.next_maintenance ? new Date(initialData.next_maintenance).toISOString().split('T')[0] : null,
      notes: initialData?.notes || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="manufacturer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hersteller</FormLabel>
                <FormControl>
                  <Input placeholder="z.B. Mercedes-Benz" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modell</FormLabel>
                <FormControl>
                  <Input placeholder="z.B. Sprinter" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="license_plate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kennzeichen</FormLabel>
              <FormControl>
                <Input placeholder="B-XY 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="vehicle_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fahrzeugtyp</FormLabel>
              <FormControl>
                <Input placeholder="z.B. Transporter, Bagger" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Verfügbar">Verfügbar</SelectItem>
                    <SelectItem value="Im Einsatz">Im Einsatz</SelectItem>
                    <SelectItem value="In Wartung">In Wartung</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Standort</FormLabel>
                <FormControl>
                  <Input placeholder="z.B. Firmensitz" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="next_maintenance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nächste Wartung (optional)</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value ?? ''} />
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
                <Textarea placeholder="Besonderheiten zum Fahrzeug..." {...field} />
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