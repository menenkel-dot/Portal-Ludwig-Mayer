import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Unauthorized = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background rounded-lg">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold mb-2">Zugriff verweigert</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Sie haben keine Berechtigung, auf diese Seite zuzugreifen.
        <br />
        Bitte wenden Sie sich an einen Administrator, wenn Sie glauben, dass dies ein Fehler ist.
      </p>
      <Button asChild>
        <Link to="/dashboard">Zurück zum Dashboard</Link>
      </Button>
    </div>
  );
};

export default Unauthorized;