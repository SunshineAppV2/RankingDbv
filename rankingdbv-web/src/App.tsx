import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Ranking } from './pages/Ranking';
import { Clubs } from './pages/Clubs';
import { Activities } from './pages/Activities';
import { Profile } from './pages/Profile';
import { Units } from './pages/Units';
import { Meetings } from './pages/Meetings';
import { Specialties } from './pages/Specialties';
import { SpecialtiesDashboard } from './pages/SpecialtiesDashboard';
import { FamilyDashboard } from './pages/FamilyDashboard';
import { Store } from './pages/Store';
import { Treasury } from './pages/Treasury';
import { Events } from './pages/Events';
import { ParentAlerts } from './pages/ParentAlerts';
import { Secretary } from './pages/Secretary';
import { Classes } from './pages/Classes';
import { Settings } from './pages/Settings';
import { Approvals } from './pages/Approvals';
import { Hierarchy } from './pages/Hierarchy';

import { Requirements } from './pages/Requirements';
import { ChildActivities } from './pages/ChildActivities';
import { FinancialDashboard } from './pages/FinancialDashboard';
import { Reports } from './pages/Reports';
import { MinuteDetails } from './pages/MinuteDetails';

import { SocketProvider } from './contexts/SocketContext';

import { Toaster } from 'sonner';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Toaster position="top-center" richColors closeButton />
        <BrowserRouter>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="members" element={<Members />} />
                <Route path="ranking" element={<Ranking />} />
                <Route path="clubs" element={<Clubs />} />
                <Route path="activities" element={<Activities />} />
                <Route path="profile" element={<Profile />} />
                <Route path="units" element={<Units />} />
                <Route path="meetings" element={<Meetings />} />
                <Route path="classes" element={<Classes />} />
                <Route path="specialties" element={<Specialties />} />
                <Route path="specialties-dashboard" element={<SpecialtiesDashboard />} />
                <Route element={<ProtectedRoute allowedRoles={['OWNER', 'ADMIN']} />}>
                  <Route path="treasury" element={<Treasury />} />
                  <Route path="secretary" element={<Secretary />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="approvals" element={<Approvals />} />
                  <Route path="hierarchy" element={<Hierarchy />} />
                  <Route path="reports" element={<Reports />} />
                </Route>
                <Route path="events" element={<Events />} />
                <Route path="requirements" element={<Requirements />} />
                <Route path="store" element={<Store />} />
                <Route path="family" element={<FamilyDashboard />} />
                <Route path="financial" element={<FinancialDashboard />} />

                {/* Parent Routes */}
                <Route path="child-activities" element={<ChildActivities />} />
                <Route path="alerts" element={<ParentAlerts />} />
                <Route path="minutes/review/:id" element={<MinuteDetails />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
