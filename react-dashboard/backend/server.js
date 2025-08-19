const express = require('express');
const expressWs = require('express-ws');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
// Enable WebSocket support for Railway - POUZE na hlavním portu!
const server = require('http').createServer(app);
const wsInstance = expressWs(app, server);

// CRITICAL: Ujistíme se, že express-ws je správně připojen
console.log('🔌 Express-WS inicializováno:', !!wsInstance);
console.log('🔌 WebSocket server připojen:', !!wsInstance.getWss());
const PORT = process.env.PORT || 5000;

// CRITICAL: Trust proxy for Railway deployment (fixes X-Forwarded-For error)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  // Fix for Railway proxy
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/api/health') // Skip health checks
});
app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  abortOnLimit: true,
  responseOnLimit: 'File size too large'
}));

// Serve static assets from the React build folder
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

// Database connection
const { sequelize, User, Company } = require('./models');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'react-dashboard-backend',
    version: '1.0.0'
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const twilioRoutes = require('./routes/twilio');
const webrtcRoutes = require('./routes/webrtc');
// WebSocket handler - using Express-WS instead of custom handler
// const { setupTwilioWebSocket } = require('./websocket/twilioStream');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users-management', require('./routes/users-management'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/trainings', require('./routes/trainings'));
app.use('/api/lessons', require('./routes/lessons'));
app.use('/api/tests', require('./routes/tests'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/twilio', twilioRoutes);
app.use('/api/webrtc', webrtcRoutes);
app.use('/api/twilio/webrtc', require('./routes/twilio-webrtc').router);
app.use('/api/content', require('./routes/content'));
app.use('/api/ai-proxy', require('./routes/ai-proxy'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/ai-test-generator', require('./routes/ai-test-generator'));
app.use('/api/admin', require('./routes/admin'));

// AI Tutor API Proxy - forward these paths to Python backend
const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'https://lecture-app-production.up.railway.app';

// Placement Test API
app.all('/api/placement-test/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/placement-test', '');
    console.log(`🔄 Proxying ${req.method} /api/placement-test${path} to Python backend`);
    const response = await require('axios')({
      method: req.method,
      url: `${pythonBackendUrl}/api/placement-test${path}`,
      data: req.body,
      params: req.query,
      timeout: 30000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Placement test proxy error:', error.message);
    console.error('Error details:', error.response?.data);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

// Courses API - DISABLED: Using local courses route instead of Python backend
// app.all('/api/courses/*', async (req, res) => {
//   try {
//     const path = req.path.replace('/api/courses', '');
//     console.log(`🔄 Proxying ${req.method} /api/courses${path} to Python backend`);
//     const response = await require('axios')({
//       method: req.method,
//       url: `${pythonBackendUrl}/api/courses${path}`,
//       data: req.body,
//       params: req.query,
//       timeout: 30000
//     });
//     res.json(response.data);
//   } catch (error) {
//     console.error('Courses proxy error:', error.message);
//     console.error('Error details:', error.response?.data);
//     res.status(error.response?.status || 500).json({
//       error: error.response?.data?.error || error.message
//     });
//   }
// });

// Analytics API
app.all('/api/analytics/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/analytics', '');
    console.log(`🔄 Proxying ${req.method} /api/analytics${path} to Python backend`);
    const response = await require('axios')({
      method: req.method,
      url: `${pythonBackendUrl}/api/analytics${path}`,
      data: req.body,
      params: req.query,
      timeout: 30000
    });
    res.json(response.data);
  } catch (error) {
    console.error('Analytics proxy error:', error.message);
    console.error('Error details:', error.response?.data);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

// Specific AI Lesson endpoints (questions generation)
app.post('/api/lessons/:lessonId/generate-questions', async (req, res) => {
  try {
    console.log(`🔄 Proxying lesson questions generation to Python backend`);
    const response = await require('axios').post(
      `${pythonBackendUrl}/api/lessons/${req.params.lessonId}/generate-questions`,
      req.body,
      { timeout: 30000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Generate questions proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

app.get('/api/lessons/:lessonId/questions', async (req, res) => {
  try {
    console.log(`🔄 Proxying lesson questions get to Python backend`);
    const response = await require('axios').get(
      `${pythonBackendUrl}/api/lessons/${req.params.lessonId}/questions`,
      { timeout: 30000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Get questions proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

// Specific AI User endpoints (schedule-review, due-reviews)
app.post('/api/users/:userId/schedule-review', async (req, res) => {
  try {
    console.log(`🔄 Proxying user schedule review to Python backend`);
    const response = await require('axios').post(
      `${pythonBackendUrl}/api/users/${req.params.userId}/schedule-review`,
      req.body,
      { timeout: 30000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Schedule review proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

app.get('/api/users/:userId/due-reviews', async (req, res) => {
  try {
    console.log(`🔄 Proxying user due reviews to Python backend`);
    const response = await require('axios').get(
      `${pythonBackendUrl}/api/users/${req.params.userId}/due-reviews`,
      { timeout: 30000 }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Due reviews proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
});

// Funkce pro vytvoření admin účtu a migraci dat
const createDefaultAdmin = async () => {
  try {
    // Vytvoř výchozí společnost
    let defaultCompany = await Company.findOne({ where: { name: 'Default Company' } });
    if (!defaultCompany) {
      defaultCompany = await Company.create({
        name: 'Default Company'
      });
      console.log('✅ Default company created');
    }

    // Zkontroluj, jestli už admin s emailem existuje
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@lecture.app';
    let existingAdmin = await User.findOne({ where: { email: adminEmail } });
    
    if (existingAdmin) {
      console.log('✅ Admin account already exists');
      return;
    }

    // Zkontroluj, jestli existuje nějaký admin podle role
    const adminByRole = await User.findOne({ where: { role: 'admin' } });
    if (adminByRole && !adminByRole.email) {
      // Aktualizuj existujícího admina s emailem a heslem
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      await adminByRole.update({
        email: adminEmail,
        password: hashedPassword,
        companyId: defaultCompany.id
      });
      
      console.log('✅ Existing admin updated with email and password');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      return;
    }

    // Migrace existujících uživatelů bez emailu nebo hesla
    const usersNeedingMigration = await User.findAll({ 
      where: { 
        [require('sequelize').Op.or]: [
          { email: null },
          { password: null }
        ]
      } 
    });

    for (const user of usersNeedingMigration) {
      // Migrace starých rolí na nové
      let newRole = 'regular_user';
      if (user.role === 'admin') {
        newRole = 'admin';
      } else if (user.role === 'user') {
        newRole = 'regular_user';
      } else if (['superuser', 'contact_person', 'regular_user'].includes(user.role)) {
        newRole = user.role;
      }

      const updateData = {
        role: newRole,
        companyId: user.companyId || defaultCompany.id
      };

      // Vytvoř dočasný email, pokud chybí
      if (!user.email) {
        updateData.email = user.phone 
          ? `user_${user.phone.replace(/\D/g, '')}@temp.lecture.app`
          : `user_${user.id}@temp.lecture.app`;
      }

      // Vytvoř dočasné heslo, pokud chybí
      if (!user.password) {
        updateData.password = await bcrypt.hash('temp123', 12);
      }
      
      await user.update(updateData);
    }

    if (usersNeedingMigration.length > 0) {
      console.log(`✅ Updated ${usersNeedingMigration.length} existing users with temporary emails/passwords`);
    }

    // Vytvoř nového admin účtu, pokud žádný neexistuje
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      await User.create({
        name: 'Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        companyId: defaultCompany.id
      });

      console.log('🎉 Default admin account created!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log('⚠️  Please change the password after first login!');
    }
    
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync database (bez force, aby se data neztratila)
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized.');
    
    // Vytvoř výchozího admina
    await createDefaultAdmin();
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
      console.log(`🔥 DATABASE QUESTIONS DEPLOYMENT - Version 2025-08-06-16:48`);
      console.log(`📊 Dashboard API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 WebSocket ready for external connections`);
      
      // Debug Twilio configuration
      console.log(`📞 Twilio Configuration:`);
      console.log(`   - TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? 'SET' : 'NOT SET'}`);
      console.log(`   - TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET'}`);
      console.log(`   - TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'NOT SET'}`);
      
      // Debug OpenAI configuration
      console.log(`🤖 OpenAI Configuration:`);
      console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
      
      // Debug WebSocket routes
      console.log(`🔌 WebSocket routes:`);
      console.log(`   - wss://host/api/twilio/webrtc/test`);
      console.log(`   - wss://host/api/twilio/webrtc/stream/{callSid}`);
      console.log(`   - wss://host/api/twilio/webrtc/signaling/{clientId}`);
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
};

// Setup WebRTC WebSocket handler - now handled by Express-WS routes
// setupTwilioWebSocket(server);

startServer(); // Force Railway redeploy - Wed Aug  6 18:38:35 CEST 2025
// FORCE REDEPLOY - Wed Aug  6 22:27:56 CEST 2025
