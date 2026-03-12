import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getOrCreateRegieReportForWeek, updateRegieReport } from "@/services/regieReportService";
import { getSiteById } from "@/services/siteService";
import { Employee, RegieReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Trash2, PlusCircle, FileDown } from "lucide-react";
import { startOfWeek, addDays, format, setWeek, setYear } from "date-fns";
import { de } from "date-fns/locale";
import { showSuccess, showError } from "@/utils/toast";
import { v4 as uuidv4 } from 'uuid';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  weekNumber: number;
  year: number;
  employees: Employee[];
  onClose: () => void;
}

export const RegieReportForm = ({ siteId, reportId, weekNumber, year, employees, onClose }: RegieReportFormProps) => {
  const queryClient = useQueryClient();

  const { data: report, isLoading: isLoadingReport } = useQuery({
    queryKey: ["regieReport", reportId || `new-${siteId}-${weekNumber}-${year}`],
    queryFn: () => getOrCreateRegieReportForWeek(siteId, weekNumber, year),
  });

  const { data: site, isLoading: isLoadingSite } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => getSiteById(siteId),
    enabled: !!siteId,
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
    const dateForWeek = setWeek(setYear(new Date(), year), weekNumber, { weekStartsOn: 1 });
    const start = startOfWeek(dateForWeek, { weekStartsOn: 1 });
    return Array.from({ length: 5 }).map((_, i) => addDays(start, i));
  }, [weekNumber, year]);

  const materialsValues = form.watch("materials");
  const totalAmount = useMemo(() => {
    if (!materialsValues) return 0;
    return materialsValues.reduce((sum, item) => {
      const quantity = item.quantity || 0;
      const price = item.unit_price || 0;
      return sum + (quantity * price);
    }, 0);
  }, [materialsValues]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const handlePdfExport = () => {
    const doc = new jsPDF();
    const formValues = form.getValues();
    const pageHeight = doc.internal.pageSize.height;
    let startY = 20;

    doc.setFontSize(18);
    doc.text("Regiebericht", 14, startY);
    startY += 10;

    doc.setFontSize(10);
    doc.text(`Bauvorhaben: ${site!.name}, ${site!.address}`, 14, startY);
    startY += 5;
    doc.text(`KW: ${report!.week_number} / ${report!.year}`, 14, startY);
    startY += 5;
    doc.text(`Datum: ${format(weekDays[0], 'dd.MM.yyyy')} - ${format(weekDays[4], 'dd.MM.yyyy')}`, 14, startY);
    startY += 10;

    if (formValues.employee_hours && formValues.employee_hours.length > 0) {
      doc.setFontSize(12);
      doc.text("Mitarbeiterstunden", 14, startY);
      startY += 6;
      autoTable(doc, {
        startY,
        head: [['Name', 'Mo', 'Di', 'Mi', 'Do', 'Fr']],
        body: formValues.employee_hours.map(emp => [
          employeeMap.get(emp.employee_id) || 'Unbekannt',
          emp.hours.mon ?? '', emp.hours.tue ?? '', emp.hours.wed ?? '', emp.hours.thu ?? '', emp.hours.fri ?? '',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [230, 230, 230], textColor: 20 },
      });
      startY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (formValues.work_descriptions && formValues.work_descriptions.length > 0) {
      if (startY > pageHeight - 40) { doc.addPage(); startY = 20; }
      doc.setFontSize(12);
      doc.text("Ausgeführte Arbeiten", 14, startY);
      startY += 6;
      autoTable(doc, {
        startY,
        head: [['Beschreibung']],
        body: formValues.work_descriptions.map(work => [work.description]),
        theme: 'grid',
        headStyles: { fillColor: [230, 230, 230], textColor: 20 },
      });
      startY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (formValues.materials && formValues.materials.length > 0) {
      if (startY > pageHeight - 60) { doc.addPage(); startY = 20; }
      doc.setFontSize(12);
      doc.text("Benötigte(s) Material / Maschinen / Stunden", 14, startY);
      startY += 6;
      autoTable(doc, {
        startY,
        head: [['Anzahl', 'Einheit', 'Material/Maschine', 'EP', 'Gesamt']],
        body: formValues.materials.map(mat => [
          mat.quantity ?? '', mat.unit, mat.description,
          mat.unit_price ? formatCurrency(mat.unit_price) : '',
          formatCurrency((mat.quantity || 0) * (mat.unit_price || 0)),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [230, 230, 230], textColor: 20 },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      });
      startY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (startY > pageHeight - 20) { doc.addPage(); startY = 20; }
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Betrag Netto gesamt: ${formatCurrency(totalAmount)}`, 14, startY);

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Seite ${i} von ${pageCount}`, 
        doc.internal.pageSize.getWidth() / 2, 
        doc.internal.pageSize.getHeight() - 10, 
        { align: 'center' }
      );
    }

    doc.save(`Regiebericht_KW${report!.week_number}_${site!.name.replace(/\s/g, '_')}.pdf`);
  };

  const isLoading = isLoadingReport || isLoadingSite;

  if (isLoading) return <div>Lade Daten...</div>;
  if (!report || !site) return <div>Fehler beim Laden der Daten.</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div>
          <div className="grid grid-cols-3 gap-4 text-sm mb-6">
            <div><span className="font-semibold">Bauvorhaben:</span> {site.name}, {site.address}</div>
            <div><span className="font-semibold">KW:</span> {report.week_number}</div>
            <div><span className="font-semibold">Datum:</span> {format(weekDays[0], 'dd.MM.yyyy')} - {format(weekDays[4], 'dd.MM.yyyy')}</div>
          </div>

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
                      {[ 'mon', 'tue', 'wed', 'thu', 'fri' ].map(day => (
                        <TableCell key={day}>
                          <Input type="number" step="0.25" {...form.register(`employee_hours.${index}.hours.${day as 'mon'}`)} />
                        </TableCell>
                      ))}
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

          <Card className="mt-6">
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

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Benötigte(s) Material / Maschinen / Stunden</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Anzahl</TableHead>
                    <TableHead className="w-[100px]">Einheit</TableHead>
                    <TableHead>Material/Maschine</TableHead>
                    <TableHead className="w-[120px]">EP in €</TableHead>
                    <TableHead className="w-[120px] text-right">Gesamt in €</TableHead>
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
                      <TableCell className="text-right">{formatCurrency((form.watch(`materials.${index}.quantity`) || 0) * (form.watch(`materials.${index}.unit_price`) || 0))}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeMaterial(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendMaterial({ id: uuidv4(), quantity: null, unit: '', description: '', unit_price: null })}><PlusCircle className="mr-2 h-4 w-4" /> Material hinzufügen</Button>
            </CardContent>
            <CardFooter className="flex justify-end font-bold text-lg">
              <div>Betrag Netto gesamt: {formatCurrency(totalAmount)}</div>
            </CardFooter>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handlePdfExport}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF Export
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Speichern..." : "Bericht speichern"}</Button>
        </div>
      </form>
    </Form>
  );
};