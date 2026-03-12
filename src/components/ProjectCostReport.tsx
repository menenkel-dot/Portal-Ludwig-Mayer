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
} from "@/components/ui/card";
import { format, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ProjectCostReportProps {
  timeEntries: TimeEntry[];
  employees: Employee[];
}

// Mapping der Typen auf Kürzel
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

const formatCurrency = (amount: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

const ProjectCostReport = ({ timeEntries, employees }: ProjectCostReportProps) => {
  const reportData = useMemo(() => {
    if (!timeEntries || !employees || timeEntries.length === 0) return [];

    // Zeitraum ermitteln
    const dates = timeEntries.map(e => new Date(e.date));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Werktage (Mo-Sa) für den Tabellenkopf
    const weekDays = eachDayOfInterval({ start: minDate, end: maxDate }).filter(d => getDay(d) !== 0);

    const projects = timeEntries
      .reduce((acc, entry) => {
        // Wir ignorieren Einträge ohne Baustelle
        if (!entry.site_id) return acc;
        
        const siteId = entry.site_id;
        const siteName = entry.sites?.name || 'Unbekanntes Projekt';

        if (!acc[siteId]) {
          acc[siteId] = {
            siteName,
            employees: {},
          };
        }

        const project = acc[siteId];
        const employee = employees.find(e => e.id === entry.employee_id);
        const employeeName = employee ? `${employee.last_name}, ${employee.first_name}` : "Unbekannt";
        
        if (!project.employees[entry.employee_id]) {
          project.employees[entry.employee_id] = {
            name: employeeName,
            days: weekDays.map(() => ({ hours: 0, abbreviations: new Set<string>() })),
            totalHours: 0,
            totalCost: 0,
          };
        }
        
        const empRecord = project.employees[entry.employee_id];
        const dayIdx = weekDays.findIndex(d => isSameDay(d, new Date(entry.date)));
        
        if (dayIdx !== -1) {
          // In der Tagesansicht zeigen wir die Stunden (auch wenn es Abwesenheit ist)
          empRecord.days[dayIdx].hours += entry.hours_worked;
          const abbr = typeAbbreviations[entry.entry_type];
          if (abbr) empRecord.days[dayIdx].abbreviations.add(abbr);
        }
        
        // NUR 'Arbeit' fließt in die Summen und Kosten ein
        if (entry.entry_type === 'Arbeit') {
          empRecord.totalHours += entry.hours_worked;
          empRecord.totalCost += (entry.hours_worked * (entry.hourly_rate || 0));
        }

        return acc;
      }, {} as Record<string, any>);

    return Object.values(projects).map(project => {
      const employeeDetails = Object.values(project.employees).sort((a: any, b: any) => a.name.localeCompare(b.name));
      const totalHours = employeeDetails.reduce((sum: number, emp: any) => sum + emp.totalHours, 0);
      const totalCost = employeeDetails.reduce((sum: number, emp: any) => sum + emp.totalCost, 0);

      return {
        siteName: project.siteName,
        employees: employeeDetails,
        totalHours,
        totalCost,
        weekDays,
      };
    }).sort((a, b) => a.siteName.localeCompare(b.siteName));

  }, [timeEntries, employees]);

  if (reportData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Projektauswertung</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Keine projektspezifischen Arbeitszeiten im ausgewählten Zeitraum gefunden.
          </p>
        </CardContent>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Mitarbeiter</TableHead>
                    {project.weekDays.map(day => (
                      <TableHead key={day.toISOString()} className="text-center min-w-[70px]">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">{format(day, "EEEEEE", { locale: de })}</span>
                        <br />
                        <span className="text-xs font-medium">{format(day, "dd.MM")}</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Summe (h)</TableHead>
                    <TableHead className="text-right">Gesamtkosten</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.employees.map((emp: any, empIndex: number) => (
                    <TableRow key={empIndex}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      {emp.days.map((day: any, dIdx: number) => {
                        const hasAbbr = day.abbreviations.size > 0;
                        return (
                          <TableCell key={dIdx} className={cn(
                            "text-center p-2",
                            hasAbbr && "bg-muted/30"
                          )}>
                            {day.hours > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-semibold">{day.hours.toLocaleString('de-DE', { minimumFractionDigits: 1 })}</span>
                                {hasAbbr && (
                                  <span className="text-[10px] font-bold text-blue-600">
                                    {Array.from(day.abbreviations).join(', ')}
                                  </span>
                                )}
                              </div>
                            ) : hasAbbr ? (
                               <span className="text-[10px] font-bold text-blue-600">
                                 {Array.from(day.abbreviations).join(', ')}
                               </span>
                            ) : ""}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium">{emp.totalHours.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(emp.totalCost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-bold">Baustelle Gesamt</TableCell>
                    {project.weekDays.map((_, i) => <TableCell key={i} />)}
                    <TableCell className="text-right font-bold">{project.totalHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(project.totalCost)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProjectCostReport;