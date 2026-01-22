import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { LeadsProvider } from "@/contexts/LeadsContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { CallerSidebar } from "@/components/caller/CallerSidebar";

import Login from "@/pages/Login";
import StartWork from "@/pages/caller/StartWork";
import LeadsList from "@/pages/caller/LeadsList";
import CallScreen from "@/pages/caller/CallScreen";
import CallHistory from "@/pages/caller/CallHistory";
import Insights from "@/pages/caller/Insights";
import Resources from "@/pages/caller/Resources";
import AdminDashboard from "@/pages/admin/Dashboard";
import SupervisorReview from "@/pages/supervisor/Review";
import ChangePassword from "@/pages/ChangePassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { profile, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user must change password
  if (profile?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    switch (profile.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'caller':
        return <Navigate to="/caller" replace />;
      case 'supervisor':
        return <Navigate to="/supervisor" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { profile, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? (
          <Navigate to={
            profile?.role === 'admin' ? '/admin' :
            profile?.role === 'supervisor' ? '/supervisor' :
            '/caller'
          } replace />
        ) : (
          <Login />
        )
      } />

      {/* Change Password Route */}
      <Route path="/change-password" element={
        isAuthenticated ? (
          profile?.must_change_password ? (
            <ChangePassword />
          ) : (
            <Navigate to={
              profile?.role === 'admin' ? '/admin' :
              profile?.role === 'supervisor' ? '/supervisor' :
              '/caller'
            } replace />
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* Caller Routes */}
      <Route path="/caller" element={
        <ProtectedRoute allowedRoles={['caller']}>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <CallerSidebar />
              <div className="flex-1 flex flex-col">
                <AppHeader />
                <StartWork />
              </div>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />
      <Route path="/caller/leads" element={
        <ProtectedRoute allowedRoles={['caller']}>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <CallerSidebar />
              <div className="flex-1 flex flex-col">
                <AppHeader />
                <LeadsList />
              </div>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />
      <Route path="/caller/call/:leadId" element={
        <ProtectedRoute allowedRoles={['caller']}>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <CallerSidebar />
              <div className="flex-1 flex flex-col">
                <AppHeader />
                <CallScreen />
              </div>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />
      <Route path="/caller/history" element={
        <ProtectedRoute allowedRoles={['caller']}>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <CallerSidebar />
              <div className="flex-1 flex flex-col">
                <AppHeader />
                <CallHistory />
              </div>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />
      <Route path="/caller/insights" element={
        <ProtectedRoute allowedRoles={['caller']}>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <CallerSidebar />
              <div className="flex-1 flex flex-col">
                <AppHeader />
                <Insights />
              </div>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />
      <Route path="/caller/resources/*" element={
        <ProtectedRoute allowedRoles={['caller']}>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <CallerSidebar />
              <div className="flex-1 flex flex-col">
                <AppHeader />
                <Resources />
              </div>
            </div>
          </SidebarProvider>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AppHeader />
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Supervisor Routes */}
      <Route path="/supervisor" element={
        <ProtectedRoute allowedRoles={['supervisor']}>
          <AppHeader />
          <SupervisorReview />
        </ProtectedRoute>
      } />

      {/* Default Route */}
      <Route path="/" element={
        isAuthenticated ? (
          <Navigate to={
            profile?.role === 'admin' ? '/admin' :
            profile?.role === 'supervisor' ? '/supervisor' :
            '/caller'
          } replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SessionProvider>
        <LeadsProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="dark min-h-screen bg-background">
                <AppRoutes />
              </div>
            </BrowserRouter>
          </TooltipProvider>
        </LeadsProvider>
      </SessionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
