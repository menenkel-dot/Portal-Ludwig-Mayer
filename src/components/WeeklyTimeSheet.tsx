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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown, UserPlus, ThermometerSnowflake, Umbrella, Palmtree, Stethoscope } from "lucide-react";
import { startOfWeek, addWeeks, subWeeks, format, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// Define a type for the internal state structure to hold hours and associated IDs
type EmployeeDayHours = {
  hours: string,
  existingIds: string[],
  type: TimeEntry['entry_type'],
  siteId: string | null
};

const ABSENCE_TYPES: { type: TimeEntry['entry_type']; label: string; short: string; color: string }[] = [
  { type: 'Krank', label: 'Krank', short: 'K', color: 'text-red-600' },
  { type: 'Krank Unfall', label: 'Krank Unfall', short: 'KU', color: 'text-red-600' },
  { type: 'Krank Krankenkasse', label: 'Krank Krankenkasse', short: 'KK', color: 'text-red-600' },
  { type: 'Urlaub', label: 'Urlaub', short: 'U', color: 'text-green-600' },
  { type: 'Unbezahlter Urlaub', label: 'Unbezahlter Urlaub', short: 'UU', color: 'text-green-700' },
  { type: 'Schlechtwetter', label: 'Schlechtwetter', short: 'SW', color: 'text-blue-600' },
  { type: 'Feiertag', label: 'Feiertag', short: 'F', color: 'text-orange-600' },
  { type: 'Fehlt entschuldigt', label: 'Fehlt entschuldigt', short: 'FE', color: 'text-gray-600' },
  { type: 'Fehlt unentschuldigt', label: 'Fehlt unentschuldigt', short: 'FU', color: 'text-gray-900' },
  { type: 'Freier Tag', label: 'Freier Tag', short: 'FTG', color: 'text-cyan-600' },
  { type: 'Kurzarbeitergeld', label: 'Kurzarbeitergeld', short: 'KG', color: 'text-purple-600' },
];

type HoursState = Record<string, Record<string, EmployeeDayHours>>; // { [employeeId]: { [dateStr]: { hours, existingIds, type, siteId } } }

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
    queryKey: ["weeklyTimeEntries", selectedEmployeeIds, format(weekStart, "yyyy-MM-dd")],
    queryFn: () => getTimeEntriesForEmployeesAndWeek(selectedEmployeeIds, weekStart),
    enabled: selectedEmployeeIds.length > 0,
  });

  // Filter sites to only show those "In Arbeit"
  const activeSites = useMemo(() => {
    const filtered = sites?.filter(site => site.status === 'In Arbeit') || [];
    return filtered;
  }, [sites]);

  useEffect(() => {
    if (timeEntries) {
      const newHoursState: HoursState = {};
      
      selectedEmployeeIds.forEach(empId => {
        newHoursState[empId] = {};
        weekDays.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          
          // Find entries for this employee and day
          const entriesForDay = timeEntries.filter(e =>
            e.employee_id === empId &&
            e.date.startsWith(dateStr)
          );
          
          // If there are entries for other sites or types, we need to handle them.
          // For the weekly view, we primarily show/edit entries for the SELECTED site.
          // But we also want to show if they are 'Krank', 'Urlaub', etc.
          
          const siteEntry = entriesForDay.find(e => e.site_id === selectedSiteId && e.entry_type === 'Arbeit');
          const specialEntry = entriesForDay.find(e => e.entry_type !== 'Arbeit');
          
          if (specialEntry) {
            newHoursState[empId][dateStr] = {
              hours: String(specialEntry.hours_worked),
              existingIds: entriesForDay.map(e => e.id),
              type: specialEntry.entry_type,
              siteId: null
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
              siteId: selectedSiteId
            };
          }
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
          type: 'Arbeit',
          siteId: selectedSiteId === "absences" ? null : selectedSiteId
        },
      },
    }));
  };

  const toggleWeekType = (employeeId: string, type: TimeEntry['entry_type']) => {
    setHoursState(prev => {
      const current = prev[employeeId]?.[date];
      const isDefault = current?.type === 'Arbeit';
      
      return {
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [date]: {
            ...current,
            type: isDefault ? type : 'Arbeit',
            hours: isDefault ? '9' : '',
            siteId: isDefault ? selectedSiteId : null
          },
        },
      };
    });
  };

  const handleInputClick = (employeeId: string, date: string) => {
    setOpen(true);
    setSelectedEmployee(employeeId);
    setSelectedDate(date);
  };

  const handleDropdownChange = (type: TimeEntry['entry_type']) => {
    toggleWeekType(selectedEmployee, type);
    setOpen(false);
  };

  const absenceTypes = [
    { value: 'Feiertag', label: 'Feiertag (F)' },
    { value: 'Urlaub', label: 'Urlaub (U)' },
    { value: 'Unbezahlter Urlaub', label: 'Unbezahlter Urlaub (UU)' },
    { value: 'Krank Unfall', label: 'Krank Unfall (KU)' },
    { value: 'Krank Krankenkasse', label: 'Krank Krankenkasse (KK)' },
    { value: 'Fehlt entschuldigt', label: 'Fehlt entschuldigt (FE)' },
    { value: 'Fehlt unentschuldigt', label: 'Fehlt unentschuldigt (FU)' },
    { value: 'Freier Tag', label: 'Freier Tag (FTG)' },
    { value: 'Kurzarbeitergeld', label: 'Kurzarbeitergeld (KG)' }
  ];

  return (
    <div className="flex flex-col md:flex-row gap-2 md:ml-auto">
      <Input
        type=""number
        step="0.25"
        className="text-center h-8"
        value={entry.hours || ''}
        onChange={e => handleHourChange(empId, dateStr, e.target.value)}
        disabled={isUrlaub || isSchlechtwetter}
        onClick={e => handleInputClick(empId, dateStr)}
      />
      <Popover open={open} onOpenChange={setOpen}
        placement=""right
        className="w-[200px] p-0"
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:w-[300px] justify-between"
            disabled={!selectedSiteId}
          >
            <Input
              type="text"
              placeholder="Abwesenheit auswählen"
              className="px-2 py-1 border rounded"
              onChange={e => setSelectedType(e.target.value)}
              disabled
            />
            <ChevronsUpDown className="ml-2 h-4 w--4 shrink0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Abwesenheit suchen..." />
            <CommandList>
              <CommandEmpty>Keine Abwesenheiten gefunden.</CommandEmpty>
              <CommandGroup>
                {absenceTypes.map((type) => (
                  <CommandItem
                    key={type.value}
                    onSelect={() => handleDropdownChange(type.value)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedType === type.value ? "opacity-100" : "opacity-0")} />
                    {type.label}
                  </CommandItem>
                )
                }
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});number"
        step="0.25"
        className="text-center h-8"
        value={entry.hours || ''}
        onChange={e => handleHourChange(empId, dateStr, e.target.value)}
        disabled={isUrlaub || isSchlechtwetter}
        onClick={e => handleInputClick(empId, dateStr)}
      />
      <Popover open={open} onOpenChange={setOpen}
        placement="right"
        className="w-[200px] p-0"
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:w-[300px] justify-between"
            disabled={!selectedSiteId}
          >
            <Input
              type="text"
              placeholder="Abwesenheit auswählen"
              className="px-2 py-1 border rounded"
              onChange={e => setSelectedType(e.target.value)}
              disabled
            />
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Abwesenheit suchen..." />
            <CommandList>
              <CommandEmpty>Keine Abwesenheiten gefunden.</CommandEmpty>
              <CommandGroup>
                {absenceTypes.map((type) => (
                  <CommandItem
                    key={type.value}
                    onSelect={() => handleDropdownChange(type.value)}
                  >
                    <Check className={cn("mr-2 h-4 w-4", selectedType === type.value ? "opacity-100" : "opacity-0")} />
                    {type.label}
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
});
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
          siteId: isAlreadyType ? (selectedSiteId === "absences" ? null : selectedSiteId) : null
        };
      });

      return {
        ...prev,
        [employeeId]: newEmployeeState
      };
    });
  };

  const handleSave = async () => {
    if (!selectedSiteId || !employees) return;

    const entriesToSave: {
      employee_id: string,
      site_id: string | null,
      date: string,
      hours_worked: number,
      hourly_rate: number,
      entry_type: TimeEntry['entry_type'],
      existing_ids: string[]
    }[] = [];

    Object.entries(hoursState).forEach(([employeeId, dayEntries]) => {
      const employee = employees.find(e => e.id === employeeId);
      const currentRate = employee?.hourly_rate || 0;

      Object.entries(dayEntries).forEach(([date, { hours: hourString, existingIds, type, siteId }]) => {
        const hourValue = parseFloat(hourString.replace(',', '.') || '0');
        
        if (hourValue > 0 || existingIds.length > 0) {
            entriesToSave.push({
                employee_id: employeeId,
                site_id: type === 'Arbeit' ? (selectedSiteId === "absences" ? null : selectedSiteId) : null,
                date: date,
                hours_worked: hourValue,
                hourly_rate: currentRate,
                entry_type: type,
                existing_ids: existingIds,
            });
        }
      });
    });

    try {
      await saveMutation.mutateAsync(entriesToSave);
      showSuccess("Zeiten erfolgreich gespeichert.");
      queryClient.invalidateQueries({ queryKey: ["weeklyTimeEntries"] });
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
              <SelectItem value="absences" className="font-semibold text-blue-600">
                Abwesenheiten (Krank/Urlaub/etc.)
              </SelectItem>
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

        {selectedSiteId === "absences" && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-md text-sm text-blue-800">
            <strong>Hinweis:</strong> Sie erfassen gerade allgemeine Abwesenheiten (Krank, Urlaub, etc.).
            Diese Einträge werden keiner spezifischen Baustelle zugeordnet.
          </div>
        )}

        {selectedSiteId && selectedEmployeeIds.length > 0 ? (
          <>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-white dark:bg-gray-800">Mitarbeiter</TableHead>
                    {weekDays.map(day => (
                      <TableHead key={day.toISOString()} className="text-center min-w-[120px]">
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
                          <TableCell className="font-medium sticky left-0 bg-white dark:bg-gray-800">
                            <div className="flex flex-col gap-1">
                              <span>{employee.last_name}, {employee.first_name}</span>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-1.5 text-[10px] text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => toggleWeekType(empId, 'Krank')}
                                >
                                  Woche Krank
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-1.5 text-[10px] text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => toggleWeekType(empId, 'Urlaub')}
                                >
                                  Woche Urlaub
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          {weekDays.map(day => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const entry = hoursState[empId]?.[dateStr];
                            const isKrank = entry?.type === 'Krank';
                            const isUrlaub = entry?.type === 'Urlaub';
                            const isSchlechtwetter = entry?.type === 'Schlechtwetter';
                            
                            return (
                              <TableCell key={dateStr} className={cn(
                                isKrank && "bg-red-50 dark:bg-red-900/20",
                                isUrlaub && "bg-green-50 dark:bg-green-900/20",
                                isSchlechtwetter && "bg-blue-50 dark:bg-blue-900/20"
                              )}>
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      step="0.25"
                                      className={cn(
                                        "text-center h-8",
                                        (isKrank || isUrlaub || isSchlechtwetter) && "font-bold"
                                      )}
                                      value={entry?.hours || ''}
                                      onChange={e => handleHourChange(empId, dateStr, e.target.value)}
                                      disabled={isUrlaub || isSchlechtwetter}
                                    />
                                    <Button
                                      variant={isKrank ? "destructive" : "outline"}
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => toggleKrank(empId, dateStr)}
                                      title="Krank melden"
                                    >
                                      <Stethoscope className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant={isSchlechtwetter ? "secondary" : "outline"}
                                      size="icon"
                                      className="h-8 w-8 shrink-0 text-blue-600 border-blue-200"
                                      onClick={() => toggleSchlechtwetter(empId, dateStr)}
                                      title="Schlechtwetter melden"
                                    >
                                      <Umbrella className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  {isUrlaub && <span className="text-[10px] text-center text-green-600 font-medium">Urlaub</span>}
                                  {isSchlechtwetter && <span className="text-[10px] text-center text-blue-600 font-medium">Schlechtwetter</span>}
                                  {isKrank && <span className="text-[10px] text-center text-red-600 font-medium">Krank</span>}
                                </div>
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