import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './shared/context/AuthContext';
import ProtectedRoute from './shared/components/ProtectedRoute';

import Login from './features/auth/Login';
import Register from './features/auth/Register';
import OAuthCallback from './features/auth/OAuthCallback';
import Dashboard from './features/dashboard/Dashboard';
import RepoList from './features/repository/RepoList';
import RepoDetails from './features/repository/RepoDetails';
import GraphView from './features/graph/GraphView';
import FullGraphView from './features/graph/FullGraphView';
import AIInsights from './features/ai/AIInsights';
import SummaryView from './features/summary/SummaryView';
import NotFound1 from './components/ui/8bit-not-found1';
import LandingPage from './features/landing/LandingPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/auth/verified" element={<Login />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/repositories" element={<RepoList />} />
            <Route path="/repositories/:id" element={<RepoDetails />} />
            <Route path="/graph" element={<GraphView />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/summary" element={<SummaryView />} />
          </Route>

          {/* Fullscreen authenticated routes */}
          <Route element={<ProtectedRoute noLayout />}>
            <Route path="/graph/full/:id" element={<FullGraphView />} />
          </Route>

          <Route path="/" element={<LandingPage />} />

          {/* 404 Fallback Route */}
          <Route path="*" element={<NotFound1 />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
