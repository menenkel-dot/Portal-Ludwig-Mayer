import { useQuery } from "@tanstack/react-query";
import { getTimeEntries } from "@/services/timeTrackingService";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const Reports = () => {
  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ["timeEntries"],
    queryFn: getTimeEntries,
  });

  const hoursPerSite = useMemo(() => {
    if (!timeEntries) return [];

    const siteHours = timeEntries.reduce((acc, entry) => {
      const siteName = entry.sites?.name || "Ohne Zuordnung";
      if (!acc[siteName]) {
        acc[siteName] = 0;
      }
      acc[siteName] += entry.hours_worked;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(siteHours)
      .map(([name, hours]) => ({
        name,
        Stunden: parseFloat(hours.toFixed(2)),
      }))
      .sort((a, b) => b.Stunden - a.Stunden);
  }, [timeEntries]);

  if (isLoading) return <div>Lade Reports...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stunden pro Baustelle</CardTitle>
            <CardDescription>
              Eine Übersicht der insgesamt geleisteten Arbeitsstunden für jede Baustelle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] mb-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursPerSite}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}h`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                    contentStyle={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Stunden" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <h3 className="text-lg font-semibold mb-4">Daten-Tabelle</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Baustelle</TableHead>
                    <TableHead className="text-right">Gesamtstunden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hoursPerSite.map((site) => (
                    <TableRow key={site.name}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell className="text-right">{site.Stunden.toFixed(2)} h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;