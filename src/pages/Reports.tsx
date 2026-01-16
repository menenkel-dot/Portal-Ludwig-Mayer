import { useQuery } from "@tanstack/react-query";
import { getTimeEntries } from "@/services/timeTrackingService";
import { getEmployees } from "@/services/employeeService";
import { getSites } from "@/services/siteService";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import {
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Customized,
} from "recharts";
import { DateRange } from "react-day-picker";
import { subDays, format, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import WeeklyEmployeeReport from "@/components/WeeklyEmployeeReport";
import ProjectCostReport from "@/components/ProjectCostReport";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RenderThresholdLines = (props: any) => {
  const { data, xAxis, yAxis } = props;
  if (!data || !xAxis || !yAxis) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;
  const barWidth = xScale.bandwidth();

  return (
    <g>
      {data.map((entry: any, index: number) => {
        const thresholdValue = entry["80% Schwelle"];
        if (thresholdValue > 0) {
          const x = xScale(entry.name);
          const y = yScale(thresholdValue);
          return (
            <line
              key={`threshold-${index}`}
              x1={x}
              y1={y}
              x2={x + barWidth}
              y2={y}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          );
        }
        return null;
      })}
    </g>
  );
};

const Reports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("profitability");

  const { data: timeEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: getTimeEntries,
  });
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });
  const { data: sites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
  });

  const isLoading = isLoadingEntries || isLoadingEmployees || isLoadingSites;

  const filteredTimeEntries = useMemo(() => {
    if (!timeEntries || !dateRange?.from) return [];
    const from = dateRange.from;
    const to = dateRange.to ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999)) : new Date();

    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= from && entryDate <= to;
    });
  }, [timeEntries, dateRange]);

  const hoursPerSite = useMemo(() => {
    if (!filteredTimeEntries) return [];
    const siteHours = filteredTimeEntries
      .filter(entry => entry.entry_type === 'Arbeit')
      .reduce((acc, entry) => {
        const siteName = entry.sites?.name || "Ohne Zuordnung";
        if (!acc[siteName]) acc[siteName] = 0;
        acc[siteName] += entry.hours_worked;
        return acc;
      }, {} as Record<string, number>);
    return Object.entries(siteHours).map(([name, hours]) => ({ name, Stunden: parseFloat(hours.toFixed(2)) })).sort((a, b) => b.Stunden - a.Stunden);
  }, [filteredTimeEntries]);

  const hoursPerEmployee = useMemo(() => {
    if (!filteredTimeEntries || !employees) return [];
    const employeeHours = filteredTimeEntries.reduce((acc, entry) => {
      const empId = entry.employee_id;
      if (!acc[empId]) acc[empId] = 0;
      acc[empId] += entry.hours_worked;
      return acc;
    }, {} as Record<string, number>);
    return employees.map(emp => ({
      name: `${emp.last_name}, ${emp.first_name}`,
      Stunden: parseFloat((employeeHours[emp.id] || 0).toFixed(2)),
    })).sort((a, b) => b.Stunden - a.Stunden);
  }, [filteredTimeEntries, employees]);

  const projectHourComparison = useMemo(() => {
    if (!sites || !timeEntries) return [];

    const actualHoursBySite = timeEntries
      .filter(entry => entry.site_id && entry.entry_type === 'Arbeit')
      .reduce((acc, entry) => {
        if (!acc[entry.site_id!]) {
          acc[entry.site_id!] = 0;
        }
        acc[entry.site_id!] += entry.hours_worked;
        return acc;
      }, {} as Record<string, number>);

    return sites
      .filter(site => site.planned_hours > 0 || actualHoursBySite[site.id] > 0)
      .map(site => ({
        name: site.name,
        Soll: site.planned_hours,
        Ist: parseFloat((actualHoursBySite[site.id] || 0).toFixed(2)),
        "80% Schwelle": site.planned_hours * 0.8,
      }))
      .sort((a, b) => b.Soll - a.Soll);
  }, [sites, timeEntries]);

  const exportPDF = () => {
    const doc = new jsPDF();
    const dateStr = dateRange?.from ? `${format(dateRange.from, 'dd.MM.yyyy')} - ${dateRange.to ? format(dateRange.to, 'dd.MM.yyyy') : 'Heute'}` : '';
    const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    
    doc.setFontSize(18);
    doc.text("Bericht - Ludwig Mayer Bau GmbH", 14, 20);
    doc.setFontSize(10);
    doc.text(`Zeitraum: ${dateStr}`, 14, 28);
    doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 33);

    let startY = 40;

    if (activeTab === "profitability") {
      doc.setFontSize(14);
      doc.text("Soll-Ist Stundenvergleich", 14, startY);
      autoTable(doc, {
        startY: startY + 5,
        head: [['Baustelle', 'Soll (h)', 'Ist (h)', 'Differenz (h)']],
        body: projectHourComparison.map(p => [
          p.name, 
          p.Soll.toFixed(2), 
          p.Ist.toFixed(2), 
          (p.Soll - p.Ist).toFixed(2)
        ]),
        theme: 'striped'
      });
    } else if (activeTab === "site_hours") {
      doc.setFontSize(14);
      doc.text("Stunden pro Baustelle", 14, startY);
      autoTable(doc, {
        startY: startY + 5,
        head: [['Baustelle', 'Stunden (h)']],
        body: hoursPerSite.map(h => [h.name, h.Stunden.toFixed(2)]),
        theme: 'striped'
      });
    } else if (activeTab === "employee_hours") {
      doc.setFontSize(14);
      doc.text("Mitarbeiter-Auslastung", 14, startY);
      autoTable(doc, {
        startY: startY + 5,
        head: [['Mitarbeiter', 'Gesamtstunden (h)']],
        body: hoursPerEmployee.map(h => [h.name, h.Stunden.toFixed(2)]),
        theme: 'striped'
      });
    } else if (activeTab === "weekly_employee_report") {
      doc.setFontSize(14);
      doc.text("Mitarbeiter Gesamtübersicht", 14, startY);
      
      const reportData = filteredTimeEntries.reduce((acc, entry) => {
        const label = entry.entry_type === 'Arbeit' ? (entry.sites?.name || 'Ohne Baustelle') : entry.entry_type;
        const employee = employees?.find(e => e.id === entry.employee_id);
        const empName = employee ? `${employee.last_name}, ${employee.first_name}` : 'Unbekannt';
        const key = `${empName}-${label}`;
        
        if (!acc[key]) acc[key] = { name: empName, type: label, total: 0 };
        acc[key].total += entry.hours_worked;
        return acc;
      }, {} as Record<string, any>);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Mitarbeiter', 'Projekt / Typ', 'Summe (h)']],
        body: Object.values(reportData).map((d: any) => [d.name, d.type, d.total.toFixed(2)]),
        theme: 'striped'
      });
    } else if (activeTab === "project_cost") {
      doc.setFontSize(14);
      doc.text("Projektauswertung (Kosten)", 14, startY);
      
      const projects = filteredTimeEntries
        .filter(e => e.entry_type === 'Arbeit' && e.site_id)
        .reduce((acc, entry) => {
          const siteId = entry.site_id!;
          if (!acc[siteId]) acc[siteId] = { name: entry.sites?.name || 'Unbekannt', costs: 0, hours: 0 };
          
          const emp = employees?.find(e => e.id === entry.employee_id);
          if (emp) {
            acc[siteId].hours += entry.hours_worked;
            acc[siteId].costs += (entry.hours_worked * emp.hourly_rate);
          }
          return acc;
        }, {} as Record<string, any>);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Projekt', 'Gesamtstunden (h)', 'Gesamtkosten (€)']],
        body: Object.values(projects).map((p: any) => [p.name, p.hours.toFixed(2), formatCurrency(p.costs)]),
        theme: 'striped'
      });
    }

    doc.save(`Bericht_${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  if (isLoading) return <div>Lade Reports...</div>;

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          <Button variant="outline" onClick={exportPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF Export
          </Button>
        </div>
      </div>
      <Tabs defaultValue="profitability" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profitability">Soll-Ist Stunden</TabsTrigger>
          <TabsTrigger value="site_hours">Stunden/Baustelle</TabsTrigger>
          <TabsTrigger value="employee_hours">Mitarbeiter-Auslastung</TabsTrigger>
          <TabsTrigger value="weekly_employee_report">Mitarbeiter Gesamt</TabsTrigger>
          <TabsTrigger value="project_cost">Projektauswertung</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Soll-Ist-Vergleich der Stunden</CardTitle>
              <CardDescription>Vergleich der kalkulierten Soll-Stunden mit den tatsächlich erfassten Ist-Stunden pro Baustelle.</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={projectHourComparison} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                  <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }} />
                  <Legend />
                  <Bar dataKey="Soll" fill="#a1a1aa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ist" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Line dataKey="80% Schwelle" stroke="#ef4444" strokeDasharray="3 3" dot={false} strokeWidth={0} activeDot={false} />
                  <Customized component={RenderThresholdLines} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="site_hours" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Stunden pro Baustelle</CardTitle>
              <CardDescription>Übersicht der geleisteten Arbeitsstunden pro Baustelle im ausgewählten Zeitraum.</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursPerSite} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                  <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }} />
                  <Bar dataKey="Stunden" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee_hours" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Mitarbeiter-Auslastung</CardTitle>
              <CardDescription>Gesamtzahl der von jedem Mitarbeiter erfassten Stunden im ausgewählten Zeitraum.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead className="text-right">Gesamtstunden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursPerEmployee.map((emp) => (
                    <TableRow key={emp.name}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-right">{emp.Stunden.toFixed(2)} h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="weekly_employee_report" className="mt-6">
          {isLoading ? (
            <Card><CardHeader><CardTitle>Lade Report...</CardTitle></CardHeader></Card>
          ) : (
            <WeeklyEmployeeReport
              timeEntries={timeEntries || []}
              employees={employees || []}
            />
          )}
        </TabsContent>

        <TabsContent value="project_cost" className="mt-6">
          {isLoading ? (
            <Card><CardHeader><CardTitle>Lade Report...</CardTitle></CardHeader></Card>
          ) : (
            <ProjectCostReport
              timeEntries={filteredTimeEntries || []}
              employees={employees || []}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;