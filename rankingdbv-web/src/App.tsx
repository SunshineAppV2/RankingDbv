
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthLayout } from './layouts/AuthLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ChangePassword } from './pages/ChangePassword';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/members';
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
import { SystemMessages } from './pages/SystemMessages';
import { MasterTreasury } from './pages/MasterTreasury';
import { ClubAssignment } from './pages/admin/ClubAssignment';
import { AdminAchievements } from './pages/admin/Achievements';
import { MasterRequirements } from './pages/admin/MasterRequirements';
import { MasterSpecialties } from './pages/admin/MasterSpecialties';
import { RegionalRanking } from './pages/RegionalRanking';
import { RegionalDashboard } from './pages/reports/RegionalDashboard';
import { ClubDirectory } from './pages/ClubDirectory';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { CoordinatorApprovals } from './pages/CoordinatorApprovals';

import { CompleteProfile } from './pages/CompleteProfile';
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
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="ranking" element={<Ranking />} />
                <Route path="profile" element={<Profile />} />
                <Route path="specialties" element={<Specialties />} />
                <Route path="specialties-dashboard" element={<SpecialtiesDashboard />} />
                <Route path="activities" element={<Activities />} />
                <Route path="requirements" element={<Requirements />} />
                <Route path="store" element={<Store />} />
                <Route path="family" element={<FamilyDashboard />} />
                <Route path="financial" element={<FinancialDashboard />} />
                <Route path="child-activities" element={<ChildActivities />} />
                <Route path="alerts" element={<ParentAlerts />} />
                <Route path="minutes/review/:id" element={<MinuteDetails />} />

                {/* Leadership / Staff Routes (Councelors, Instructors, Directory) */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR', 'SECRETARY', 'TREASURER', 'COUNSELOR', 'INSTRUCTOR']} />}>
                  <Route path="members" element={<Members />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="meetings" element={<Meetings />} />
                  <Route path="events" element={<Events />} />
                </Route>

                {/* Director / Admin Routes */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR']} />}>
                  <Route path="units" element={<Units />} />
                </Route>

                {/* Secretary Routes */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR', 'SECRETARY']} />}>
                  <Route path="secretary" element={<Secretary />} />
                  <Route path="approvals" element={<Approvals />} />
                </Route>

                {/* Treasury Routes */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR', 'TREASURER']} />}>
                  <Route path="treasury" element={<Treasury />} />
                </Route>

                {/* Reports (Admin + Treasurer + Secretary) */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR', 'TREASURER', 'SECRETARY']} />}>
                  <Route path="reports" element={<Reports />} />
                </Route>

                {/* System Config (Admin Only) */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'ADMIN']} />}>
                  <Route path="settings" element={<Settings />} />
                  <Route path="hierarchy" element={<Hierarchy />} />
                  <Route path="system-messages" element={<SystemMessages />} />
                </Route>

                {/* Subscription Route (Accessible potentially by Admin/Director/Owner) */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'ADMIN', 'DIRECTOR']} />}>
                  <Route path="subscription" element={<SubscriptionPage />} />
                </Route>

                {/* Coordinator Routes */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER', 'COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA']} />}>
                  <Route path="regional-ranking" element={<RegionalRanking />} />
                  <Route path="regional-dashboard" element={<RegionalDashboard />} />
                  <Route path="clubs-directory" element={<ClubDirectory />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'COORDINATOR_REGIONAL', 'COORDINATOR_DISTRICT', 'COORDINATOR_AREA']} />}>
                  <Route path="coordinator-approvals" element={<CoordinatorApprovals />} />
                </Route>

                {/* Master Only Routes */}
                <Route element={<ProtectedRoute allowedRoles={['MASTER', 'OWNER']} />}>
                  <Route path="clubs" element={<Clubs />} />
                  <Route path="master-treasury" element={<MasterTreasury />} />
                  <Route path="club-assignment" element={<ClubAssignment />} />
                  <Route path="achievements" element={<AdminAchievements />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={['MASTER']} />}>
                  <Route path="master-requirements" element={<MasterRequirements />} />
                  <Route path="master-specialties" element={<MasterSpecialties />} />
                </Route>
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
