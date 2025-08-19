import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect to login with signup mode
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('mode', 'signup');
    navigate(`/login?${searchParams.toString()}`, { replace: true });
  }, [navigate, location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-muted">Přesměrování na registraci...</p>
      </div>
    </div>
  );
};

export default RegisterPage; 