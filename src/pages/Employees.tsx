import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeList } from "@/components/EmployeeList";
import { EmployeeScheduling } from "@/components/EmployeeScheduling";

const Employees = () => {
  return (
    <div>
      <Tabs defaultValue="list">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold">Mitarbeiter</h1>
          <TabsList>
            <TabsTrigger value="list">Mitarbeiterliste</TabsTrigger>
            <TabsTrigger value="scheduling">Einsatzplanung</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="list">
          <EmployeeList />
        </TabsContent>
        <TabsContent value="scheduling">
          <EmployeeScheduling />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Employees;