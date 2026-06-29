import { Outlet } from 'react-router-dom';
import { StoreProvider } from '../../contexts/StoreContext';
import { NotificationProvider } from '../../contexts/NotificationContext';
import DashboardLayout from './DashboardLayout';

export default function DashboardShell() {
  return (
    <StoreProvider>
      <NotificationProvider>
        <DashboardLayout>
          <Outlet />
        </DashboardLayout>
      </NotificationProvider>
    </StoreProvider>
  );
}
