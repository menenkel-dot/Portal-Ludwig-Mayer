import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSites } from "@/services/siteService";
import { getEmployees } from "@/services/employeeService";
import { getTimeEntriesForSiteAndWeek, saveWeeklyTimeEntries } from "@/services/timeTrackingService";
import { Site, Employee, TimeEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { startOfWeek, addWeeks, subWeeks, format, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

// Define a type for the internal state structure to hold hours and associated IDs
type EmployeeDayHours = Record<string, { hours: string, existingIds: string[] }>;
type HoursState = Record<string, EmployeeDayHours>; // { [employeeId]: { [dateStr]: { hours, existingIds } } }

export const WeeklyTimeSheet = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [hoursState, setHoursState] = useState<HoursState>({});
  const [open, setOpen] = useState(false);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = addWeeks(start, 1);
    return eachDayOfInterval({ start, end }).slice(0, 6); // Mo-Sa
  }, [currentDate]);

  const { data: sites, isLoading: isLoadingSites } = useQuery({ queryKey: ["sites"], queryFn: getSites });
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const { data: timeEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["weeklyTimeEntries", selectedSiteId, format(weekStart, "yyyy-MM-dd")],
    queryFn: () => getTimeEntriesForSiteAndWeek(selectedSiteId!, weekStart),
    enabled: !!selectedSiteId,
  });

  // Filter sites to only show those "In Arbeit"
  const activeSites = useMemo(() => {
    return sites?.filter(site => site.status === 'In Arbeit') || [];
  }, [sites]);

  useEffect(() => {
    if (timeEntries) {
      const newHoursState: HoursState = {};
      
      selectedEmployeeIds.forEach(empId => {
        newHoursState[empId] = {};
        weekDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          
          // Aggregate all entries for this employee, day, and selected site
          const entriesForDay = timeEntries.filter(e => 
            e.employee_id === empId && 
            e.date.startsWith(dateStr) && 
            e.site_id === selectedSiteId
          );
          
          const totalHours = entriesForDay.reduce((sum, entry) => sum + entry.hours_worked, 0);
          const existingIds = entriesForDay.map(e => e.id);

          newHoursState[empId][dateStr] = {
            hours: totalHours > 0 ? String(totalHours) : '',
            existingIds: existingIds,
          };
        });
      });
      setHoursState(newHoursState);
    }
  }, [timeEntries, selectedEmployeeIds, weekDays, selectedSiteId]);

  const saveMutation = useMutation({
    mutationFn: saveWeeklyTimeEntries,
    onError: (error: Error) => showError(error.message),
  });

  const handleHourChange = (employeeId: string, date: string, value: string) => {
    setHoursState(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [date]: {
          ...prev[employeeId]?.[date],
          hours: value,
          // existingIds remain unchanged until save/refetch
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedSiteId || !employees) return;

    const entriesToSave: { employee_id: string, site_id: string, date: string, hours_worked: number, hourly_rate: number, existing_ids: string[] }[] = [];

    Object.entries(hoursState).forEach(([employeeId, dayEntries]) => {
      const employee = employees.find(e => e.id === employeeId);
      const currentRate = employee?.hourly_rate || 0;

      Object.entries(dayEntries).forEach(([date, { hours: hourString, existingIds }]) => {
        const hourValue = parseFloat(hourString.replace(',', '.') || '0');
        
        // We only need to save/delete if the hours changed OR if there are existing entries to clear.
        if (hourValue > 0 || existingIds.length > 0) {
            entriesToSave.push({
                employee_id: employeeId,
                site_id: selectedSiteId,
                date: date,
                hours_worked: hourValue,
                hourly_rate: currentRate, // Hier fixieren wir den Lohn
                existing_ids: existingIds,
            });
        }
      });
    });

    try {
      await saveMutation.mutateAsync(entriesToSave);
      showSuccess("Zeiten erfolgreich gespeichert.");
      queryClient.invalidateQueries({ queryKey: ["weeklyTimeEntries", selectedSiteId, format(weekStart, "yyyy-MM-dd")] });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    } catch (e) {
      // Error is already shown by mutation's onError
    }
  };

  const employeeMap = useMemo(() => new Map(employees?.map(e => [e.id, e])), [employees]);
  const weekTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(hoursState).forEach(([employeeId, dayHours]) => {
      totals[employeeId] = Object.values(dayHours).reduce((sum, { hours: h }) => sum + (parseFloat(h.replace(',', '.') || '0')), 0);
    });
    return totals;
  }, [hoursState]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wochenerfassung</CardTitle>
        <CardDescription>Erfassen Sie die Arbeitszeiten für eine Baustelle und mehrere Mitarbeiter auf Wochenbasis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Select onValueChange={setSelectedSiteId} value={selectedSiteId || ""}>
            <SelectTrigger className="md:w-[300px]">
              <SelectValue placeholder="1. Baustelle auswählen" />
            </SelectTrigger>
            <SelectContent>
              {activeSites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="md:w-[300px] justify-between" disabled={!selectedSiteId}>
                <UserPlus className="mr-2 h-4 w-4" />
                {selectedEmployeeIds.length > 0 ? `${selectedEmployeeIds.length} Mitarbeiter ausgewählt` : "2. Mitarbeiter hinzufügen"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Mitarbeiter suchen..." />
                <CommandList>
                  <CommandEmpty>Keine Mitarbeiter gefunden.</CommandEmpty>
                  <CommandGroup>
                    {employees?.map(employee => (
                      <CommandItem
                        key={employee.id}
                        onSelect={() => {
                          setSelectedEmployeeIds(prev =>
                            prev.includes(employee.id)
                              ? prev.filter(id => id !== employee.id)
                              : [...prev, employee.id]
                          );
                          setOpen(true);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedEmployeeIds.includes(employee.id) ? "opacity-100" : "opacity-0")} />
                        {employee.last_name}, {employee.first_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 md:ml-auto">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subWeeks(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-center w-32">{format(weekStart, "dd.MM")} - {format(addWeeks(weekStart, 1), "dd.MM.yy")}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {selectedSiteId && selectedEmployeeIds.length > 0 ? (
          <>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-white dark:bg-gray-800">Mitarbeiter</TableHead>
                    {weekDays.map(day => (
                      <TableHead key={day.toISOString()} className="text-center min-w-[100px]">
                        {format(day, "E", { locale: de })} <span className="text-muted-foreground">{format(day, "dd.MM")}</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right min-w-[80px]">Summe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEntries ? (
                    <TableRow><TableCell colSpan={8} className="text-center h-24">Lade Zeiten...</TableCell></TableRow>
                  ) : (
                    selectedEmployeeIds.map(empId => {
                      const employee = employeeMap.get(empId);
                      if (!employee) return null;
                      return (
                        <TableRow key={empId}>
                          <TableCell className="font-medium sticky left-0 bg-white dark:bg-gray-800">{employee.last_name}, {employee.first_name}</TableCell>
                          {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            return (
                              <TableCell key={dateStr}>
                                <Input
                                  type="number"
                                  step="0.25"
                                  className="text-center"
                                  value={hoursState[empId]?.[dateStr]?.hours || ''}
                                  onChange={e => handleHourChange(empId, dateStr, e.target.value)}
                                />
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-bold">{weekTotals[empId]?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Speichern..." : "Woche speichern"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            {isLoadingSites || isLoadingEmployees ? "Lade Daten..." : "Bitte wählen Sie eine Baustelle aus und fügen Sie Mitarbeiter hinzu."}
          </div>
        )}
      </CardContent>
    </Card>
  );
};