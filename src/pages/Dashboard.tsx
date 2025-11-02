import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { getSites } from "@/services/siteService";
import { getVehicles } from "@/services/vehicleService";
import { getTimeEntries } from "@/services/timeTrackingService";
import { getEmployees } from "@/services/employeeService";
import { Building, Truck, Clock, UserCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { permissions, isAdmin } = useAuth();

  const { data: sites, isLoading: isLoadingSites } = useQuery({ 
    queryKey: ["sites"], 
    queryFn: getSites,
    enabled: isAdmin || permissions.includes('sites'),
  });
  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({ 
    queryKey: ["vehicles"], 
    queryFn: getVehicles,
    enabled: isAdmin || permissions.includes('fleet'),
  });
  const { data: timeEntries, isLoading: isLoadingTimeEntries } = useQuery({ 
    queryKey: ["timeEntries"], 
    queryFn: getTimeEntries,
    enabled: isAdmin || permissions.includes('time-tracking'),
  });
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({ 
    queryKey: ["employees"], 
    queryFn: getEmployees,
    enabled: isAdmin || permissions.includes('employees'),
  });

  const isLoading = isLoadingSites || isLoadingVehicles || isLoadingTimeEntries || isLoadingEmployees;

  const employeeMap = useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map(e => [e.id, `${e.first_name} ${e.last_name}`]));
  }, [employees]);

  const stats = useMemo(() => {
    const activeSites = sites?.filter((site) => site.status === "In Arbeit").length || 0;
    const availableVehicles = vehicles?.filter((vehicle) => vehicle.status === "Verfügbar").length || 0;
    
    const today = new Date().toISOString().split("T")[0];
    const todaysEntries = timeEntries?.filter((entry) => entry.date.startsWith(today)) || [];
    const employeesWorkingToday = new Set(todaysEntries.map(entry => entry.employee_id)).size;
    const hoursToday = todaysEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);

    const allStats = [
      { title: "Aktive Baustellen", value: activeSites, icon: Building, permission: 'sites' },
      { title: "Mitarbeiter im Einsatz (heute)", value: employeesWorkingToday, icon: UserCheck, permission: 'employees' },
      { title: "Stunden erfasst (heute)", value: `${hoursToday.toFixed(1)} h`, icon: Clock, permission: 'time-tracking' },
      { title: "Fahrzeuge verfügbar", value: availableVehicles, icon: Truck, permission: 'fleet' },
    ];

    return allStats.filter(stat => isAdmin || permissions.includes(stat.permission));
  }, [sites, vehicles, timeEntries, isAdmin, permissions]);

  const weeklyHoursData = useMemo(() => {
    if (!timeEntries) return [];
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), i)).reverse();
    
    return last7Days.map(day => {
      const dayString = format(day, "yyyy-MM-dd");
      const hours = timeEntries
        .filter(entry => entry.date.startsWith(dayString))
        .reduce((sum, entry) => sum + entry.hours_worked, 0);
      return {
        name: format(day, "EEE", { locale: de }),
        Stunden: parseFloat(hours.toFixed(1)),
      };
    });
  }, [timeEntries]);

  const recentActivities = useMemo(() => {
    if (!timeEntries || !sites) return [];
    return timeEntries
      .slice(0, 5)
      .map(entry => ({
        ...entry,
        employeeName: employeeMap.get(entry.employee_id) || "Unbekannt",
        siteName: entry.sites?.name || "N/A",
      }));
  }, [timeEntries, sites, employeeMap]);

  const activeProjects = useMemo(() => {
    return sites?.filter(site => site.status === "In Arbeit") || [];
  }, [sites]);

  const canViewTimeTracking = isAdmin || permissions.includes('time-tracking');
  const canViewSites = isAdmin || permissions.includes('sites');

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6">
        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
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

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Weekly Hours Chart */}
          {canViewTimeTracking && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Stundenübersicht der letzten 7 Tage</CardTitle>
              </CardHeader>
              <CardContent className="pl-2 h-[300px]">
                {isLoadingTimeEntries ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyHoursData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                      <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }} />
                      <Bar dataKey="Stunden" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Activities */}
          {canViewTimeTracking && (
            <Card>
              <CardHeader>
                <CardTitle>Letzte Aktivitäten</CardTitle>
                <CardDescription>Die zuletzt erfassten Zeiteinträge.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTimeEntries ? <Skeleton className="h-[300px] w-full" /> : (
                  <div className="space-y-4">
                    {recentActivities.map(activity => (
                      <div key={activity.id} className="flex items-center">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{activity.employeeName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="ml-4 space-y-1">
                          <p className="text-sm font-medium leading-none">{activity.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{activity.siteName}</p>
                        </div>
                        <div className="ml-auto font-medium">{activity.hours_worked.toFixed(1)}h</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active Projects */}
        {canViewSites && (
          <Card>
            <CardHeader>
              <CardTitle>Aktive Projekte</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSites ? <Skeleton className="h-[200px] w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Baustelle</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead>Startdatum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeProjects.map(project => (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <Link to={`/sites/${project.id}`} className="hover:underline">
                            {project.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {project.customers ? (
                            <Link to={`/customers/${project.customers.id}`} className="hover:underline">
                              {project.customers.name}
                            </Link>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>{format(new Date(project.start_date), "dd.MM.yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;