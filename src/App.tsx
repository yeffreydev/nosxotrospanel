import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './components/layout/RequireAuth';
import { useAuth, ROLE_HOME } from './store/auth';
import Donate from './pages/Donate';
import Track from './pages/Track';
import Login from './pages/Login';
import Register from './pages/Register';
import Campaigns from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import OrganizerHome from './pages/organizer/OrganizerHome';
import CampaignForm from './pages/organizer/CampaignForm';
import CampaignPanel from './pages/organizer/CampaignPanel';
import DonorHome from './pages/donor/DonorHome';
import VolunteerHome from './pages/volunteer/VolunteerHome';
import ManagerHome from './pages/manager/ManagerHome';
import CensusWizard from './pages/registrar/CensusWizard';
import MapView from './pages/MapView';
import NotFound from './pages/NotFound';
import SuperAdmin from './pages/SuperAdmin';

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        {/* App de administración: sin home. La raíz lleva al login o al panel. */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/donar" element={<Donate />} />
        <Route path="/campanas" element={<Campaigns />} />
        <Route path="/campanas/:slug" element={<CampaignDetail />} />
        <Route path="/seguir" element={<Track />} />
        <Route path="/seguir/:code" element={<Track />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />

        {/* Donor */}
        <Route
          path="/donante"
          element={
            <RequireAuth roles={['DONOR']}>
              <DonorHome />
            </RequireAuth>
          }
        />
        {/* Campañas — gestionadas por el gestor / ONG */}
        <Route
          path="/organizador"
          element={
            <RequireAuth roles={['MANAGER', 'ADMIN']}>
              <OrganizerHome />
            </RequireAuth>
          }
        />
        <Route
          path="/organizador/nueva"
          element={
            <RequireAuth roles={['MANAGER', 'ADMIN']}>
              <CampaignForm />
            </RequireAuth>
          }
        />
        <Route
          path="/organizador/:id/editar"
          element={
            <RequireAuth roles={['MANAGER', 'ADMIN']}>
              <CampaignForm />
            </RequireAuth>
          }
        />
        <Route
          path="/organizador/:id"
          element={
            <RequireAuth roles={['MANAGER', 'ADMIN']}>
              <CampaignPanel />
            </RequireAuth>
          }
        />
        {/* Volunteer */}
        <Route
          path="/voluntario"
          element={
            <RequireAuth roles={['VOLUNTEER']}>
              <VolunteerHome />
            </RequireAuth>
          }
        />
        {/* Manager / Admin */}
        <Route
          path="/gestor"
          element={
            <RequireAuth roles={['MANAGER', 'ADMIN']}>
              <ManagerHome />
            </RequireAuth>
          }
        />
        {/* Registrar */}
        <Route
          path="/empadronar"
          element={
            <RequireAuth roles={['REGISTRAR', 'MANAGER', 'ADMIN']}>
              <CensusWizard />
            </RequireAuth>
          }
        />
        {/* Shared map */}
        <Route
          path="/mapa"
          element={
            <RequireAuth>
              <MapView />
            </RequireAuth>
          }
        />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>

      {/* Herramienta de superadministración (auth propia por variables de entorno) */}
      <Route path="/superadmin" element={<SuperAdmin />} />
    </Routes>
  );
}

// Raíz: autenticado → su panel; si no → login.
function RootRedirect() {
  const { user } = useAuth();
  const dest = user ? ROLE_HOME[user.role] ?? '/login' : '/login';
  return <Navigate to={dest} replace />;
}
