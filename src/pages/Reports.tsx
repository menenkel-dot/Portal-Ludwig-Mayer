import { useQuery } from "@tanstack/react-query";
import { getTimeEntries } from "@/services/timeTrackingService";
import { getEmployees } from "@/services/employeeService";
import { getCalculations } from "@/services/calculationService";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import WeeklyEmployeeReport from "@/components/WeeklyEmployeeReport";

const Reports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { data: timeEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: getTimeEntries,
  });
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });
  const { data: calculations, isLoading: isLoadingCalculations } = useQuery({
    queryKey: ["calculations"],
    queryFn: getCalculations,
  });

  const isLoading = isLoadingEntries || isLoadingEmployees || isLoadingCalculations;

  const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  const filteredTimeEntries = useMemo(() => {
    if (!timeEntries || !dateRange?.from) return [];
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : new Date();

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
      name: `${emp.first_name} ${emp.last_name}`,
      Stunden: parseFloat((employeeHours[emp.id] || 0).toFixed(2)),
    })).sort((a, b) => b.Stunden - a.Stunden);
  }, [filteredTimeEntries, employees]);

  const projectProfitability = useMemo(() => {
    if (!filteredTimeEntries || !employees || !calculations) return [];
    
    const workEntries = filteredTimeEntries.filter(entry => entry.entry_type === 'Arbeit');
    const activeSiteIds = new Set(workEntries.map(entry => entry.site_id));
    const relevantCalculations = calculations.filter(calc => activeSiteIds.has(calc.site_id));
    
    const employeeRateMap = new Map(employees.map(e => [e.id, e.hourly_rate]));
    const actualCosts = workEntries.reduce((acc, entry) => {
      const rate = employeeRateMap.get(entry.employee_id) || 0;
      if (entry.site_id) {
        if (!acc[entry.site_id]) acc[entry.site_id] = 0;
        acc[entry.site_id] += entry.hours_worked * rate;
      }
      return acc;
    }, {} as Record<string, number>);

    return relevantCalculations.map(calc => {
      const target = calc.total_amount;
      const actual = actualCosts[calc.site_id] || 0;
      const difference = target - actual;
      return {
        name: calc.name,
        siteName: calc.sites?.name || 'N/A',
        target,
        actual,
        difference,
      };
    }).sort((a, b) => b.target - a.target);
  }, [filteredTimeEntries, employees, calculations]);

  if (isLoading) return <div>Lade Reports...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>
      <Tabs defaultValue="profitability">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profitability">Wirtschaftlichkeit</TabsTrigger>
          <TabsTrigger value="site_hours">Stunden/Baustelle</TabsTrigger>
          <TabsTrigger value="employee_hours">Mitarbeiter-Auslastung</TabsTrigger>
          <TabsTrigger value="weekly_employee_report">Mitarbeiter Gesamt</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Projekt-Wirtschaftlichkeit (Soll-Ist-Vergleich)</CardTitle>
              <CardDescription>Vergleich der kalkulierten Kosten mit den tatsächlich erfassten Lohnkosten im ausgewählten Zeitraum.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projekt</TableHead>
                    <TableHead>Soll (Kalkulation)</TableHead>
                    <TableHead>Ist (Lohnkosten)</TableHead>
                    <TableHead>Differenz</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectProfitability.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{p.name}<p className="text-sm text-muted-foreground">{p.siteName}</p></TableCell>
                      <TableCell>{formatCurrency(p.target)}</TableCell>
                      <TableCell>{formatCurrency(p.actual)}</TableCell>
                      <TableCell>
                        <Badge variant={p.difference >= 0 ? "default" : "destructive"}>
                          {formatCurrency(p.difference)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
      </Tabs>
    </div>
  );
};

export default Reports;