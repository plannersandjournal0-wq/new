import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import '@/App.css';
import AdminLogin from '@/pages/AdminLogin';
import Dashboard from '@/pages/Dashboard';
import PreviewStudio from '@/pages/PreviewStudio';
import CustomerViewer from '@/pages/CustomerViewer';
import TemplateManagement from '@/pages/TemplateManagement';
import AutomationOrders from '@/pages/AutomationOrders';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/login" />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/templates" element={
            <ProtectedRoute>
              <TemplateManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute>
              <AutomationOrders />
            </ProtectedRoute>
          } />
          <Route path="/admin/studio/:storybookId" element={
            <ProtectedRoute>
              <PreviewStudio />
            </ProtectedRoute>
          } />
          <Route path="/view/:slug" element={<CustomerViewer />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
