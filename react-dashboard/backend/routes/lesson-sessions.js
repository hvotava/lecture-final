const express = require('express');
const { LessonSession, TestResult, User, Lesson } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET všechny lesson sessions (admin only)
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = search ? {
      lessonTitle: { [require('sequelize').Op.iLike]: `%${search}%` }
    } : {};

    const { count, rows } = await LessonSession.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['startedAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: Lesson,
          attributes: ['id', 'title', 'description'],
          required: false
        }
      ]
    });

    res.json({
      sessions: rows,
      totalSessions: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('Get lesson sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson sessions' });
  }
});

// GET session detail (admin only)
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const session = await LessonSession.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Lesson,
          attributes: ['id', 'title', 'description', 'content']
        }
      ]
    });

    if (!session) {
      return res.status(404).json({ error: 'Lesson session not found' });
    }

    // Get related test results
    const testResults = await TestResult.findAll({
      where: {
        userId: session.userId,
        testName: { [require('sequelize').Op.iLike]: `%${session.lessonTitle}%` }
      },
      order: [['completed_at', 'DESC']]
    });

    res.json({
      session,
      testResults
    });
  } catch (error) {
    console.error('Get lesson session detail error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson session detail' });
  }
});

// GET user's lesson sessions
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Check if user can access these sessions
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin' && req.user.role !== 'superuser') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessions = await LessonSession.findAll({
      where: { userId },
      order: [['startedAt', 'DESC']],
      include: [
        {
          model: Lesson,
          attributes: ['id', 'title', 'description']
        }
      ]
    });

    // Get test results for this user
    const testResults = await TestResult.findAll({
      where: { userId },
      order: [['completed_at', 'DESC']]
    });

    // Calculate statistics
    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === 'completed').length,
      averageScore: testResults.length > 0 ? 
        testResults.reduce((sum, r) => sum + r.percentage, 0) / testResults.length : 0,
      totalTestsCompleted: testResults.length
    };

    res.json({
      sessions,
      testResults,
      stats
    });
  } catch (error) {
    console.error('Get user lesson sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch user lesson sessions' });
  }
});

// GET lesson session statistics (admin only)
router.get('/stats/overview', auth, adminOnly, async (req, res) => {
  try {
    const totalSessions = await LessonSession.count();
    const completedSessions = await LessonSession.count({ where: { status: 'completed' } });
    const activeSessions = await LessonSession.count({ 
      where: { status: ['started', 'in_progress', 'testing'] }
    });

    const avgDuration = await LessonSession.findAll({
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('duration')), 'avgDuration']
      ],
      where: { status: 'completed' },
      raw: true
    });

    const testResults = await TestResult.findAll({
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('percentage')), 'avgScore'],
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'totalTests']
      ],
      raw: true
    });

    // Popular lessons
    const popularLessons = await LessonSession.findAll({
      attributes: [
        'lessonTitle',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'sessionCount']
      ],
      group: ['lessonTitle'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Recent activity
    const recentSessions = await LessonSession.findAll({
      limit: 10,
      order: [['startedAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['name']
        }
      ]
    });

    res.json({
      overview: {
        totalSessions,
        completedSessions,
        activeSessions,
        completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
        averageDuration: avgDuration[0]?.avgDuration ? Math.round(avgDuration[0].avgDuration / 60) : 0, // minutes
        averageScore: testResults[0]?.avgScore ? Math.round(testResults[0].avgScore) : 0,
        totalTests: testResults[0]?.totalTests || 0
      },
      popularLessons,
      recentSessions
    });
  } catch (error) {
    console.error('Get lesson session stats error:', error);
    res.status(500).json({ error: 'Failed to fetch lesson session statistics' });
  }
});

// DELETE lesson session (admin only)
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const session = await LessonSession.findByPk(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Lesson session not found' });
    }

    await session.destroy();
    
    res.json({ message: 'Lesson session deleted successfully' });
  } catch (error) {
    console.error('Delete lesson session error:', error);
    res.status(500).json({ error: 'Failed to delete lesson session' });
  }
});

module.exports = router; 