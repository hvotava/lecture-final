import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Avatar,
  Button,
  Chip,
  IconButton,
  AppBar,
  Toolbar,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Quiz as QuizIcon,
  Analytics as AnalyticsIcon,
  Business as BusinessIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Person as UserIcon,
  Menu as MenuIcon,
  Assignment as AssignmentIcon,
  CloudUpload as CloudUploadIcon,
  Psychology as PsychologyIcon,
  Insights as InsightsIcon,
  PersonSearch as PersonSearchIcon,
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { canManageUsers, canManageCompanies, canManageTrainings, canViewAllData, getRoleDisplayName, getRoleColor } from '../utils/permissions';

const drawerWidth = 280;

// Menu items definované dynamicky podle oprávnění
const getMenuItems = (user: any) => {
  if (!user) return [];
  
  const items = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', show: true },
  ];

  // Placement test je zastaralý - AI Tutor dělá placement automaticky
  // if (!user.placement_completed) {
  //   items.push(
  //     { text: 'Placement Test', icon: <AssignmentIcon />, path: '/placement-test', show: true }
  //   );
  // }

  // Review Dashboard pro všechny uživatele (kteří už začali učení)
  if (user.placement_completed) {
    items.push(
      { text: 'Review Dashboard', icon: <RefreshIcon />, path: '/review-dashboard', show: true },
      { text: 'Výsledky testů', icon: <AnalyticsIcon />, path: '/test-results', show: true }
    );
  }

  // Role-based menu items
  if (canManageUsers(user.role)) {
    items.push(
      { text: 'Správa uživatelů', icon: <AdminIcon />, path: '/user-management', show: true }
    );
  }

  if (canManageCompanies(user.role)) {
    items.push(
      { text: 'Společnosti', icon: <BusinessIcon />, path: '/companies', show: true }
    );
  }

  if (canManageTrainings(user.role)) {
    items.push(
      { text: 'Školení', icon: <SchoolIcon />, path: '/trainings', show: true },
      { text: 'Lekce', icon: <SchoolIcon />, path: '/lessons', show: true },
      { text: 'Testy', icon: <QuizIcon />, path: '/tests', show: true },
      { text: 'Správa obsahu', icon: <CloudUploadIcon />, path: '/content-management', show: true }
    );
  }

  // Basic users section
  if (!canManageUsers(user.role)) {
    items.push(
      { text: 'Uživatelé', icon: <PeopleIcon />, path: '/users', show: true }
    );
  }

  // Moje školení pro regular users
  if (user.role === 'regular_user') {
    items.push(
      { text: 'Moje školení', icon: <SchoolIcon />, path: '/trainings', show: true }
    );
  }

  // Analytics pro všechny uživatele s daty
  if (canViewAllData(user.role)) {
    items.push(
      { text: 'Analýzy', icon: <AnalyticsIcon />, path: '/analytics', show: true },
      { text: 'Analýzy pokroku', icon: <InsightsIcon />, path: '/progress-analytics', show: true },
      { text: 'Analýzy uživatelů', icon: <PersonSearchIcon />, path: '/user-progress-analytics', show: true }
    );
  }

  // Generátor testů a WebRTC demo pro všechny
  items.push(
    { text: 'AI Generátor testů', icon: <PsychologyIcon />, path: '/ai-test-generator', show: true },
    { text: 'WebRTC Demo', icon: <PhoneIcon />, path: '/webrtc-demo', show: true },
    { text: 'Správce otázek', icon: <QuizIcon />, path: '/question-manager', show: true }
  );

  return items.filter(item => item.show);
};

interface ResponsiveSidebarProps {
  children: React.ReactNode;
}

const ResponsiveSidebar: React.FC<ResponsiveSidebarProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const menuItems = getMenuItems(user);

  // Import theme CSS pro unified styling
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@import url('/src/ui/theme.css');`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const drawer = (
    <div className="h-full bg-surface border-r border-gray-200 flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <div>
            <h1 className="heading heading-5 text-primary mb-0">AI Lektor</h1>
            <p className="text-small text-muted">Dashboard</p>
          </div>
        </div>
      </div>

      {/* User Profile Section */}
      {user && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-medium font-medium text-primary truncate">
                {user.username}
              </p>
              <p className="text-small text-muted">
                {user.email}
              </p>
            </div>
          </div>
          
          {/* Role Badge */}
          <div className="flex items-center justify-between">
            <span 
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${getRoleColor(user.role)}20`,
                color: getRoleColor(user.role),
                border: `1px solid ${getRoleColor(user.role)}40`
              }}
            >
              {getRoleDisplayName(user.role)}
            </span>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200
                  focus-ring
                  ${isActive 
                    ? 'bg-accent text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-primary'
                  }
                `}
              >
                <span className={`text-lg ${isActive ? 'text-white' : 'text-gray-500'}`}>
                  {item.icon}
                </span>
                <span className="text-medium font-medium">
                  {item.text}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="btn btn-secondary w-full focus-ring"
        >
          <LogoutIcon className="w-4 h-4" />
          Odhlásit se
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface">
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-dark rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <h1 className="heading heading-6 text-primary">AI Lektor</h1>
            </div>
            <button
              onClick={handleDrawerToggle}
              className="p-2 rounded-lg hover:bg-gray-100 focus-ring"
            >
              <MenuIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="w-80 flex-shrink-0">
          {drawer}
        </div>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <>
          {/* Overlay */}
          {mobileOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleDrawerToggle}
            />
          )}
          
          {/* Drawer */}
          <div className={`
            fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}>
            {drawer}
          </div>
        </>
      )}

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isMobile ? 'pt-16' : ''}`}>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ResponsiveSidebar; 