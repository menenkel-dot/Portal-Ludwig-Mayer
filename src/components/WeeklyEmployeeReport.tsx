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
import { cn } from "@/lib/utils";

interface WeeklyEmployeeReportProps {
  timeEntries: TimeEntry[];
  employees: Employee[];
}

const WeeklyEmployeeReport = ({
  timeEntries,
  employees,
}: WeeklyEmployeeReportProps) => {
  const [currentDate, setCurrentDate] = useState(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));

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

    const dataByEmployee = entriesInWeek.reduce((acc, entry) => {
      const empId = entry.employee_id;

      if (!acc[empId]) {
        const employee = employees.find((e) => e.id === empId);
        acc[empId] = {
          employeeName: employee
            ? `${employee.last_name}, ${employee.first_name}`
            : "Unbekannt",
          days: Array.from({ length: 7 }, () => ({ hours: 0, type: "Arbeit" as TimeEntry["entry_type"] })),
        };
      }

      const dayIndex = (getDay(new Date(entry.date)) + 6) % 7; // Monday is 0
      
      // We prioritize Krank/Urlaub over Arbeit for the display if multiple entries exist
      const currentDay = acc[empId].days[dayIndex];
      const newHours = currentDay.hours + entry.hours_worked;
      const newType = (entry.entry_type !== "Arbeit") ? entry.entry_type : currentDay.type;

      acc[empId].days[dayIndex] = {
        hours: newHours,
        type: newType
      };

      return acc;
    }, {} as Record<string, any>);

    return Object.values(dataByEmployee)
      .map((empData: any) => {
        const totalHours = empData.days.reduce(
          (sum: number, day: any) => sum + day.hours,
          0
        );
        const totalDays = empData.days.filter(
          (day: any) => day.hours > 0
        ).length;
        return {
          ...empData,
          totalHours,
          totalDays,
        };
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [timeEntries, employees, weekInterval]);

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
              <TableHead className="w-[250px]">Mitarbeiter</TableHead>
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
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">
                      {rowData.employeeName}
                    </TableCell>
                    {rowData.days.map((day: any, dayIndex: number) => (
                      <TableCell key={dayIndex} className={cn(
                        "text-center",
                        day.type === 'Krank' && day.hours > 0 && "text-red-600 font-medium",
                        day.type === 'Urlaub' && day.hours > 0 && "text-green-600 font-medium",
                        day.type === 'Schlechtwetter' && day.hours > 0 && "text-blue-600 font-medium"
                      )}>
                        {day.hours > 0 ? (
                          <>
                            {day.hours.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                            {day.type === 'Krank' && " K"}
                            {day.type === 'Urlaub' && " U"}
                            {day.type === 'Schlechtwetter' && " SW"}
                            {day.type === 'Feiertag' && " F"}
                            {day.type === 'Unbezahlter Urlaub' && " UU"}
                            {day.type === 'Krank Unfall' && " KU"}
                            {day.type === 'Krank Krankenkasse' && " KK"}
                            {day.type === 'Fehlt entschuldigt' && " FE"}
                            {day.type === 'Fehlt unentschuldigt' && " FU"}
                            {day.type === 'Freier Tag' && " FTG"}
                            {day.type === 'Kurzarbeitergeld' && " KG"}
                          </>
                        ) : ""}
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