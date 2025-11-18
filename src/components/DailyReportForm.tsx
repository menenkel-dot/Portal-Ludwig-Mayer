import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyConstructionReport, WorkerCounts } from "@/types";
import { UpsertReportPayload } from "@/services/dailyReportService";

const formSchema = z.object({
  weather_conditions: z.object({
    sun: z.boolean().optional(),
    rain: z.boolean().optional(),
    frost: z.boolean().optional(),
    wind: z.boolean().optional(),
    snow: z.boolean().optional(),
    temperature: z.coerce.number().optional().nullable(),
  }).optional().nullable(),
  worker_counts: z.record(z.object({
    count: z.coerce.number().optional().nullable(),
    hours: z.coerce.number().optional().nullable(),
  })).optional().nullable(),
  work_results: z.string().optional().nullable(),
  obstacles: z.string().optional().nullable(),
  scope_changes: z.string().optional().nullable(),
  special_incidents: z.string().optional().nullable(),
});

type FormData = Omit<UpsertReportPayload, 'site_id' | 'report_date' | 'created_by_user_id'>;

interface DailyReportFormProps {
  initialData?: DailyConstructionReport | null;
  onSubmit: (data: FormData) => void;
  isLoading: boolean;
  reportDate: string;
}

const workerTypes = [
  { key: "polier", label: "Polier" },
  { key: "werkpolier", label: "Werkpolier" },
  { key: "bauvorarbeiter", label: "Bauvorarbeiter" },
  { key: "spezialbaufacharb", label: "Spezialbaufacharb." },
  { key: "gehob_baufacharb", label: "gehob. Baufacharb." },
  { key: "baufacharbeiter", label: "Baufacharbeiter" },
  { key: "baufachwerker", label: "Baufachwerker" },
  { key: "bauwerker", label: "Bauwerker" },
  { key: "maschinisten", label: "Maschinisten" },
  { key: "kraftfahrer", label: "Kraftfahrer" },
  { key: "fremdfirmen", label: "Fremdfirmen" },
];

const transformWorkerCounts = (counts: any): WorkerCounts => {
  if (!counts) return {};
  const newCounts: WorkerCounts = {};
  for (const key in counts) {
    const value = counts[key];
    if (typeof value === 'number') {
      // Handle old format (number represents hours)
      newCounts[key] = { count: null, hours: value };
    } else if (typeof value === 'object' && value !== null) {
      // Handle new format
      newCounts[key] = {
        count: value.count ?? null,
        hours: value.hours ?? null,
      };
    }
  }
  return newCounts;
};

export const DailyReportForm = ({ initialData, onSubmit, isLoading, reportDate }: DailyReportFormProps) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weather_conditions: initialData?.weather_conditions || { temperature: null },
      worker_counts: transformWorkerCounts(initialData?.worker_counts),
      work_results: initialData?.work_results || "",
      obstacles: initialData?.obstacles || "",
      scope_changes: initialData?.scope_changes || "",
      special_incidents: initialData?.special_incidents || "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h3 className="text-lg font-semibold">{reportDate}</h3>
        <Card>
          <CardHeader><CardTitle className="text-base">Witterung</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {["sun", "rain", "frost", "wind", "snow"].map(cond => (
                <FormField
                  key={cond}
                  control={form.control}
                  name={`weather_conditions.${cond as 'sun'}`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal capitalize">{cond === 'sun' ? 'Sonne' : cond === 'rain' ? 'Regen' : cond === 'frost' ? 'Frost' : cond === 'wind' ? 'Wind' : 'Schnee'}</FormLabel>
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="weather_conditions.temperature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperatur (°C)</FormLabel>
                  <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Anzahl der beschäftigten Arbeiter</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {workerTypes.map(worker => (
              <div key={worker.key} className="space-y-2">
                <FormLabel>{worker.label}</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name={`worker_counts.${worker.key}.count`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl><Input type="number" placeholder="Anzahl" {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`worker_counts.${worker.key}.hours`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl><Input type="number" step="0.5" placeholder="Stunden" {...field} value={field.value ?? ''} /></FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <FormField
          control={form.control}
          name="work_results"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leistungsergebnisse</FormLabel>
              <FormControl><Textarea rows={5} {...field} value={field.value ?? ''} /></FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="obstacles"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Behinderungen/Erschwernisse</FormLabel>
              <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="scope_changes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Leistungsänderungen</FormLabel>
              <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="special_incidents"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Besondere Vorkommnisse (Begehungen/Abnahmen/...)</FormLabel>
              <FormControl><Textarea rows={3} {...field} value={field.value ?? ''} /></FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Speichern..." : "Tagesbericht speichern"}
          </Button>
        </div>
      </form>
    </Form>
  );
};