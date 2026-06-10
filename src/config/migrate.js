require('dotenv').config();
const { sequelize } = require('./database');

async function migrate() {
  const qi = sequelize.getQueryInterface();
  const { DataTypes, QueryTypes } = require('sequelize');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    // Helper: check if table exists
    const tableExists = async (name) => {
      const result = await sequelize.query(
        `SELECT to_regclass('public."${name}"') AS exists`,
        { type: QueryTypes.SELECT }
      );
      return result[0].exists !== null;
    };

    // Helper: check if column exists
    const columnExists = async (table, column) => {
      const result = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = '${table}' AND column_name = '${column}'`,
        { type: QueryTypes.SELECT }
      );
      return result.length > 0;
    };

    // ================================
    // USERS TABLE
    // ================================
    if (!(await tableExists('users'))) {
      await qi.createTable('users', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        email: { type: DataTypes.STRING, allowNull: true, unique: true },
        password: { type: DataTypes.STRING, allowNull: true },
        firstName: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
        lastName: { type: DataTypes.STRING, allowNull: true },
        phone: { type: DataTypes.STRING, allowNull: true, unique: true },
        avatar: { type: DataTypes.TEXT, allowNull: true },
        avatarPublicId: { type: DataTypes.STRING, allowNull: true },
        googleId: { type: DataTypes.STRING, allowNull: true, unique: true },
        facebookId: { type: DataTypes.STRING, allowNull: true, unique: true },
        authProvider: { type: DataTypes.ENUM('local', 'google', 'facebook'), defaultValue: 'local' },
        isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
        isPhoneVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
        role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },
        refreshToken: { type: DataTypes.TEXT, allowNull: true },
        isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
      console.log('✅ Created table: users');
    } else {
      console.log('ℹ️  Table users exists — checking columns...');
      const missingCols = [
        ['isPhoneVerified', { type: DataTypes.BOOLEAN, defaultValue: false }],
        ['avatarPublicId', { type: DataTypes.STRING, allowNull: true }],
        ['facebookId', { type: DataTypes.STRING, allowNull: true }],
      ];
      for (const [col, def] of missingCols) {
        if (!(await columnExists('users', col))) {
          await qi.addColumn('users', col, def);
          console.log(`✅ Added column: users.${col}`);
        }
      }
    }

    // ================================
    // CARS TABLE
    // ================================
    if (!(await tableExists('cars'))) {
      await qi.createTable('cars', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        brand: { type: DataTypes.STRING, allowNull: false },
        model: { type: DataTypes.STRING, allowNull: false },
        year: { type: DataTypes.INTEGER, allowNull: false },
        trim: { type: DataTypes.STRING, allowNull: true },
        price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        originalPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
        condition: { type: DataTypes.ENUM('new', 'used', 'certified_pre_owned'), defaultValue: 'used' },
        mileage: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        modelType: { type: DataTypes.STRING, allowNull: true },
        model3dUrl: { type: DataTypes.TEXT, allowNull: true },
        model3dPublicId: { type: DataTypes.STRING, allowNull: true },
        fuelType: { type: DataTypes.ENUM('gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'), allowNull: true },
        transmission: { type: DataTypes.ENUM('automatic', 'manual', 'cvt'), allowNull: true },
        driveType: { type: DataTypes.ENUM('fwd', 'rwd', 'awd', '4wd'), allowNull: true },
        engineSize: { type: DataTypes.STRING, allowNull: true },
        horsepower: { type: DataTypes.INTEGER, allowNull: true },
        color: { type: DataTypes.STRING, allowNull: true },
        doors: { type: DataTypes.INTEGER, defaultValue: 4 },
        seats: { type: DataTypes.INTEGER, defaultValue: 5 },
        features: { type: DataTypes.JSONB, defaultValue: [] },
        location: { type: DataTypes.STRING, allowNull: true },
        city: { type: DataTypes.STRING, allowNull: true },
        country: { type: DataTypes.STRING, defaultValue: 'EG' },
        rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
        reviewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        status: { type: DataTypes.ENUM('available', 'sold', 'reserved', 'hidden'), defaultValue: 'available' },
        isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
        viewCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        sellerId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
        description: { type: DataTypes.TEXT, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
      console.log('✅ Created table: cars');
    } else {
      console.log('ℹ️  Table cars already exists');
    }

    // ================================
    // CAR_IMAGES TABLE
    // ================================
    if (!(await tableExists('car_images'))) {
      await qi.createTable('car_images', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        carId: { type: DataTypes.UUID, allowNull: false, references: { model: 'cars', key: 'id' }, onDelete: 'CASCADE' },
        url: { type: DataTypes.TEXT, allowNull: false },
        publicId: { type: DataTypes.STRING, allowNull: false },
        isPrimary: { type: DataTypes.BOOLEAN, defaultValue: false },
        order: { type: DataTypes.INTEGER, defaultValue: 0 },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
      console.log('✅ Created table: car_images');
    } else {
      console.log('ℹ️  Table car_images already exists');
    }

    // ================================
    // CAR_MODELS_3D TABLE
    // ================================
    if (!(await tableExists('car_models_3d'))) {
      await qi.createTable('car_models_3d', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        modelType: { type: DataTypes.ENUM('sedan', 'suv', 'truck'), allowNull: false, unique: true },
        url: { type: DataTypes.TEXT, allowNull: false },
        publicId: { type: DataTypes.STRING, allowNull: false },
        thumbnailUrl: { type: DataTypes.TEXT, allowNull: true },
        displayName: { type: DataTypes.STRING, allowNull: true },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
      console.log('✅ Created table: car_models_3d');
    } else {
      console.log('ℹ️  Table car_models_3d already exists');
    }

    // ================================
    // OTPS TABLE
    // ================================
    if (!(await tableExists('otps'))) {
      await qi.createTable('otps', {
        id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
        phone: { type: DataTypes.STRING, allowNull: false },
        otp: { type: DataTypes.STRING(6), allowNull: false },
        type: { type: DataTypes.ENUM('phone_verification', 'password_reset'), allowNull: false },
        expiresAt: { type: DataTypes.DATE, allowNull: false },
        isUsed: { type: DataTypes.BOOLEAN, defaultValue: false },
        attempts: { type: DataTypes.INTEGER, defaultValue: 0 },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updatedAt: { type: DataTypes.DATE, allowNull: false },
      });
      console.log('✅ Created table: otps');
    } else {
      console.log('ℹ️  Table otps already exists');
    }

    console.log('\n🎉 Migration complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
