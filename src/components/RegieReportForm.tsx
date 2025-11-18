import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getOrCreateRegieReportForWeek, updateRegieReport } from "@/services/regieReportService";
import { Employee, RegieReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, PlusCircle } from "lucide-react";
import { getWeek, getYear, startOfWeek, addDays, format } from "date-fns";
import { de } from "date-fns/locale";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  employee_hours: z.array(z.object({
    employee_id: z.string(),
    hours: z.object({
      mon: z.coerce.number().optional().nullable(),
      tue: z.coerce.number().optional().nullable(),
      wed: z.coerce.number().optional().nullable(),
      thu: z.coerce.number().optional().nullable(),
      fri: z.coerce.number().optional().nullable(),
    }),
  })).optional(),
  work_descriptions: z.array(z.object({
    id: z.string(),
    description: z.string(),
  })).optional(),
  materials: z.array(z.object({
    id: z.string(),
    quantity: z.coerce.number().optional().nullable(),
    unit: z.string(),
    description: z.string(),
    unit_price: z.coerce.number().optional().nullable(),
  })).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RegieReportFormProps {
  siteId: string;
  reportId: string | null;
  employees: Employee[];
  onClose: () => void;
}

export const RegieReportForm = ({ siteId, reportId, employees, onClose }: RegieReportFormProps) => {
  const queryClient = useQueryClient();
  const weekNumber = getWeek(new Date(), { weekStartsOn: 1 });
  const year = getYear(new Date());

  const { data: report, isLoading } = useQuery({
    queryKey: ["regieReport", reportId || `new-${siteId}-${weekNumber}-${year}`],
    queryFn: () => getOrCreateRegieReportForWeek(siteId, weekNumber, year),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const { fields: employeeFields, append: appendEmployee, remove: removeEmployee } = useFieldArray({ control: form.control, name: "employee_hours" });
  const { fields: workFields, append: appendWork, remove: removeWork } = useFieldArray({ control: form.control, name: "work_descriptions" });
  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({ control: form.control, name: "materials" });

  useEffect(() => {
    if (report) {
      form.reset({
        employee_hours: report.employee_hours || [],
        work_descriptions: report.work_descriptions || [],
        materials: report.materials || [],
      });
    }
  }, [report, form]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => updateRegieReport(report!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regieReports", siteId] });
      queryClient.invalidateQueries({ queryKey: ["regieReport", report!.id] });
      showSuccess("Regiebericht gespeichert.");
      onClose();
    },
    onError: (error: Error) => showError(error.message),
  });

  const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`])), [employees]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 5 }).map((_, i) => addDays(start, i));
  }, []);

  if (isLoading) return <div>Lade Bericht...</div>;
  if (!report) return <div>Fehler beim Laden des Berichts.</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><span className="font-semibold">Bauvorhaben:</span> {report.site_id}</div>
          <div><span className="font-semibold">KW:</span> {report.week_number}</div>
          <div><span className="font-semibold">Datum:</span> {format(weekDays[0], 'dd.MM.yyyy')} - {format(weekDays[4], 'dd.MM.yyyy')}</div>
        </div>

        {/* Employee Hours */}
        <Card>
          <CardHeader><CardTitle className="text-base">Mitarbeiterstunden</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Name</TableHead>
                  {weekDays.map(day => <TableHead key={day.toISOString()} className="text-center">{format(day, 'E', { locale: de })}</TableHead>)}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeFields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>{employeeMap.get(form.getValues(`employee_hours.${index}.employee_id`))}</TableCell>
                    <TableCell><Input type="number" step="0.25" {...form.register(`employee_hours.${index}.hours.mon`)} /></TableCell>
                    <TableCell><Input type="number" step="0.25" {...form.register(`employee_hours.${index}.hours.tue`)} /></TableCell>
                    <TableCell><Input type="number" step="0.25" {...form.register(`employee_hours.${index}.hours.wed`)} /></TableCell>
                    <TableCell><Input type="number" step="0.25" {...form.register(`employee_hours.${index}.hours.thu`)} /></TableCell>
                    <TableCell><Input type="number" step="0.25" {...form.register(`employee_hours.${index}.hours.fri`)} /></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeEmployee(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Select onValueChange={(employeeId) => appendEmployee({ employee_id: employeeId, hours: { mon: null, tue: null, wed: null, thu: null, fri: null } })}>
              <SelectTrigger className="mt-4 w-[250px]"><SelectValue placeholder="Mitarbeiter hinzufügen..." /></SelectTrigger>
              <SelectContent>
                {employees.filter(e => !employeeFields.some(f => f.employee_id === e.id)).map(e => <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Work Descriptions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ausgeführte Arbeiten</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {workFields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Textarea {...form.register(`work_descriptions.${index}.description`)} />
                <Button variant="ghost" size="icon" onClick={() => removeWork(index)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => appendWork({ id: uuidv4(), description: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Arbeit hinzufügen</Button>
          </CardContent>
        </Card>

        {/* Materials */}
        <Card>
          <CardHeader><CardTitle className="text-base">Benötigtes Material / Maschinen</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Anzahl</TableHead>
                  <TableHead className="w-[100px]">Einheit</TableHead>
                  <TableHead>Material/Maschine</TableHead>
                  <TableHead className="w-[120px]">EP in €</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialFields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell><Input type="number" step="0.1" {...form.register(`materials.${index}.quantity`)} /></TableCell>
                    <TableCell><Input {...form.register(`materials.${index}.unit`)} /></TableCell>
                    <TableCell><Input {...form.register(`materials.${index}.description`)} /></TableCell>
                    <TableCell><Input type="number" step="0.01" {...form.register(`materials.${index}.unit_price`)} /></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendMaterial({ id: uuidv4(), quantity: null, unit: '', description: '', unit_price: null })}><PlusCircle className="mr-2 h-4 w-4" /> Material hinzufügen</Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Speichern..." : "Bericht speichern"}</Button>
        </div>
      </form>
    </Form>
  );
};