import { useMemo } from "react";
import { Employee, TimeEntry } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface ProjectCostReportProps {
  timeEntries: TimeEntry[];
  employees: Employee[];
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

const ProjectCostReport = ({ timeEntries, employees }: ProjectCostReportProps) => {
  const reportData = useMemo(() => {
    if (!timeEntries || !employees) return [];

    const projects = timeEntries
      .filter(entry => entry.entry_type === 'Arbeit' && entry.site_id)
      .reduce((acc, entry) => {
        const siteId = entry.site_id!;
        const siteName = entry.sites?.name || 'Unbekanntes Projekt';

        if (!acc[siteId]) {
          acc[siteId] = {
            siteName,
            employees: {},
          };
        }

        const project = acc[siteId];
        const employeeName = entry.employees ? `${entry.employees.last_name}, ${entry.employees.first_name}` : "Unbekannt";
        
        // Wir gruppieren immer noch nach Mitarbeiter, nutzen aber den jeweiligen Snapshot-Lohn des Eintrags
        if (!project.employees[entry.employee_id]) {
          project.employees[entry.employee_id] = {
            name: employeeName,
            hours: 0,
            cost: 0,
          };
        }
        
        const hours = entry.hours_worked;
        const rate = entry.hourly_rate || 0; // Hier nutzen wir den Snapshot-Wert
        
        project.employees[entry.employee_id].hours += hours;
        project.employees[entry.employee_id].cost += (hours * rate);

        return acc;
      }, {} as Record<string, any>);

    return Object.values(projects).map(project => {
      const employeeDetails = Object.values(project.employees).sort((a: any, b: any) => a.name.localeCompare(b.name));

      const totalHours = employeeDetails.reduce((sum: number, emp: any) => sum + emp.hours, 0);
      const totalCost = employeeDetails.reduce((sum: number, emp: any) => sum + emp.cost, 0);

      return {
        siteName: project.siteName,
        employees: employeeDetails,
        totalHours,
        totalCost,
      };
    }).sort((a, b) => a.siteName.localeCompare(b.siteName));

  }, [timeEntries, employees]);

  if (reportData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projektauswertung</CardTitle>
          <CardDescription>
            Keine Arbeitszeiten für Projekte im ausgewählten Zeitraum gefunden.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {reportData.map((project, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>{project.siteName}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mitarbeiter</TableHead>
                  <TableHead className="text-right">Stunden</TableHead>
                  <TableHead className="text-right">Durchschn. Stundensatz</TableHead>
                  <TableHead className="text-right">Gesamtkosten</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.employees.map((emp: any, empIndex: number) => (
                  <TableRow key={empIndex}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="text-right">{emp.hours.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      {emp.hours > 0 ? formatCurrency(emp.cost / emp.hours) : formatCurrency(0)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(emp.cost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Gesamt</TableCell>
                  <TableCell className="text-right font-bold">{project.totalHours.toFixed(2)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(project.totalCost)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProjectCostReport;