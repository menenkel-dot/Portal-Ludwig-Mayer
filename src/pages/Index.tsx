import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Warten auf die Initialisierung der Session
    const timeoutId = setTimeout(() => {
      if (session) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }, 100); // Kurze Verzögerung, um Flackern zu vermeiden

    return () => clearTimeout(timeoutId);
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Lade...</p>
    </div>
  );
};

export default Index;