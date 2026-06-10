require('dotenv').config();
const { sequelize } = require('./database');

async function migrate() {
  const qi = sequelize.getQueryInterface();

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const tableDesc = await qi.describeTable('users');

    // Add isPhoneVerified if missing
    if (!tableDesc.isPhoneVerified) {
      await qi.addColumn('users', 'isPhoneVerified', {
        type: require('sequelize').DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
      console.log('✅ Added column: isPhoneVerified');
    } else {
      console.log('ℹ️  Column isPhoneVerified already exists');
    }

    // Add avatarPublicId if missing
    if (!tableDesc.avatarPublicId) {
      await qi.addColumn('users', 'avatarPublicId', {
        type: require('sequelize').DataTypes.STRING,
        allowNull: true,
      });
      console.log('✅ Added column: avatarPublicId');
    }

    // Add facebookId if missing
    if (!tableDesc.facebookId) {
      await qi.addColumn('users', 'facebookId', {
        type: require('sequelize').DataTypes.STRING,
        allowNull: true,
        unique: true,
      });
      console.log('✅ Added column: facebookId');
    }

    console.log('✅ Migration complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
