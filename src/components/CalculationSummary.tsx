import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Calculation } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  energy_surcharge_percent: z.coerce.number().min(0).optional(),
  other_surcharges_percent: z.coerce.number().min(0).optional(),
  discount_percent: z.coerce.number().min(0).max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CalculationSummaryProps {
  calculation: Calculation;
  onUpdate: (data: FormData) => void;
  isUpdating: boolean;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

export const CalculationSummary = ({ calculation, onUpdate, isUpdating }: CalculationSummaryProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      energy_surcharge_percent: calculation.energy_surcharge_percent || 0,
      other_surcharges_percent: calculation.other_surcharges_percent || 0,
      discount_percent: calculation.discount_percent || 0,
    },
  });

  const watchedValues = form.watch();
  const subtotal = calculation.total_amount;
  const energySurcharge = subtotal * ((watchedValues.energy_surcharge_percent || 0) / 100);
  const otherSurcharges = subtotal * ((watchedValues.other_surcharges_percent || 0) / 100);
  const totalBeforeDiscount = subtotal + energySurcharge + otherSurcharges;
  const discount = totalBeforeDiscount * ((watchedValues.discount_percent || 0) / 100);
  const finalTotal = totalBeforeDiscount - discount;

  return (
    <Card>
      <CardHeader><CardTitle>Zusammenfassung & Zuschläge</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Calculation Details */}
          <div className="space-y-4 text-sm">
            <div className="flex justify-between"><span>Zwischensumme (Posten)</span> <span className="font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between"><span>+ Energieumlage ({watchedValues.energy_surcharge_percent || 0}%)</span> <span>{formatCurrency(energySurcharge)}</span></div>
            <div className="flex justify-between"><span>+ Sonstige Zuschläge ({watchedValues.other_surcharges_percent || 0}%)</span> <span>{formatCurrency(otherSurcharges)}</span></div>
            <Separator />
            <div className="flex justify-between font-semibold"><span>Summe vor Rabatt</span> <span>{formatCurrency(totalBeforeDiscount)}</span></div>
            <div className="flex justify-between text-red-600"><span>- Rabatt ({watchedValues.discount_percent || 0}%)</span> <span>{formatCurrency(discount)}</span></div>
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span>Gesamtsumme Netto</span> <span>{formatCurrency(finalTotal)}</span></div>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="energy_surcharge_percent"
                render={({ field }) => (
                  <FormItem><FormLabel>Energieumlage (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="other_surcharges_percent"
                render={({ field }) => (
                  <FormItem><FormLabel>Sonstige Zuschläge (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount_percent"
                render={({ field }) => (
                  <FormItem><FormLabel>Rabatt (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl></FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isUpdating || !form.formState.isDirty}>
                  {isUpdating ? "Speichern..." : "Zuschläge speichern"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
};