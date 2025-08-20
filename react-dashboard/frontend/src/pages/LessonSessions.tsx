import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  School as SchoolIcon,
  Person as PersonIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  PlayCircle as PlayCircleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface LessonSession {
  id: number;
  userId: number;
  lessonId: number;
  sessionId: string;
  lessonTitle: string;
  status: 'started' | 'in_progress' | 'testing' | 'completed' | 'abandoned';
  currentPhase: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  estimatedDuration?: number;
  testScore?: number;
  testPercentage?: number;
  correctAnswers: number;
  totalQuestions: number;
  User?: {
    id: number;
    name: string;
    email: string;
  };
  Lesson?: {
    id: number;
    title: string;
    description: string;
  };
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  completionRate: number;
  averageDuration: number;
  averageScore: number;
  totalTests: number;
}

const LessonSessions: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<LessonSession | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superuser') {
      fetchSessions();
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/lesson-sessions');
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error fetching lesson sessions:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/lesson-sessions/stats/overview');
      setStats(response.data.overview);
    } catch (error) {
      console.error('Error fetching session stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionDetail = async (sessionId: number) => {
    try {
      const response = await api.get(`/lesson-sessions/${sessionId}`);
      setSessionDetail(response.data);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Error fetching session detail:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'testing': return 'warning';
      case 'abandoned': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'started': return 'Začato';
      case 'in_progress': return 'Probíhá';
      case 'testing': return 'Test';
      case 'completed': return 'Dokončeno';
      case 'abandoned': return 'Opuštěno';
      default: return status;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('cs-CZ');
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superuser')) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Nemáte oprávnění k zobrazení session lekcí.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>Načítám session data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Session Lekcí
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Přehled a správa všech session AI Lektor systému
      </Typography>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SchoolIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.totalSessions}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Celkem Session
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.completedSessions}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Dokončeno ({stats.completionRate}%)
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TimeIcon color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.averageDuration} min</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Průměrná délka
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUpIcon color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5">{stats.averageScore}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Průměrné skóre
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Sessions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Nedávné Session
          </Typography>
          
          {isMobile ? (
            // Mobile Card View
            <Box>
              {sessions.map((session) => (
                <Card key={session.id} sx={{ mb: 2, border: 1, borderColor: 'divider' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="h6" component="div">
                        {session.lessonTitle}
                      </Typography>
                      <Chip 
                        label={getStatusText(session.status)}
                        color={getStatusColor(session.status) as any}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <PersonIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      {session.User?.name || 'Unknown User'}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      <TimeIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                      {formatDate(session.startedAt)}
                    </Typography>
                    
                    {session.testPercentage !== undefined && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        <QuizIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                        Skóre: {session.testPercentage}%
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          setSelectedSession(session);
                          fetchSessionDetail(session.id);
                        }}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // Desktop Table View
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Lekce</TableCell>
                    <TableCell>Uživatel</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Začátek</TableCell>
                    <TableCell>Délka</TableCell>
                    <TableCell>Skóre</TableCell>
                    <TableCell>Akce</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {session.lessonTitle}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <PersonIcon sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body2">
                              {session.User?.name || 'Unknown'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {session.User?.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusText(session.status)}
                          color={getStatusColor(session.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(session.startedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDuration(session.duration)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {session.testPercentage !== undefined ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {session.testPercentage}%
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={session.testPercentage} 
                              sx={{ width: 60, height: 4 }}
                            />
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            N/A
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Zobrazit detail">
                          <IconButton 
                            size="small"
                            onClick={() => {
                              setSelectedSession(session);
                              fetchSessionDetail(session.id);
                            }}
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Session Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detail Session: {selectedSession?.lessonTitle}
        </DialogTitle>
        <DialogContent>
          {sessionDetail && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Uživatel
                  </Typography>
                  <Typography variant="body1">
                    {sessionDetail.session.User?.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip 
                    label={getStatusText(sessionDetail.session.status)}
                    color={getStatusColor(sessionDetail.session.status) as any}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Začátek
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(sessionDetail.session.startedAt)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Dokončení
                  </Typography>
                  <Typography variant="body1">
                    {sessionDetail.session.completedAt ? 
                      formatDate(sessionDetail.session.completedAt) : 'Nedokončeno'}
                  </Typography>
                </Grid>
              </Grid>

              {sessionDetail.session.testPercentage !== undefined && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Výsledky testu
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Skóre
                      </Typography>
                      <Typography variant="h6">
                        {sessionDetail.session.correctAnswers}/{sessionDetail.session.totalQuestions}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Procenta
                      </Typography>
                      <Typography variant="h6">
                        {sessionDetail.session.testPercentage}%
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {sessionDetail.testResults && sessionDetail.testResults.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Historie testů
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Test</TableCell>
                        <TableCell>Skóre</TableCell>
                        <TableCell>Datum</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessionDetail.testResults.map((result: any) => (
                        <TableRow key={result.id}>
                          <TableCell>{result.testName}</TableCell>
                          <TableCell>{result.percentage}%</TableCell>
                          <TableCell>{formatDate(result.completed_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            Zavřít
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LessonSessions; 