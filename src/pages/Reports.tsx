"use client";

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
import { subDays, format, getDay, eachDayOfInterval, isSameDay } from "date-fns";
import { de } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import WeeklyEmployeeReport from "@/components/WeeklyEmployeeReport";
import ProjectCostReport from "@/components/ProjectCostReport";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const typeAbbreviations: Record<string, string> = {
  "Arbeit": "",
  "Krank": "K",
  "Urlaub": "U",
  "Unbezahlter Urlaub": "UU",
  "Krank Unfall": "KU",
  "Krank Krankenkasse": "KK",
  "Feiertag": "F",
  "Fehlt entschuldigt": "FE",
  "Fehlt unentschuldigt": "FU",
  "Freier Tag": "FTG",
  "Schlechtwetter": "SW",
  "Kurzarbeitergeld": "KG"
};

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
    
    const employeeStats = employees.reduce((acc, emp) => {
      acc[emp.id] = {
        name: `${emp.last_name}, ${emp.first_name}`,
        Arbeit: 0,
        Urlaub: 0,
        Krank: 0,
        Schlechtwetter: 0,
        Gesamt: 0
      };
      return acc;
    }, {} as Record<string, any>);

    filteredTimeEntries.forEach(entry => {
      const empId = entry.employee_id;
      if (employeeStats[empId]) {
        const type = entry.entry_type as keyof typeof employeeStats[string];
        if (type in employeeStats[empId]) {
          employeeStats[empId][type] += entry.hours_worked;
        }
        employeeStats[empId].Gesamt += entry.hours_worked;
      }
    });

    return Object.values(employeeStats).sort((a: any, b: any) => b.Gesamt - a.Gesamt);
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
    const isLandscape = activeTab === "weekly_employee_report" || activeTab === "project_cost";
    const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const dateStr = dateRange?.from ? `${format(dateRange.from, 'dd.MM.yyyy')} - ${dateRange.to ? format(dateRange.to, 'dd.MM.yyyy') : 'Heute'}` : '';
    const formatHours = (h: number) => h > 0 ? h.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
    const formatCurrency = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

    doc.setFontSize(18);
    doc.text("Bericht - Ludwig Mayer Bau GmbH", 14, 20);
    doc.setFontSize(10);
    doc.text(`Zeitraum: ${dateStr}`, 14, 28);
    doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm')}`, 14, 33);

    let startY = 45;

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
      startY += 8;
      
      const interval = { start: dateRange!.from!, end: dateRange!.to || new Date() };
      const daysInRange = eachDayOfInterval(interval).filter(d => getDay(d) !== 0);
      
      const reportData = filteredTimeEntries.reduce((acc, entry) => {
        const employee = employees?.find(e => e.id === entry.employee_id);
        const empName = employee ? `${employee.last_name}, ${employee.first_name}` : 'Unbekannt';
        const key = entry.employee_id;
        
        if (!acc[key]) {
          acc[key] = {
            name: empName,
            days: Array.from({ length: daysInRange.length }, () => ({ hours: 0, type: 'Arbeit' })),
            total: 0
          };
        }
        
        const dayIdx = daysInRange.findIndex(d => isSameDay(d, new Date(entry.date)));
        if (dayIdx !== -1) {
          acc[key].days[dayIdx].hours += entry.hours_worked;
          if (entry.entry_type !== 'Arbeit') {
            acc[key].days[dayIdx].type = entry.entry_type;
          }
          acc[key].total += entry.hours_worked;
        }
        return acc;
      }, {} as Record<string, any>);

      const tableData = Object.values(reportData).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((row: any) => {
        const daysCount = row.days.filter((d: any) => d.hours > 0).length;
        return [
          row.name,
          ...row.days.map((d: any) => {
            if (d.hours === 0) return "";
            let val = formatHours(d.hours);
            const abbr = typeAbbreviations[d.type];
            if (abbr) val += ` ${abbr}`;
            return val;
          }),
          formatHours(row.total),
          daysCount
        ];
      });

      const dayHeaders = daysInRange.map(d => `${format(d, 'EE', { locale: de })}\n${format(d, 'dd.MM')}`);

      autoTable(doc, {
        startY: startY,
        head: [['Mitarbeiter', ...dayHeaders, 'Summe', 'Tage']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8, halign: 'center' },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' },
          [dayHeaders.length + 1]: { fontStyle: 'bold', halign: 'right' },
          [dayHeaders.length + 2]: { halign: 'right' }
        }
      });
    } else if (activeTab === "project_cost") {
      doc.setFontSize(14);
      doc.text("Projektauswertung (Kosten)", 14, startY);
      startY += 10;
      
      const interval = { start: dateRange!.from!, end: dateRange!.to || new Date() };
      // Mo-Sa einbeziehen
      const daysInRange = eachDayOfInterval(interval).filter(d => getDay(d) !== 0);
      const dayHeaders = daysInRange.map(d => `${format(d, 'EE', { locale: de })}\n${format(d, 'dd.MM')}`);

      const siteGroups = filteredTimeEntries
        .filter(e => e.site_id)
        .reduce((acc, entry) => {
          const siteId = entry.site_id!;
          const siteName = entry.sites?.name || 'Unbekannt';
          if (!acc[siteId]) acc[siteId] = { name: siteName, employees: {} };
          
          const employee = employees?.find(e => e.id === entry.employee_id);
          if (employee) {
            if (!acc[siteId].employees[employee.id]) {
              acc[siteId].employees[employee.id] = {
                name: `${employee.last_name}, ${employee.first_name}`,
                rate: entry.hourly_rate || employee.hourly_rate,
                days: daysInRange.map(() => ({ hours: 0, abbr: "" })),
                totalHours: 0,
                totalCost: 0
              };
            }
            const dayIdx = daysInRange.findIndex(d => isSameDay(d, new Date(entry.date)));
            if (dayIdx !== -1) {
              const empRec = acc[siteId].employees[employee.id];
              empRec.days[dayIdx].hours += entry.hours_worked;
              const abbr = typeAbbreviations[entry.entry_type];
              if (abbr) empRec.days[dayIdx].abbr = abbr;
              
              // NUR 'Arbeit' fließt in die Summen und Kosten ein
              if (entry.entry_type === 'Arbeit') {
                empRec.totalHours += entry.hours_worked;
                empRec.totalCost += (entry.hours_worked * empRec.rate);
              }
            }
          }
          return acc;
        }, {} as Record<string, any>);

      Object.values(siteGroups).forEach((site: any) => {
        if (startY > doc.internal.pageSize.height - 50) { doc.addPage(); startY = 20; }
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Bauv. : ${site.name}`, 14, startY);
        startY += 6;

        const tableBody = Object.values(site.employees).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((emp: any) => [
          emp.name,
          ...emp.days.map((d: any) => {
            let val = formatHours(d.hours);
            if (d.abbr) val += ` ${d.abbr}`;
            return val;
          }),
          formatHours(emp.totalHours),
          formatCurrency(emp.rate),
          formatCurrency(emp.totalCost)
        ]);

        const totalHours = Object.values(site.employees).reduce((sum: number, emp: any) => sum + emp.totalHours, 0) as number;
        const totalCost = Object.values(site.employees).reduce((sum: number, emp: any) => sum + emp.totalCost, 0) as number;

        autoTable(doc, {
          startY: startY,
          head: [['Arbeitnehmer', ...dayHeaders, 'Summe', '/Std.', 'Gesamt']],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 8, halign: 'center' },
          styles: { fontSize: 8 },
          foot: [['', ...daysInRange.map(() => ''), 'Std. / Kosten :', formatHours(totalHours), '', formatCurrency(totalCost)]],
          footStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
          columnStyles: {
            0: { halign: 'left' },
            [dayHeaders.length + 1]: { fontStyle: 'bold', halign: 'right' },
            [dayHeaders.length + 2]: { halign: 'right' },
            [dayHeaders.length + 3]: { fontStyle: 'bold', halign: 'right' }
          }
        });

        startY = (doc as any).lastAutoTable.finalY + 12;
      });
    }

    // Add page numbers
    const pageCount = doc.getNumberOfPages();
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
              <CardDescription>Detaillierte Aufschlüsselung der erfassten Stunden pro Mitarbeiter im ausgewählten Zeitraum.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hoursPerEmployee} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                    <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }} />
                    <Legend />
                    <Bar dataKey="Arbeit" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Urlaub" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Krank" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Schlechtwetter" stackId="a" fill="#3b82f6" opacity={0.5} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mitarbeiter</TableHead>
                    <TableHead className="text-right">Arbeit</TableHead>
                    <TableHead className="text-right">Urlaub</TableHead>
                    <TableHead className="text-right">Krank</TableHead>
                    <TableHead className="text-right">Schlechtwetter</TableHead>
                    <TableHead className="text-right font-bold">Gesamt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursPerEmployee.map((emp: any) => (
                    <TableRow key={emp.name}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="text-right">{emp.Arbeit.toFixed(2)} h</TableCell>
                      <TableCell className="text-right text-green-600">{emp.Urlaub.toFixed(2)} h</TableCell>
                      <TableCell className="text-right text-red-600">{emp.Krank.toFixed(2)} h</TableCell>
                      <TableCell className="text-right text-blue-600">{emp.Schlechtwetter.toFixed(2)} h</TableCell>
                      <TableCell className="text-right font-bold">{emp.Gesamt.toFixed(2)} h</TableCell>
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
