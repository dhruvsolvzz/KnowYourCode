import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';

const ProtectedRoute = ({ noLayout = false }) => {
  const { user } = useAuth();

  if (!user) {
    // Redirect to login if user is not authenticated
    return <Navigate to="/login" replace />;
  }

  return noLayout ? <Outlet /> : <Layout />;
};

export default ProtectedRoute;
