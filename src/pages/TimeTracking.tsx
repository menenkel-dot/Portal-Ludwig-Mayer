import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeEntryList } from "@/components/TimeEntryList";
import { WeeklyTimeSheet } from "@/components/WeeklyTimeSheet";

const TimeTracking = () => {
  return (
    <div>
      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Zeiterfassung</h1>
          <TabsList>
            <TabsTrigger value="list">Alle Einträge</TabsTrigger>
            <TabsTrigger value="week">Wochenerfassung</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="list">
          <TimeEntryList />
        </TabsContent>
        <TabsContent value="week">
          <WeeklyTimeSheet />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimeTracking;