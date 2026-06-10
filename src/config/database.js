const { Sequelize } = require('sequelize');
const pg = require('pg'); // 👈 ADD THIS LINE

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectModule: pg, // 👈 ADD THIS
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  })
  : new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      dialectModule: pg, // 👈 ADD THIS
      logging: isProduction ? false : console.log,
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    }
  );

module.exports = { sequelize };