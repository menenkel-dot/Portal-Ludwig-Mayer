import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import Unauthorized from '@/pages/Unauthorized';

const ProtectedRoute = ({ children, permission }: { children: React.ReactNode, permission?: string }) => {
  const { session, isAdmin, permissions } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Shortened delay for faster feedback
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 250); 
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full w-full"><p>Lade...</p></div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If a specific permission is required for this route, check it
  if (permission) {
    const hasPermission = isAdmin || permissions.includes(permission);
    if (!hasPermission) {
      return <Unauthorized />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;