const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const { LessonSession, User, Lesson } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/lesson-sessions - Get all lesson sessions
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', userId, lessonId } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { sessionId: { [Op.iLike]: `%${search}%` } },
        { phase: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    if (lessonId) {
      whereConditions.lessonId = lessonId;
    }

    const sessions = await LessonSession.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Lesson,
          attributes: ['id', 'title', 'description']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      sessions: sessions.rows,
      total: sessions.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(sessions.count / limit)
    });
  } catch (error) {
    console.error('Error fetching lesson sessions:', error);
    res.status(500).json({ error: 'Failed to fetch lesson sessions' });
  }
});

// GET /api/lesson-sessions/:id - Get specific lesson session
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

    res.json(session);
  } catch (error) {
    console.error('Error fetching lesson session:', error);
    res.status(500).json({ error: 'Failed to fetch lesson session' });
  }
});

// GET /api/lesson-sessions/user/:userId - Get sessions for specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user can access this data (admin or own data)
    const isAdmin = req.user.role === 'admin';
    const isOwnData = req.user.id === parseInt(userId);

    if (!isAdmin && !isOwnData) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const sessions = await LessonSession.findAndCountAll({
      where: { userId: userId },
      include: [
        {
          model: Lesson,
          attributes: ['id', 'title', 'description']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      sessions: sessions.rows,
      total: sessions.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(sessions.count / limit)
    });
  } catch (error) {
    console.error('Error fetching user lesson sessions:', error);
    res.status(500).json({ error: 'Failed to fetch lesson sessions' });
  }
});

// GET /api/lesson-sessions/stats/overview - Get overview statistics
router.get('/stats/overview', auth, adminOnly, async (req, res) => {
  try {
    const totalSessions = await LessonSession.count();
    
    const completedSessions = await LessonSession.count({
      where: { phase: 'completed' }
    });

    const activeSessions = await LessonSession.count({
      where: { phase: { [Op.in]: ['introduction', 'content', 'test'] } }
    });

    const avgDuration = await LessonSession.findOne({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
      ],
      where: { 
        duration: { [Op.not]: null },
        phase: 'completed'
      }
    });

    const recentSessions = await LessonSession.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Lesson,
          attributes: ['id', 'title']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      totalSessions,
      completedSessions,
      activeSessions,
      averageDuration: avgDuration?.dataValues?.avgDuration || 0,
      recentSessions
    });
  } catch (error) {
    console.error('Error fetching lesson session stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// DELETE /api/lesson-sessions/:id - Delete lesson session
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const session = await LessonSession.findByPk(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Lesson session not found' });
    }

    await session.destroy();
    res.json({ message: 'Lesson session deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson session:', error);
    res.status(500).json({ error: 'Failed to delete lesson session' });
  }
});

module.exports = router; 