const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const { TrainingProgress, User, Training } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// GET /api/training-progress - Get all training progress records
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', userId, trainingId } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { status: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (userId) {
      whereConditions.userId = userId;
    }

    if (trainingId) {
      whereConditions.trainingId = trainingId;
    }

    const progressRecords = await TrainingProgress.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Training,
          attributes: ['id', 'name', 'description']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      progressRecords: progressRecords.rows,
      total: progressRecords.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(progressRecords.count / limit)
    });
  } catch (error) {
    console.error('Error fetching training progress:', error);
    res.status(500).json({ error: 'Failed to fetch training progress' });
  }
});

// GET /api/training-progress/:id - Get specific training progress
router.get('/:id', auth, adminOnly, async (req, res) => {
  try {
    const progress = await TrainingProgress.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'email']
        },
        {
          model: Training,
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!progress) {
      return res.status(404).json({ error: 'Training progress not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error fetching training progress:', error);
    res.status(500).json({ error: 'Failed to fetch training progress' });
  }
});

// GET /api/training-progress/user/:userId - Get progress for specific user
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

    const progressRecords = await TrainingProgress.findAndCountAll({
      where: { userId: userId },
      include: [
        {
          model: Training,
          attributes: ['id', 'name', 'description']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      progressRecords: progressRecords.rows,
      total: progressRecords.count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(progressRecords.count / limit)
    });
  } catch (error) {
    console.error('Error fetching user training progress:', error);
    res.status(500).json({ error: 'Failed to fetch training progress' });
  }
});

// DELETE /api/training-progress/:id - Delete training progress
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const progress = await TrainingProgress.findByPk(req.params.id);
    
    if (!progress) {
      return res.status(404).json({ error: 'Training progress not found' });
    }

    await progress.destroy();
    res.json({ message: 'Training progress deleted successfully' });
  } catch (error) {
    console.error('Error deleting training progress:', error);
    res.status(500).json({ error: 'Failed to delete training progress' });
  }
});

module.exports = router; 