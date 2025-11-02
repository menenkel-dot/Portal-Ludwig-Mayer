import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building,
  Users,
  Truck,
  Calculator,
  Clock,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/customers", icon: Users, label: "Kunden" },
  { href: "/sites", icon: Building, label: "Baustellen" },
  { href: "/fleet", icon: Truck, label: "Fuhrpark" },
  { href: "/calculations", icon: Calculator, label: "Kalkulation" },
  { href: "/time-tracking", icon: Clock, label: "Zeiterfassung" },
  { href: "/reports", icon: FileText, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Einstellungen" },
];

const Sidebar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 flex flex-col border-r">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold text-blue-600">Bau-Portal</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="w-5 h-5 mr-3" />
          Abmelden
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;