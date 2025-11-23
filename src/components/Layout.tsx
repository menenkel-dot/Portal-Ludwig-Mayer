import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell";

const Layout = () => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <header className="flex items-center justify-between p-2 border-b bg-white dark:bg-gray-800 sticky top-0 z-10 no-print">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <Sidebar onLinkClick={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
          
          <img src="/logo.png" alt="Logo" className="h-10" />

          <div className="w-10">
            <NotificationBell />
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="no-print">
        <Sidebar />
      </div>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="flex justify-end mb-4 no-print">
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;