import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import VendorSignup from './pages/VendorSignup';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminPoDetail } from './pages/admin/AdminPoDetail';
import { VendorManagement } from './pages/admin/VendorManagement';
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { VendorPoDetail } from './pages/vendor/VendorPoDetail';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/vendor-signup" element={<VendorSignup />} />

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/pos/:id"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPoDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/vendors"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <VendorManagement />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor/dashboard"
            element={
              <ProtectedRoute allowedRoles={['VENDOR']}>
                <VendorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vendor/pos/:id"
            element={
              <ProtectedRoute allowedRoles={['VENDOR']}>
                <VendorPoDetail />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
