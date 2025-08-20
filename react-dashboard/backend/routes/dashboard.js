const express = require('express');
const { User, Company, Training, Lesson, Test, TestSession, Attempt } = require('../models');
const { auth, adminOnly } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const router = express.Router();

// DEBUG endpoint pro diagnostiku
router.get('/debug', auth, async (req, res) => {
  try {
    console.log('🔍 DEBUG: Dashboard debug endpoint called');
    console.log('🔍 User:', req.user ? { id: req.user.id, role: req.user.role, email: req.user.email } : 'No user');
    
    const basicCounts = {
      users: await User.count(),
      companies: await Company.count(),
      trainings: await Training.count(),
      lessons: await Lesson.count(),
      tests: await Test.count()
    };
    
    console.log('🔍 Basic counts:', basicCounts);
    
    res.json({
      user: req.user ? { id: req.user.id, role: req.user.role, email: req.user.email } : null,
      isAdmin: req.user?.role === 'admin',
      basicCounts,
      message: 'Debug info loaded successfully'
    });
  } catch (error) {
    console.error('🔍 DEBUG ERROR:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// GET dashboard statistiky (pouze pro admin)  
router.get('/stats', auth, (req, res, next) => {
  console.log('🔐 Dashboard stats auth check:', {
    user: req.user ? {
      id: req.user.id,
      email: req.user.email, 
      role: req.user.role,
      name: req.user.name
    } : 'No user',
    isAdmin: req.user?.role === 'admin'
  });
  next();
}, adminOnly, async (req, res) => {
  try {
    console.log('📊 Dashboard stats request from user:', req.user?.role, req.user?.email);
    
    // Základní počty
    const [
      totalUsers,
      totalCompanies,
      totalTrainings,
      totalLessons,
      totalTests,
      recentUsers,
      recentTrainings
    ] = await Promise.all([
      User.count(),
      Company.count(),
      Training.count(),
      Lesson.count(),
      Test.count(),
      User.count({
        where: {
          created_at: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Posledních 30 dní
          }
        }
      }),
      Training.count({
        where: {
          created_at: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Posledních 30 dní
          }
        }
      })
    ]);

    console.log('📊 Basic counts:', { totalUsers, totalCompanies, totalTrainings, totalLessons, totalTests });

    // Uživatelé podle rolí
    const usersByRole = await User.findAll({
      attributes: [
        'role',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['role']
    });

    // Společnosti s počtem uživatelů - použijeme raw query pro spolehlivost
    const companiesWithUsersRaw = await sequelize.query(`
      SELECT 
        c.id,
        c.name,
        COUNT(u.id) as "userCount"
      FROM companies c
      LEFT JOIN users u ON c.id = u."companyId"
      GROUP BY c.id, c.name
      ORDER BY COUNT(u.id) DESC
      LIMIT 5
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('📊 Companies with users raw result:', companiesWithUsersRaw);

    // Aktivita za posledních 7 dní
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const dayUsers = await User.count({
        where: {
          created_at: {
            [Op.between]: [startOfDay, endOfDay]
          }
        }
      });

      const dayTrainings = await Training.count({
        where: {
          created_at: {
            [Op.between]: [startOfDay, endOfDay]
          }
        }
      });

      last7Days.push({
        date: startOfDay.toISOString().split('T')[0],
        users: dayUsers,
        trainings: dayTrainings,
        lessons: 0, // Placeholder
        tests: 0    // Placeholder
      });
    }

    // Sestavení response
    const stats = {
      overview: {
        totalUsers,
        totalCompanies,
        totalTrainings,
        totalLessons,
        totalTests,
        recentUsers,
        recentTrainings
      },
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: parseInt(item.dataValues.count)
      })),
      topCompanies: companiesWithUsersRaw.map(company => ({
        id: company.id,
        name: company.name,
        userCount: parseInt(company.userCount)
      })),
      activityChart: last7Days,
      growth: {
        usersGrowth: recentUsers > 0 ? `+${recentUsers}` : '0',
        trainingsGrowth: recentTrainings > 0 ? `+${recentTrainings}` : '0'
      }
    };

    console.log('📊 Sending stats:', JSON.stringify(stats, null, 2));
    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics', details: error.message });
  }
});

// GET rychlé akce pro dashboard
router.get('/quick-actions', auth, adminOnly, async (req, res) => {
  try {
    // Posledních 5 uživatelů
    const recentUsers = await User.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Company,
          attributes: ['name']
        }
      ]
    });

    // Nejnovější školení
    const recentTrainings = await Training.findAll({
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: Company,
          attributes: ['name']
        }
      ]
    });

    res.json({
      recentUsers,
      recentTrainings
    });
  } catch (error) {
    console.error('Dashboard quick actions error:', error);
    res.status(500).json({ error: 'Failed to fetch quick actions' });
  }
});

module.exports = router; 