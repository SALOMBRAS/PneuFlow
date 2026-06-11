import { Outlet } from 'react-router-dom';
import { StoreProvider } from '../../contexts/StoreContext';
import DashboardLayout from './DashboardLayout';

export default function DashboardShell() {
  return (
    <StoreProvider>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </StoreProvider>
  );
}
