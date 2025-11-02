import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getSites } from "@/services/siteService";
import { getVehicles } from "@/services/vehicleService";
import { getTimeEntries } from "@/services/timeTrackingService";
import { Building, Users, Truck, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const { data: sites, isLoading: isLoadingSites } = useQuery({
    queryKey: ["sites"],
    queryFn: getSites,
  });

  const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: getVehicles,
  });

  const { data: timeEntries, isLoading: isLoadingTimeEntries } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: getTimeEntries,
  });

  const isLoading = isLoadingSites || isLoadingVehicles || isLoadingTimeEntries;

  const activeSites = sites?.filter((site) => site.status === "In Arbeit").length || 0;
  const availableVehicles = vehicles?.filter((vehicle) => vehicle.status === "Verfügbar").length || 0;

  const today = new Date().toISOString().split("T")[0];
  const todaysEntries = timeEntries?.filter((entry) => entry.date.startsWith(today)) || [];
  
  const employeesWorkingToday = new Set(todaysEntries.map(entry => entry.employee_id)).size;
  const hoursToday = todaysEntries.reduce((sum, entry) => sum + entry.hours_worked, 0);

  const stats = [
    { title: "Aktive Baustellen", value: activeSites, icon: Building },
    { title: "Mitarbeiter im Einsatz (heute)", value: employeesWorkingToday, icon: Users },
    { title: "Stunden erfasst (heute)", value: `${hoursToday.toFixed(2)} h`, icon: Clock },
    { title: "Fahrzeuge verfügbar", value: availableVehicles, icon: Truck },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-1/2" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;