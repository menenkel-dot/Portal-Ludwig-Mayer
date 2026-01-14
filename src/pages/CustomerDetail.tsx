import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCustomerById } from "@/services/customerService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading, isError } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => getCustomerById(id!),
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

  if (isError || !customer) {
    return <div>Fehler beim Laden der Kundendetails.</div>;
  }

  return (
    <div>
      <Link to="/customers" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zu allen Kunden
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{customer.name}</h1>
        <p className="text-muted-foreground">Kundendetails und Projekte</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Kontaktinformationen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{customer.contact_person}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{customer.email}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{customer.phone}</span>
            </div>
            <div className="flex items-start space-x-3">
              <Home className="h-5 w-5 text-muted-foreground mt-1" />
              <span className="text-sm">{customer.address}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Bauprojekte</CardTitle>
            <CardDescription>Alle Baustellen, die diesem Kunden zugeordnet sind.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projektname</TableHead>
                  <TableHead>Startdatum</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.sites && customer.sites.length > 0 ? (
                  customer.sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">
                        <Link to={`/sites/${site.id}`} className="hover:underline">
                          {site.name}
                        </Link>
                      </TableCell>
                      <TableCell>{site.start_date ? format(new Date(site.start_date), "dd.MM.yyyy") : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={
                          site.status === 'Abgeschlossen' ? 'secondary' :
                          site.status === 'In Arbeit' ? 'default' :
                          'outline'
                        }>
                          {site.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      Für diesen Kunden sind keine Baustellen vorhanden.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerDetail;