import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  switch (user?.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'supervisor':
      return <Navigate to="/supervisor" replace />;
    case 'caller':
    default:
      return <Navigate to="/caller" replace />;
  }
};

export default Index;
