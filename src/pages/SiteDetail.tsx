import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getSiteById } from "@/services/siteService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building, User, Mail, Phone, Calendar as CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SiteTimeEntries } from "@/components/SiteTimeEntries";
import { SiteDocuments } from "@/components/SiteDocuments";
import { SiteNotes } from "@/components/SiteNotes";
import { useEffect, useState } from "react";

const SiteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [mapSrc, setMapSrc] = useState<string | null>(null);

  const { data: site, isLoading, isError } = useQuery({
    queryKey: ["site", id],
    queryFn: () => getSiteById(id!),
    enabled: !!id,
  });

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey && site?.address) {
      const encodedAddress = encodeURIComponent(site.address);
      setMapSrc(`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`);
    }
  }, [site]);

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
    <div>
      <Link to="/sites" className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Zurück zu allen Baustellen
      </Link>

      <div className="flex justify-between items-start mb-6">
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

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
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

        {site.customers && (
          <Card>
            <CardHeader>
              <CardTitle>Kunde</CardTitle>
              <CardDescription>{site.customers.name}</CardDescription>
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
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Standort auf der Karte</CardTitle>
          </CardHeader>
          <CardContent>
            {mapSrc ? (
              <iframe
                className="w-full h-96 border-0 rounded-md"
                loading="lazy"
                allowFullScreen
                src={mapSrc}>
              </iframe>
            ) : (
              <div className="text-center text-muted-foreground p-4 bg-muted rounded-md">
                <p>Google Maps API-Schlüssel nicht konfiguriert.</p>
                <p className="text-sm">Bitte fügen Sie <code className="bg-background p-1 rounded-sm">VITE_GOOGLE_MAPS_API_KEY</code> zu Ihren Umgebungsvariablen hinzu, um die Karte anzuzeigen.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <SiteTimeEntries siteId={site.id} />
      </div>
      
      <div className="mt-6">
        <SiteDocuments siteId={site.id} />
      </div>

      <div className="mt-6">
        <SiteNotes siteId={site.id} />
      </div>
    </div>
  );
};

export default SiteDetail;