import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { getSites } from "@/services/siteService";
import { getVehicles } from "@/services/vehicleService";
import { getTimeEntries } from "@/services/timeTrackingService";
import { getEmployees } from "@/services/employeeService";
import { getDashboardPreferences, updateDashboardPreferences } from "@/services/dashboardService";
import { Building, Truck, Clock, UserCheck, Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { DashboardCustomization } from "@/components/DashboardCustomization";
import { showSuccess, showError } from "@/utils/toast";

const Dashboard = () => {
  const { user, permissions, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Data fetching
  const { data: sites, isLoading: isLoadingSites } = useQuery({ queryKey: ["sites"], queryFn: getSites, enabled: isAdmin || permissions.includes('sites') });
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({ queryKey: ["vehicles"], queryFn: getVehicles, enabled: isAdmin || permissions.includes('fleet') });
  const { data: timeEntries, isLoading: isLoadingTimeEntries } = useQuery({ queryKey: ["timeEntries"], queryFn: getTimeEntries, enabled: isAdmin || permissions.includes('time-tracking') });
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({ queryKey: ["employees"], queryFn: getEmployees, enabled: isAdmin || permissions.includes('employees') });
  
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ["dashboardPreferences", user?.id],
    queryFn: () => getDashboardPreferences(user!.id, permissions, isAdmin),
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (newSelection: string[]) => updateDashboardPreferences(user!.id, newSelection),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardPreferences", user?.id] });
      showSuccess("Dashboard-Einstellungen gespeichert.");
      setIsCustomizeOpen(false);
    },
    onError: (error: Error) => showError(error.message),
  });

  const isLoading = isLoadingSites || isLoadingVehicles || isLoadingTimeEntries || isLoadingEmployees || isLoadingPreferences;

  // Memoized data processing
  const employeeMap = useMemo(() => new Map(employees?.map(e => [e.id, `${e.first_name} ${e.last_name}`])), [employees]);
  const stats = useMemo(() => {
    const activeSites = sites?.filter((site) => site.status === "In Arbeit").length || 0;
    const availableVehicles = vehicles?.filter((vehicle) => vehicle.status === "Verfügbar").length || 0;
    const today = new Date().toISOString().split("T")[0];
    const todaysWorkEntries = timeEntries?.filter((entry) => entry.date.startsWith(today) && entry.entry_type === 'Arbeit') || [];
    const employeesWorkingToday = new Set(todaysWorkEntries.map(entry => entry.employee_id)).size;
    const hoursToday = todaysWorkEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);
    return [
      { title: "Aktive Baustellen", value: activeSites, icon: Building, permission: 'sites' },
      { title: "Mitarbeiter im Einsatz (heute)", value: employeesWorkingToday, icon: UserCheck, permission: 'employees' },
      { title: "Stunden erfasst (heute)", value: `${hoursToday.toFixed(1)} h`, icon: Clock, permission: 'time-tracking' },
      { title: "Fahrzeuge verfügbar", value: availableVehicles, icon: Truck, permission: 'fleet' },
    ];
  }, [sites, vehicles, timeEntries]);

  // Widget Definitions
  const allWidgets = [
    {
      id: 'stat_cards',
      title: 'Statistik-Karten',
      permission: 'sites', // Broad permission, content is filtered internally
      component: (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.filter(stat => isAdmin || permissions.includes(stat.permission)).map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{stat.value}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      ),
    },
    {
      id: 'weekly_hours',
      title: 'Stundenübersicht (7 Tage)',
      permission: 'time-tracking',
      component: (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Stundenübersicht der letzten 7 Tage</CardTitle></CardHeader>
          <CardContent className="pl-2 h-[300px]">
            {isLoadingTimeEntries ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={useMemo(() => {
                  if (!timeEntries) return [];
                  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
                  return last7Days.map(day => ({
                    name: format(day, "EEE", { locale: de }),
                    Stunden: parseFloat(timeEntries.filter(entry => entry.date.startsWith(format(day, "yyyy-MM-dd")) && entry.entry_type === 'Arbeit').reduce((sum, entry) => sum + entry.hours_worked, 0).toFixed(1)),
                  }));
                }, [timeEntries])}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                  <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }} />
                  <Bar dataKey="Stunden" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'recent_activities',
      title: 'Letzte Aktivitäten',
      permission: 'time-tracking',
      component: (
        <Card>
          <CardHeader><CardTitle>Letzte Aktivitäten</CardTitle><CardDescription>Die zuletzt erfassten Zeiteinträge.</CardDescription></CardHeader>
          <CardContent>
            {isLoadingTimeEntries ? <Skeleton className="h-[300px] w-full" /> : (
              <div className="space-y-4">
                {useMemo(() => timeEntries?.slice(0, 5).map(entry => ({ ...entry, employeeName: employeeMap.get(entry.employee_id) || "Unbekannt", siteName: entry.sites?.name || "N/A" })), [timeEntries, employeeMap]).map(activity => (
                  <div key={activity.id} className="flex items-center">
                    <Avatar className="h-9 w-9"><AvatarFallback>{activity.employeeName.charAt(0)}</AvatarFallback></Avatar>
                    <div className="ml-4 space-y-1"><p className="text-sm font-medium leading-none">{activity.employeeName}</p><p className="text-sm text-muted-foreground">{activity.siteName}</p></div>
                    <div className="ml-auto font-medium">{activity.hours_worked.toFixed(1)}h</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      id: 'active_projects',
      title: 'Aktive Projekte',
      permission: 'sites',
      component: (
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Aktive Projekte</CardTitle></CardHeader>
          <CardContent>
            {isLoadingSites ? <Skeleton className="h-[200px] w-full" /> : (
              <Table>
                <TableHeader><TableRow><TableHead>Baustelle</TableHead><TableHead>Kunde</TableHead><TableHead>Startdatum</TableHead></TableRow></TableHeader>
                <TableBody>
                  {useMemo(() => sites?.filter(site => site.status === "In Arbeit") || [], [sites]).map(project => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium"><Link to={`/sites/${project.id}`} className="hover:underline">{project.name}</Link></TableCell>
                      <TableCell>{project.customers ? <Link to={`/customers/${project.customers.id}`} className="hover:underline">{project.customers.name}</Link> : "N/A"}</TableCell>
                      <TableCell>{format(new Date(project.start_date), "dd.MM.yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ),
    },
  ];

  const availableWidgets = allWidgets.filter(w => isAdmin || permissions.includes(w.permission));
  const visibleWidgets = availableWidgets.filter(w => preferences?.includes(w.id));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={() => setIsCustomizeOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Anpassen
        </Button>
      </div>
      
      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {visibleWidgets.map(widget => (
            <div key={widget.id} className={
              widget.id === 'stat_cards' ? 'lg:col-span-3' :
              widget.id === 'weekly_hours' ? 'lg:col-span-2' :
              widget.id === 'recent_activities' ? 'lg:col-span-1' :
              widget.id === 'active_projects' ? 'lg:col-span-3' : ''
            }>
              {widget.component}
            </div>
          ))}
        </div>
      )}

      <DashboardCustomization
        open={isCustomizeOpen}
        onOpenChange={setIsCustomizeOpen}
        availableWidgets={availableWidgets}
        currentSelection={preferences || []}
        onSave={(selection) => updatePreferencesMutation.mutate(selection)}
        isSaving={updatePreferencesMutation.isPending}
      />
    </div>
  );
};

export default Dashboard;