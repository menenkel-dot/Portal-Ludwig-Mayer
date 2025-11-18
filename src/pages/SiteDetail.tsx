import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSiteById } from "@/services/siteService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building, User, Mail, Phone, Calendar as CalendarIcon, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SiteTimeEntries } from "@/components/SiteTimeEntries";
import { SiteDocuments } from "@/components/SiteDocuments";
import { SiteNotes } from "@/components/SiteNotes";

const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: site, isLoading, isError } = useQuery({
    queryKey: ["site", id],
    queryFn: () => getSiteById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-32 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !site) {
    return <div>Fehler beim Laden der Baustellendetails.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/sites" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zu allen Baustellen
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{site.name}</h1>
            <p className="text-muted-foreground">{site.address}</p>
          </div>
          <Badge variant={
            site.status === 'Abgeschlossen' ? 'secondary' :
            site.status === 'In Arbeit' ? 'default' :
            'outline'
          } className="text-base">
            {site.status}
          </Badge>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Projektdetails</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Startdatum</p>
                  <p className="text-sm text-muted-foreground">{format(new Date(site.start_date), "dd.MM.yyyy")}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm font-medium">Enddatum</p>
                  <p className="text-sm text-muted-foreground">{site.end_date ? format(new Date(site.end_date), "dd.MM.yyyy") : "Offen"}</p>
                </div>
              </div>
              {site.notes && (
                <div className="flex items-start space-x-3 sm:col-span-2">
                  <Building className="h-5 w-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-sm font-medium">Notizen</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{site.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {site.customers && (
            <Card>
              <CardHeader>
                <CardTitle>Kunde</CardTitle>
                <CardDescription>
                  <Link to={`/customers/${site.customers.id}`} className="hover:underline">
                    {site.customers.name}
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{site.customers.contact_person}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{site.customers.email}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{site.customers.phone}</span>
                </div>
              </CardContent>
            </Card>
          )}
          {site.employees && (
            <Card>
              <CardHeader>
                <CardTitle>Bauführer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <Link to={`/employees/${site.employees.id}`} className="text-sm hover:underline">
                    {site.employees.first_name} {site.employees.last_name}
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SiteTimeEntries siteId={site.id} />
      <SiteDocuments siteId={site.id} />
      <SiteNotes siteId={site.id} />
    </div>
  );
};

export default SiteDetail;