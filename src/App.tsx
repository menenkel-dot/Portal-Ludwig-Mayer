import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Sites from "./pages/Sites";
import SiteDetail from "./pages/SiteDetail";
import Fleet from "./pages/Fleet";
import Employees from "./pages/Employees";
import EmployeeDetail from "./pages/EmployeeDetail";
import TimeTracking from "./pages/TimeTracking";
import Reports from "./pages/Reports";
import Calculations from "./pages/Calculations";
import CalculationDetail from "./pages/CalculationDetail";
import Settings from "./pages/Settings";
import Users from "./pages/Users";
import Materials from "./pages/Materials";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { ThemeProvider } from "./components/ThemeProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Index />} />
              
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/:id" element={<EmployeeDetail />} />
                <Route path="/sites" element={<Sites />} />
                <Route path="/sites/:id" element={<SiteDetail />} />
                <Route path="/fleet" element={<Fleet />} />
                <Route path="/materials" element={<Materials />} />
                <Route path="/time-tracking" element={<TimeTracking />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/calculations" element={<Calculations />} />
                <Route path="/calculations/:id" element={<CalculationDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<Users />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;