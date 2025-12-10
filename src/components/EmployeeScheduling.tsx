import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees } from "@/services/employeeService";
import { getSites } from "@/services/siteService";
import { getAssignmentsForWeek, upsertAssignments, deleteAssignments, UpsertPayload } from "@/services/employeeAssignmentService";
import { Employee } from "@/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { startOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { de } from "date-fns/locale";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "./ui/skeleton";

const STATIC_ACTIVITIES = ["Urlaub", "Diverse Bauvorhaben", "Krank", "Lager", "Fahrer"];
const TEAM_COUNT = 8;

type GridState = Record<string, Record<number, string | null>>; // { [rowKey]: { [teamNumber]: employeeId } }

export const EmployeeScheduling = () => {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gridState, setGridState] = useState<GridState>({});
  const [initialGridState, setInitialGridState] = useState<GridState>({});

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: getEmployees });
  const { data: sites, isLoading: isLoadingSites } = useQuery({ queryKey: ["sites"], queryFn: () => getSites().then(s => s.filter(site => site.status === 'In Arbeit' || site.status === 'Geplant')) });
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ["assignments", format(weekStart, "yyyy-MM-dd")],
    queryFn: () => getAssignmentsForWeek(weekStart),
  });

  const { mutate: upsertMutation, isPending: isUpserting } = useMutation({
    mutationFn: upsertAssignments,
    onError: (error: Error) => showError(error.message),
  });
  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: deleteAssignments,
    onError: (error: Error) => showError(error.message),
  });

  const rows = useMemo(() => {
    const siteRows = (sites || []).map(s => ({ key: `site-${s.id}`, name: s.name, type: 'site' as const, id: s.id }));
    const activityRows = STATIC_ACTIVITIES.map(a => ({ key: `activity-${a}`, name: a, type: 'activity' as const, id: a }));
    return [...siteRows, ...activityRows];
  }, [sites]);

  useEffect(() => {
    if (assignments) {
      const newGridState: GridState = {};
      assignments.forEach(a => {
        const rowKey = a.site_id ? `site-${a.site_id}` : `activity-${a.activity}`;
        if (!newGridState[rowKey]) newGridState[rowKey] = {};
        if (a.team_number) {
          newGridState[rowKey][a.team_number] = a.employee_id;
        }
      });
      setGridState(newGridState);
      setInitialGridState(JSON.parse(JSON.stringify(newGridState))); // Deep copy
    }
  }, [assignments]);

  const handleAssignmentChange = (rowKey: string, teamNumber: number, employeeId: string | null) => {
    setGridState(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      // Remove employee from any other cell in the grid for this week
      for (const rKey in newState) {
        for (const tNum in newState[rKey]) {
          if (newState[rKey][tNum] === employeeId) {
            newState[rKey][tNum] = null;
          }
        }
      }
      if (!newState[rowKey]) newState[rowKey] = {};
      newState[rowKey][teamNumber] = employeeId;
      return newState;
    });
  };

  const handleSave = () => {
    const upsertPayload: UpsertPayload[] = [];
    const deleteIds: string[] = [];
    const assignedEmployees = new Set<string>();

    // Find new/updated assignments
    for (const rowKey in gridState) {
      for (const teamNumStr in gridState[rowKey]) {
        const teamNumber = parseInt(teamNumStr, 10);
        const employeeId = gridState[rowKey][teamNumber];
        if (employeeId) {
          assignedEmployees.add(employeeId);
          const [type, id] = rowKey.split('-');
          upsertPayload.push({
            employee_id: employeeId,
            site_id: type === 'site' ? id : null,
            activity: type === 'activity' ? id : null,
            week_start_date: format(weekStart, "yyyy-MM-dd"),
            team_number: teamNumber,
          });
        }
      }
    }

    // Find deleted assignments
    if (assignments) {
        assignments.forEach(ass => {
            if (!assignedEmployees.has(ass.employee_id)) {
                deleteIds.push(ass.id);
            }
        });
    }

    Promise.all([
        upsertMutation(upsertPayload),
        deleteMutation(deleteIds)
    ]).then(() => {
        showSuccess("Einsatzplan gespeichert.");
        queryClient.invalidateQueries({ queryKey: ["assignments", format(weekStart, "yyyy-MM-dd")] });
    });
  };

  const assignedEmployeeIds = useMemo(() => new Set(Object.values(gridState).flatMap(row => Object.values(row))), [gridState]);
  const isLoading = isLoadingEmployees || isLoadingSites || isLoadingAssignments;
  const hasChanges = JSON.stringify(gridState) !== JSON.stringify(initialGridState);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Wöchentliche Einsatzplanung</CardTitle>
            <CardDescription>Weisen Sie Mitarbeiter den Baustellen und Tätigkeiten zu.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subWeeks(d, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-center w-48">KW {format(weekStart, "ww", { locale: de })} ({format(weekStart, "dd.MM.yyyy")})</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addWeeks(d, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-96 w-full" /> : (
          <>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] sticky left-0 bg-background z-10">Baustelle / Tätigkeit</TableHead>
                    {Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).map(teamNum => (
                      <TableHead key={teamNum} className="text-center min-w-[180px]">{teamNum}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => {
                    const isFirstActivity = row.type === 'activity' && (index === 0 || rows[index - 1].type === 'site');
                    return (
                      <TableRow key={row.key} className={cn(isFirstActivity && "border-t-4 border-border")}>
                        <TableCell className="font-medium sticky left-0 bg-background z-10">{row.name}</TableCell>
                        {Array.from({ length: TEAM_COUNT }, (_, i) => i + 1).map(teamNum => {
                          const assignedEmployeeId = gridState[row.key]?.[teamNum] || null;
                          const availableEmployees = employees?.filter(e => !assignedEmployeeIds.has(e.id) || e.id === assignedEmployeeId);
                          return (
                            <TableCell key={teamNum} className="p-1">
                              <AssignmentCell
                                employees={availableEmployees || []}
                                value={assignedEmployeeId}
                                onChange={(empId) => handleAssignmentChange(row.key, teamNum, empId)}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={handleSave} disabled={!hasChanges || isUpserting || isDeleting}>
                {isUpserting || isDeleting ? "Speichern..." : "Änderungen speichern"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const AssignmentCell = ({ employees, value, onChange }: { employees: Employee[], value: string | null, onChange: (employeeId: string | null) => void }) => {
  const [open, setOpen] = useState(false);
  const selectedEmployee = employees.find(e => e.id === value);

  const popoverContent = (
    <PopoverContent className="w-[220px] p-0">
      <Command>
        <CommandInput placeholder="Suchen..." />
        <CommandList>
          <CommandEmpty>Kein Mitarbeiter gefunden.</CommandEmpty>
          <CommandGroup>
            {employees.map(employee => (
              <CommandItem
                key={employee.id}
                value={`${employee.first_name} ${employee.last_name}`}
                onSelect={() => { onChange(employee.id); setOpen(false); }}
              >
                <Check className={cn("mr-2 h-4 w-4", value === employee.id ? "opacity-100" : "opacity-0")} />
                {employee.last_name}, {employee.first_name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </PopoverContent>
  );

  if (selectedEmployee) {
    return (
      <div className="flex items-center justify-between p-1 rounded-md bg-secondary text-secondary-foreground h-9">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <span className="text-sm font-medium cursor-pointer truncate flex-1 px-2 hover:underline">
              {selectedEmployee.last_name}, {selectedEmployee.first_name.charAt(0)}.
            </span>
          </PopoverTrigger>
          {popoverContent}
        </Popover>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 rounded-full" onClick={() => onChange(null)}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full h-9">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      {popoverContent}
    </Popover>
  );
};