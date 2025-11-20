import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { getRegieReportsForSite } from "@/services/regieReportService";
import { getEmployees } from "@/services/employeeService";
import { getWeek, getYear, format } from "date-fns";
import { de } from "date-fns/locale";
import { RegieReportForm } from "./RegieReportForm";
import { PlusCircle, Calendar as CalendarIcon } from "lucide-react";

interface SiteRegieReportsProps {
  siteId: string;
}

type DialogParams = {
  reportId: string | null;
  weekNumber: number;
  year: number;
};

export const SiteRegieReports = ({ siteId }: SiteRegieReportsProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogParams, setDialogParams] = useState<DialogParams | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: reports, isLoading: isLoadingReports } = useQuery({
    queryKey: ["regieReports", siteId],
    queryFn: () => getRegieReportsForSite(siteId),
  });

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const openDialog = (params: DialogParams) => {
    setDialogParams(params);
    setIsDialogOpen(true);
  };

  const handleNewReport = () => {
    openDialog({
      reportId: null,
      weekNumber: getWeek(selectedDate, { weekStartsOn: 1 }),
      year: getYear(selectedDate),
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Regieberichte</CardTitle>
              <CardDescription>
                Erfassen Sie zusätzliche Leistungen auf Stunden- und Materialbasis.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP", { locale: de }) : <span>Datum auswählen</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus locale={de} />
                </PopoverContent>
              </Popover>
              <Button onClick={handleNewReport}>
                <PlusCircle className="mr-2 h-4 w-4" /> Bericht für KW {getWeek(selectedDate, { weekStartsOn: 1 })}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
            <p>Lade Berichte...</p>
          ) : (
            <div className="space-y-2">
              {reports?.map(report => (
                <div key={report.id} className="flex justify-between items-center p-2 border rounded-md">
                  <p className="font-medium">Bericht für KW {report.week_number}, {report.year}</p>
                  <Button variant="outline" size="sm" onClick={() => openDialog({ reportId: report.id, weekNumber: report.week_number, year: report.year })}>Öffnen</Button>
                </div>
              ))}
              {reports?.length === 0 && <p className="text-center text-muted-foreground py-4">Keine Regieberichte vorhanden.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>{dialogParams?.reportId ? "Regiebericht bearbeiten" : "Neuen Regiebericht erstellen"}</DialogTitle>
          </DialogHeader>
          {dialogParams && (
            <RegieReportForm
              siteId={siteId}
              reportId={dialogParams.reportId}
              weekNumber={dialogParams.weekNumber}
              year={dialogParams.year}
              employees={employees || []}
              onClose={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};