import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getRegieReportsForSite } from "@/services/regieReportService";
import { getEmployees } from "@/services/employeeService";
import { getWeek, getYear } from "date-fns";
import { RegieReportForm } from "./RegieReportForm";
import { PlusCircle } from "lucide-react";

interface SiteRegieReportsProps {
  siteId: string;
}

export const SiteRegieReports = ({ siteId }: SiteRegieReportsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const { data: reports, isLoading: isLoadingReports } = useQuery({
    queryKey: ["regieReports", siteId],
    queryFn: () => getRegieReportsForSite(siteId),
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const openDialog = (reportId: string | null = null) => {
    setSelectedReportId(reportId);
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Regieberichte</CardTitle>
          <CardDescription>
            Erfassen Sie hier zusätzliche Leistungen auf Stunden- und Materialbasis.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Neuer Bericht (KW {getWeek(new Date(), { weekStartsOn: 1 })})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl">
            <DialogHeader>
              <DialogTitle>{selectedReportId ? "Regiebericht bearbeiten" : "Neuen Regiebericht erstellen"}</DialogTitle>
            </DialogHeader>
            {isDialogOpen && (
              <RegieReportForm
                siteId={siteId}
                reportId={selectedReportId}
                employees={employees || []}
                onClose={() => setIsDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoadingReports ? (
          <p>Lade Berichte...</p>
        ) : (
          <div className="space-y-2">
            {reports?.map(report => (
              <div key={report.id} className="flex justify-between items-center p-2 border rounded-md">
                <p className="font-medium">Bericht für KW {report.week_number}, {report.year}</p>
                <Button variant="outline" size="sm" onClick={() => openDialog(report.id)}>Öffnen</Button>
              </div>
            ))}
            {reports?.length === 0 && <p className="text-center text-muted-foreground py-4">Keine Regieberichte vorhanden.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
};