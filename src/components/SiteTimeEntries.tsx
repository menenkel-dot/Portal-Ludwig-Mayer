import { useQuery } from "@tanstack/react-query";
import { getTimeEntriesForSite } from "@/services/timeTrackingService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface SiteTimeEntriesProps {
  siteId: string;
}

export const SiteTimeEntries = ({ siteId }: SiteTimeEntriesProps) => {
  const { data: entries, isLoading, isError } = useQuery({
    queryKey: ["timeEntries", siteId],
    queryFn: () => getTimeEntriesForSite(siteId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Zeiterfassung</CardTitle></CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader><CardTitle>Zeiterfassung</CardTitle></CardHeader>
        <CardContent>
          <p className="text-destructive">Fehler beim Laden der Zeiteinträge.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Zeiterfassung auf dieser Baustelle</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Mitarbeiter</TableHead>
              <TableHead>Stunden</TableHead>
              <TableHead>Beschreibung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries && entries.length > 0 ? (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(new Date(entry.date), "dd.MM.yyyy")}</TableCell>
                  <TableCell>{entry.employees?.first_name} {entry.employees?.last_name}</TableCell>
                  <TableCell>{entry.hours_worked.toFixed(2)}</TableCell>
                  <TableCell>{entry.description || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Noch keine Zeiteinträge für diese Baustelle vorhanden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};