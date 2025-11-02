import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeById } from "@/services/employeeService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Mail, Phone, Briefcase, Euro } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const EmployeeDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => getEmployeeById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-32 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return <div>Fehler beim Laden der Mitarbeiterdetails.</div>;
  }

  const totalHours = employee.time_entries?.reduce((sum, entry) => sum + entry.hours_worked, 0) || 0;

  return (
    <div>
      <Link to="/employees" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zu allen Mitarbeitern
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{employee.first_name} {employee.last_name}</h1>
        <p className="text-muted-foreground">{employee.position}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kontakt & Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{employee.email}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{employee.phone}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{employee.position}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Euro className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{employee.hourly_rate.toFixed(2)} € / Stunde</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Erfasste Arbeitszeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Baustelle</TableHead>
                  <TableHead className="text-right">Stunden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employee.time_entries && employee.time_entries.length > 0 ? (
                  employee.time_entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), "dd.MM.yyyy")}</TableCell>
                      <TableCell>
                        {entry.sites ? (
                           <Link to={`/sites/${entry.sites.id}`} className="hover:underline">
                            {entry.sites.name}
                           </Link>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">{entry.hours_worked.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Für diesen Mitarbeiter sind keine Zeiteinträge vorhanden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="text-right font-bold mt-4">
              Gesamtstunden: {totalHours.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDetail;