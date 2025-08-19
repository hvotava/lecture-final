import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Paper,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import {
  People as PeopleIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  Assignment as LessonIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { dashboardAPI } from '../services/api';

// Types
interface DashboardStats {
  overview: {
    totalUsers: number;
    totalCompanies: number;
    totalTrainings: number;
    totalLessons: number;
    totalTests: number;
    recentUsers: number;
    recentTrainings: number;
  };
  usersByRole: Array<{ role: string; count: number }>;
  topCompanies: Array<{ id: number; name: string; userCount: number }>;
  activityChart: Array<{ date: string; users: number; trainings: number; lessons: number; tests: number }>;
  growth: {
    usersGrowth: string;
    trainingsGrowth: string;
  };
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  change?: string;
}

// Unified Stat Card Component
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, change }) => {
  return (
    <div className="card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-small text-muted font-medium mb-2">
              {title}
            </p>
            <h3 className="heading heading-3 font-bold mb-1" style={{ color }}>
              {value}
            </h3>
            {change && (
              <p className="text-small" style={{ 
                color: change.startsWith('+') ? 'var(--success)' : 'var(--error)' 
              }}>
                {change}
              </p>
            )}
          </div>
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <span style={{ color }} className="text-xl">
              {icon}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Chart colors matching theme
const CHART_COLORS = ['#FF7A00', '#0D1B2A', '#6366f1', '#f59e0b', '#10b981'];

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Chyba při načítání dashboard stats:', error);
        setError('Nepodařilo se načíst statistiky dashboardu');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-error">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted">
          Žádná data k zobrazení
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading heading-1 text-primary mb-2">
          Dashboard
        </h1>
        <p className="text-large text-muted">
          Vítejte zpět, {user?.name}! Zde je přehled vašeho systému.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <StatCard
          title="Celkem uživatelů"
          value={stats.overview.totalUsers.toLocaleString()}
          icon={<PeopleIcon />}
          color="#6366f1"
          change={stats.growth.usersGrowth}
        />
        <StatCard
          title="Společnosti"
          value={stats.overview.totalCompanies.toLocaleString()}
          icon={<BusinessIcon />}
          color="#f59e0b"
        />
        <StatCard
          title="Školení"
          value={stats.overview.totalTrainings.toLocaleString()}
          icon={<SchoolIcon />}
          color="#10b981"
          change={stats.growth.trainingsGrowth}
        />
        <StatCard
          title="Lekce"
          value={stats.overview.totalLessons.toLocaleString()}
          icon={<LessonIcon />}
          color="#8b5cf6"
        />
        <StatCard
          title="Testy"
          value={stats.overview.totalTests.toLocaleString()}
          icon={<QuizIcon />}
          color="#ef4444"
        />
        <StatCard
          title="Aktivita"
          value={stats.overview.recentUsers.toLocaleString()}
          icon={<TrendingUpIcon />}
          color="#FF7A00"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="heading heading-4 text-primary">Aktivita v čase</h3>
            <p className="text-small text-muted">Denní statistiky za posledních 30 dní</p>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.activityChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    name="Uživatelé"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="trainings" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Školení"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tests" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Testy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Users by Role Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="heading heading-4 text-primary">Uživatelé podle rolí</h3>
            <p className="text-small text-muted">Rozložení uživatelů v systému</p>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.usersByRole}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ role, count, percent }) => `${role}: ${count} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.usersByRole.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Top Companies */}
      <div className="card">
        <div className="card-header">
          <h3 className="heading heading-4 text-primary">Top společnosti</h3>
          <p className="text-small text-muted">Společnosti s nejvíce uživateli</p>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            {stats.topCompanies.map((company, index) => (
              <div key={company.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-medium font-medium text-primary">
                      {company.name}
                    </h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-large font-semibold text-primary">
                    {company.userCount}
                  </span>
                  <p className="text-small text-muted">uživatelů</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="heading heading-4 text-primary">Rychlé akce</h3>
          <p className="text-small text-muted">Často používané funkce</p>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="btn btn-primary focus-ring">
              <PeopleIcon className="w-4 h-4" />
              Nový uživatel
            </button>
            <button className="btn btn-secondary focus-ring">
              <SchoolIcon className="w-4 h-4" />
              Nové školení
            </button>
            <button className="btn btn-secondary focus-ring">
              <QuizIcon className="w-4 h-4" />
              Nový test
            </button>
            <button className="btn btn-secondary focus-ring">
              <TrendingUpIcon className="w-4 h-4" />
              Zobrazit analýzy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 