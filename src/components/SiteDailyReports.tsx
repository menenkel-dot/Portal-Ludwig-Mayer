import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { getReportForDate, upsertDailyReport, UpsertReportPayload } from "@/services/dailyReportService";
import { DailyReportForm } from "./DailyReportForm";
import { useAuth } from "@/contexts/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "./ui/skeleton";

interface SiteDailyReportsProps {
  siteId: string;
}

export const SiteDailyReports = ({ siteId }: SiteDailyReportsProps) => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const reportDate = date ? format(date, "yyyy-MM-dd") : "";

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ["dailyReport", siteId, reportDate],
    queryFn: () => getReportForDate(siteId, date!),
    enabled: !!date,
  });

  const mutation = useMutation({
    mutationFn: upsertDailyReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dailyReport", siteId, reportDate] });
      showSuccess("Bautagesbericht gespeichert.");
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const handleSubmit = (formData: Omit<UpsertReportPayload, 'site_id' | 'report_date' | 'created_by_user_id'>) => {
    if (!date || !user) return;
    const payload: UpsertReportPayload = {
      ...formData,
      site_id: siteId,
      report_date: reportDate,
      created_by_user_id: user.id,
    };
    mutation.mutate(payload);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bautagesberichte</CardTitle>
        <CardDescription>
          Tägliche Dokumentation des Baufortschritts. Wählen Sie ein Datum aus, um einen Bericht anzuzeigen oder zu erstellen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className="w-full md:w-auto justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: de }) : <span>Datum auswählen</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
              locale={de}
            />
          </PopoverContent>
        </Popover>
        
        {isLoading ? (
          <Skeleton className="h-[400px] w-full" />
        ) : isError ? (
          <p className="text-destructive">Fehler beim Laden des Berichts.</p>
        ) : (
          <DailyReportForm
            key={reportDate} // Re-mount form when date changes
            initialData={report}
            onSubmit={handleSubmit}
            isLoading={mutation.isPending}
            reportDate={date ? format(date, "eeee, dd.MM.yyyy", { locale: de }) : ""}
          />
        )}
      </CardContent>
    </Card>
  );
};