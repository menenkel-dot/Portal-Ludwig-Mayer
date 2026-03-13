import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSites } from "@/services/siteService";
import { getEmployees } from "@/services/employeeService";
import { getTimeEntriesForEmployeesAndWeek, saveWeeklyTimeEntries } from "@/services/timeTrackingService";
import { Site, Employee, TimeEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown, UserPlus, MoreVertical } from "lucide-react";
import { startOfWeek, addWeeks, subWeeks, format, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

type EmployeeDayHours = { 
  hours: string, 
  existingIds: string[], 
  type: TimeEntry['entry_type'],
  siteId: string | null 
};
type HoursState = Record<string, Record<string, EmployeeDayHours>>;

const timeEntryTypes = [
  { value: "Arbeit", label: "Arbeit" },
  { value: "Krank", label: "Krank (K)" },
  { value: "Urlaub", label: "Urlaub (U)" },
  { value: "Unbezahlter Urlaub", label: "Unbezahlter Urlaub (UU)" },
  { value: "Krank Unfall", label: "Krank Unfall (KU)" },
  { value: "Krank Krankenkasse", label: "Krank Krankenkasse (KK)" },
  { value: "Feiertag", label: "Feiertag (F)" },
  { value: "Fehlt entschuldigt", label: "Fehlt entschuldigt (FE)" },
  { value: "Fehlt unentschuldigt", label: "Fehlt unentschuldigt (FU)" },
  { value: "Freier Tag", label: "Freier Tag (FTG)" },
  { value: "Schlechtwetter", label: "Schlechtwetter (SW)" },
  { value: "Kurzarbeitergeld", label: "Kurzarbeitergeld (KG)" }
];

export const WeeklyTimeSheet = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [hoursState, setHoursState] = useState<HoursState>({});
  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = addWeeks(start, 1);
    const interval = eachDayOfInterval({ start, end });
    return interval.slice(0, 6); // Mo-Sa
  }, [currentDate]);

  const { data: sites, isLoading: isLoadingSites } = useQuery({ queryKey: ["sites"], queryFn: getSites });
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  
  const { data: timeEntries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["weeklyTimeEntries", selectedEmployeeIds, format(weekStart, "yyyy-MM-dd")],
    queryFn: () => getTimeEntriesForEmployeesAndWeek(selectedEmployeeIds, weekStart),
    enabled: selectedEmployeeIds.length > 0,
  });

  const activeSites = useMemo(() => sites?.filter(site => site.status === 'In Arbeit') || [], [sites]);

  useEffect(() => {
    if (timeEntries) {
      const newHoursState: HoursState = {};
      selectedEmployeeIds.forEach(empId => {
        newHoursState[empId] = {};
        weekDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const entriesForDay = timeEntries.filter(e => e.employee_id === empId && e.date.startsWith(dateStr));
          
          const siteEntry = entriesForDay.find(e => e.site_id === selectedSiteId && e.entry_type === 'Arbeit');
          const specialEntry = entriesForDay.find(e => e.entry_type !== 'Arbeit');
          
          if (specialEntry) {
            newHoursState[empId][dateStr] = {
              hours: String(specialEntry.hours_worked),
              existingIds: entriesForDay.map(e => e.id),
              type: specialEntry.entry_type,
              siteId: specialEntry.site_id || null
            };
          } else if (siteEntry) {
            newHoursState[empId][dateStr] = {
              hours: String(siteEntry.hours_worked),
              existingIds: entriesForDay.map(e => e.id),
              type: 'Arbeit',
              siteId: selectedSiteId
            };
          } else {
            newHoursState[empId][dateStr] = {
              hours: '',
              existingIds: entriesForDay.map(e => e.id),
              type: 'Arbeit',
              siteId: selectedSiteId === "absences" ? null : selectedSiteId
            };
          }
        });
      });
      setHoursState(newHoursState);
    }
  }, [timeEntries, selectedEmployeeIds, weekDays, selectedSiteId]);

  const saveMutation = useMutation({
    mutationFn: saveWeeklyTimeEntries,
    onSuccess: () => {
      showSuccess("Zeiten erfolgreich gespeichert.");
      queryClient.invalidateQueries({ queryKey: ["weeklyTimeEntries"] });
      queryClient.invalidateQueries({ queryKey: ["timeEntries"] });
    },
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
        },
      },
    }));
  };

  const handleTypeChange = (employeeId: string, date: string, type: string) => {
    setHoursState(prev => {
      const current = prev[employeeId]?.[date];
      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: {
            ...current,
            type: type as TimeEntry['entry_type'],
            hours: type !== 'Arbeit' ? (current?.hours && parseFloat(current.hours) > 0 ? current.hours : '9') : current?.hours || '',
          },
        },
      };
    });
  };

  const toggleWeekType = (employeeId: string, type: TimeEntry['entry_type']) => {
    setHoursState(prev => {
      const newEmployeeState = { ...prev[employeeId] };
      weekDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const current = newEmployeeState[dateStr];
        const isAlreadyType = current?.type === type;
        newEmployeeState[dateStr] = {
          ...current,
          type: isAlreadyType ? 'Arbeit' : type,
          hours: isAlreadyType ? '' : '9',
        };
      });
      return { ...prev, [employeeId]: newEmployeeState };
    });
  };

  const handleSave = async () => {
    if (!selectedSiteId || !employees) return;
    const entriesToSave: any[] = [];

    Object.entries(hoursState).forEach(([employeeId, dayEntries]) => {
      const employee = employees.find(e => e.id === employeeId);
      const currentRate = employee?.hourly_rate || 0;

      Object.entries(dayEntries).forEach(([date, { hours, existingIds, type, siteId }]) => {
        const hourValue = parseFloat(hours.replace(',', '.') || '0');
        if (hourValue > 0 || existingIds.length > 0) {
          entriesToSave.push({
            employee_id: employeeId,
            site_id: siteId,
            date,
            hours_worked: hourValue,
            hourly_rate: currentRate,
            entry_type: type,
            existing_ids: existingIds,
          });
        }
      });
    });

    saveMutation.mutate(entriesToSave);
  };

  const employeeMap = useMemo(() => new Map(employees?.map(e => [e.id, e])), [employees]);
  const weekTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(hoursState).forEach(([empId, days]) => {
      totals[empId] = Object.values(days).reduce((sum, d) => sum + (parseFloat(d.hours.replace(',', '.') || '0')), 0);
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
              <SelectItem value="absences" className="font-semibold text-blue-600">Abwesenheiten (Allgemein)</SelectItem>
              {activeSites.map(site => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Popover open={isEmployeePickerOpen} onOpenChange={setIsEmployeePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="md:w-[300px] justify-between" disabled={!selectedSiteId}>
                <UserPlus className="mr-2 h-4 w-4" />
                {selectedEmployeeIds.length > 0 ? `${selectedEmployeeIds.length} Mitarbeiter` : "2. Mitarbeiter hinzufügen"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Suchen..." />
                <CommandList>
                  <CommandEmpty>Keine Mitarbeiter.</CommandEmpty>
                  <CommandGroup>
                    {employees?.map(emp => (
                      <CommandItem
                        key={emp.id}
                        onSelect={() => {
                          setSelectedEmployeeIds(prev => prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedEmployeeIds.includes(emp.id) ? "opacity-100" : "opacity-0")} />
                        {emp.last_name}, {emp.first_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 md:ml-auto">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subWeeks(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium w-32 text-center">{format(weekStart, "dd.MM")} - {format(addWeeks(weekStart, 1), "dd.MM")}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {selectedSiteId && selectedEmployeeIds.length > 0 ? (
          <div className="space-y-4">
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-background z-10">Mitarbeiter</TableHead>
                    {weekDays.map(day => (
                      <TableHead key={day.toISOString()} className="text-center min-w-[120px]">
                        {format(day, "E", { locale: de })} <span className="text-muted-foreground">{format(day, "dd.MM")}</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Summe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEmployeeIds.map(empId => {
                    const emp = employeeMap.get(empId);
                    if (!emp) return null;
                    return (
                      <TableRow key={empId}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{emp.last_name}, {emp.first_name.charAt(0)}.</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuLabel>Woche füllen</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {timeEntryTypes.filter(t => t.value !== 'Arbeit').map(type => (
                                  <DropdownMenuItem key={type.value} onClick={() => toggleWeekType(empId, type.value as any)}>
                                    Ganze Woche {type.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                        {weekDays.map(day => {
                          const ds = format(day, 'yyyy-MM-dd');
                          const e = hoursState[empId]?.[ds];
                          const typeLabel = timeEntryTypes.find(t => t.value === e?.type)?.label.split(' (')[0] || e?.type;
                          return (
                            <TableCell key={ds} className={cn(e?.type !== 'Arbeit' && "bg-muted/30")}>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  <Input 
                                    className="h-8 text-center" 
                                    value={e?.hours || ''} 
                                    onChange={ev => handleHourChange(empId, ds, ev.target.value)} 
                                  />
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {timeEntryTypes.map(t => (
                                        <DropdownMenuItem key={t.value} onClick={() => handleTypeChange(empId, ds, t.value)}>
                                          {t.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                {e?.type !== 'Arbeit' && (
                                  <span className="text-[10px] text-center text-muted-foreground font-semibold truncate">
                                    {typeLabel}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-bold border-l">{weekTotals[empId]?.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Speichern..." : "Woche speichern"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            Baustelle wählen und Mitarbeiter hinzufügen.
          </div>
        )}
      </CardContent>
    </Card>
  );
};