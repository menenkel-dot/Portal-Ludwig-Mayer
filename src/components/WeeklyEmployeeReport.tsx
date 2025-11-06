import { useState, useMemo } from "react";
import { Employee, TimeEntry } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  getDay,
} from "date-fns";
import { de } from "date-fns/locale";

interface WeeklyEmployeeReportProps {
  timeEntries: TimeEntry[];
  employees: Employee[];
}

const WeeklyEmployeeReport = ({
  timeEntries,
  employees,
}: WeeklyEmployeeReportProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekInterval = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return { start, end };
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval(weekInterval);
  }, [weekInterval]);

  const weeklyReportData = useMemo(() => {
    if (!timeEntries || !employees) return [];

    const entriesInWeek = timeEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= weekInterval.start && entryDate <= weekInterval.end;
    });

    const dataByGroup = entriesInWeek.reduce((acc, entry) => {
      let groupingCriteria: string;
      if (entry.entry_type === "Arbeit") {
        groupingCriteria = entry.sites?.name || "Ohne Baustelle";
      } else {
        groupingCriteria = entry.entry_type;
      }

      const groupKey = `${entry.employee_id}-${groupingCriteria}`;

      if (!acc[groupKey]) {
        const employee = employees.find((e) => e.id === entry.employee_id);
        acc[groupKey] = {
          employeeName: employee
            ? `${employee.last_name}, ${employee.first_name}`
            : "Unbekannt",
          groupLabel: groupingCriteria,
          days: Array(7).fill(0),
        };
      }

      const dayIndex = (getDay(new Date(entry.date)) + 6) % 7; // Monday is 0
      acc[groupKey].days[dayIndex] += entry.hours_worked;

      return acc;
    }, {} as Record<string, any>);

    return Object.values(dataByGroup)
      .map((groupData) => {
        const totalHours = groupData.days.reduce(
          (sum: number, hours: number) => sum + hours,
          0
        );
        const totalDays = groupData.days.filter(
          (hours: number) => hours > 0
        ).length;
        return {
          ...groupData,
          totalHours,
          totalDays,
        };
      })
      .sort((a, b) => {
        if (a.employeeName < b.employeeName) return -1;
        if (a.employeeName > b.employeeName) return 1;
        if (a.groupLabel < b.groupLabel) return -1;
        if (a.groupLabel > b.groupLabel) return 1;
        return 0;
      });
  }, [timeEntries, employees, weekInterval]);

  let lastEmployeeName = "";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Wöchentliche Mitarbeiterübersicht</CardTitle>
            <CardDescription>
              Zeigt die erfassten Stunden pro Mitarbeiter und Tag für die
              ausgewählte Woche.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate((d) => subWeeks(d, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-center w-56">
              {format(weekInterval.start, "dd.MM.yyyy")} -{" "}
              {format(weekInterval.end, "dd.MM.yyyy")}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate((d) => addWeeks(d, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Mitarbeiter</TableHead>
              <TableHead className="w-[150px]">Projekt / Typ</TableHead>
              {weekDays.map((day) => (
                <TableHead key={day.toISOString()} className="text-center">
                  {format(day, "E", { locale: de })}
                  <br />
                  {format(day, "dd.MM")}
                </TableHead>
              ))}
              <TableHead className="text-right">Summe</TableHead>
              <TableHead className="text-right">Tage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {weeklyReportData.length > 0 ? (
              weeklyReportData.map((rowData, i) => {
                const showEmployeeName = rowData.employeeName !== lastEmployeeName;
                lastEmployeeName = rowData.employeeName;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {showEmployeeName ? rowData.employeeName : ""}
                    </TableCell>
                    <TableCell>{rowData.groupLabel}</TableCell>
                    {rowData.days.map((hours: number, dayIndex: number) => (
                      <TableCell key={dayIndex} className="text-center">
                        {hours > 0 ? hours.toLocaleString('de-DE', { minimumFractionDigits: 2 }) : ""}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">
                      {rowData.totalHours.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      {rowData.totalDays}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  Keine Daten für die ausgewählte Woche gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default WeeklyEmployeeReport;