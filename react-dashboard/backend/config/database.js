const { Sequelize } = require('sequelize');
require('dotenv').config();

// Kontrola existence DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in Railway dashboard -> Variables');
  console.error('Example: postgresql://user:password@host:port/database');
  process.exit(1);
}

console.log('🔗 Connecting to database...');
console.log('Database URL provided:', process.env.DATABASE_URL ? 'Yes' : 'No');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

// Test připojení
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');
  })
  .catch(err => {
    console.error('❌ Unable to connect to database:', err.message);
  });

module.exports = sequelize; 