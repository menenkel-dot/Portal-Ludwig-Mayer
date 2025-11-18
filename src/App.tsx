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
import ServiceCatalog from "./pages/ServiceCatalog";
import ServiceCatalogDetail from "./pages/ServiceCatalogDetail";
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
      <ThemeProvider attribute="class" defaultTheme="system" storageKey="vite-ui-theme">
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Index />} />
              
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<ProtectedRoute permission="dashboard"><Dashboard /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute permission="customers"><Customers /></ProtectedRoute>} />
                <Route path="/customers/:id" element={<ProtectedRoute permission="customers"><CustomerDetail /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute permission="employees"><Employees /></ProtectedRoute>} />
                <Route path="/employees/:id" element={<ProtectedRoute permission="employees"><EmployeeDetail /></ProtectedRoute>} />
                <Route path="/sites" element={<ProtectedRoute permission="sites"><Sites /></ProtectedRoute>} />
                <Route path="/sites/:id" element={<ProtectedRoute permission="sites"><SiteDetail /></ProtectedRoute>} />
                <Route path="/fleet" element={<ProtectedRoute permission="fleet"><Fleet /></ProtectedRoute>} />
                <Route path="/materials" element={<ProtectedRoute permission="materials"><Materials /></ProtectedRoute>} />
                <Route path="/time-tracking" element={<ProtectedRoute permission="time-tracking"><TimeTracking /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute permission="reports"><Reports /></ProtectedRoute>} />
                <Route path="/calculations" element={<ProtectedRoute permission="calculations"><Calculations /></ProtectedRoute>} />
                <Route path="/calculations/:id" element={<ProtectedRoute permission="calculations"><CalculationDetail /></ProtectedRoute>} />
                <Route path="/service-catalog" element={<ProtectedRoute permission="service-catalog"><ServiceCatalog /></ProtectedRoute>} />
                <Route path="/service-catalog/:id" element={<ProtectedRoute permission="service-catalog"><ServiceCatalogDetail /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute permission="settings"><Settings /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute permission="users"><Users /></ProtectedRoute>} />
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