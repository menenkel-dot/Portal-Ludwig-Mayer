import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building,
  Users,
  Truck,
  Clock,
  FileText,
  Settings,
  LogOut,
  LayoutDashboard,
  Contact,
  Box,
  UserCog,
} from "lucide-react";

const allNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", permission: "dashboard" },
  { href: "/customers", icon: Users, label: "Kunden", permission: "customers" },
  { href: "/employees", icon: Contact, label: "Mitarbeiter", permission: "employees" },
  { href: "/sites", icon: Building, label: "Baustellen", permission: "sites" },
  { href: "/fleet", icon: Truck, label: "Fuhrpark", permission: "fleet" },
  { href: "/time-tracking", icon: Clock, label: "Zeiterfassung", permission: "time-tracking" },
  { href: "/reports", icon: FileText, label: "Reports", permission: "reports" },
];

const settingsNavItems = [
    { href: "/settings", icon: Settings, label: "Einstellungen", permission: "settings" },
    { href: "/users", icon: UserCog, label: "Benutzer", permission: "users", adminOnly: true },
]

interface SidebarProps {
  onLinkClick?: () => void;
}

const Sidebar = ({ onLinkClick }: SidebarProps) => {
  const { signOut, permissions, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    if (onLinkClick) onLinkClick();
    navigate("/login");
  };

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const visibleNavItems = allNavItems.filter(item => isAdmin || permissions.includes(item.permission));
  const visibleSettingsItems = settingsNavItems.filter(item => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return isAdmin || permissions.includes(item.permission);
  });


  return (
    <aside className="w-64 bg-white dark:bg-gray-800 flex flex-col border-r h-full">
      <div className="p-4 border-b">
        <img src="/logo.png" alt="Logo" className="h-12" />
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.href}
            onClick={handleLinkClick}
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
        {visibleSettingsItems.map((item) => (
            <NavLink
                key={item.label}
                to={item.href}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors mb-1 ${
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
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="w-5 h-5 mr-3" />
          Abmelden
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;