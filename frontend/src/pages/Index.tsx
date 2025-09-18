// This component is no longer used - routing is handled in App.tsx
// Keeping for compatibility but the actual dashboard is in Dashboard.tsx

import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to dashboard which will handle authentication check
  return <Navigate to="/" replace />;
};

export default Index;
