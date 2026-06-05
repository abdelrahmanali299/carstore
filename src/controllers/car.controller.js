const { Op } = require('sequelize');
const { Car, CarImage, CarModel3D, User } = require('../models/index');
const { deleteFromCloudinary } = require('../config/cloudinary');

// ================================
// GET ALL CARS (with filters)
// GET /api/cars?brand=Toyota&minPrice=5000&maxPrice=50000&condition=used
//              &modelType=sedan&city=Cairo&fuelType=gasoline
//              &minYear=2018&maxYear=2023&transmission=automatic
//              &sortBy=price&sortOrder=asc&page=1&limit=10
// ================================
const getCars = async (req, res, next) => {
  try {
    const {
      brand, model, condition, modelType, city, fuelType,
      transmission, driveType, color,
      minPrice, maxPrice, minYear, maxYear, minMileage, maxMileage,
      minRating, isFeatured,
      sortBy = 'createdAt', sortOrder = 'DESC',
      page = 1, limit = 10,
      search, // Full text search on brand + model
    } = req.query;

    const where = { status: 'available' };
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // ── Text search ──
    if (search) {
      where[Op.or] = [
        { brand: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // ── Exact filters ──
    if (brand) where.brand = { [Op.iLike]: `%${brand}%` };
    if (model) where.model = { [Op.iLike]: `%${model}%` };
    if (condition) where.condition = condition;
    if (modelType) where.modelType = modelType;
    if (city) where.city = { [Op.iLike]: `%${city}%` };
    if (fuelType) where.fuelType = fuelType;
    if (transmission) where.transmission = transmission;
    if (driveType) where.driveType = driveType;
    if (color) where.color = { [Op.iLike]: `%${color}%` };
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';

    // ── Range filters ──
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }
    if (minYear || maxYear) {
      where.year = {};
      if (minYear) where.year[Op.gte] = parseInt(minYear);
      if (maxYear) where.year[Op.lte] = parseInt(maxYear);
    }
    if (minMileage || maxMileage) {
      where.mileage = {};
      if (minMileage) where.mileage[Op.gte] = parseInt(minMileage);
      if (maxMileage) where.mileage[Op.lte] = parseInt(maxMileage);
    }
    if (minRating) {
      where.rating = { [Op.gte]: parseFloat(minRating) };
    }

    // ── Allowed sort fields ──
    const allowedSorts = ['price', 'year', 'mileage', 'rating', 'createdAt', 'viewCount'];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: cars } = await Car.findAndCountAll({
      where,
      include: [
        {
          model: CarImage,
          as: 'images',
          attributes: ['id', 'url', 'isPrimary', 'order'],
          separate: true,
          order: [['isPrimary', 'DESC'], ['order', 'ASC']],
        },
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'avatar', 'phone'],
        },
      ],
      order: [[sortField, sortDir]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        cars,
        pagination: {
          total: count,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(count / limitNum),
          hasNext: pageNum < Math.ceil(count / limitNum),
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// GET SINGLE CAR
// ================================
const getCarById = async (req, res, next) => {
  try {
    const car = await Car.findOne({
      where: { id: req.params.id, status: { [Op.ne]: 'hidden' } },
      include: [
        { model: CarImage, as: 'images', order: [['isPrimary', 'DESC'], ['order', 'ASC']] },
        { model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'avatar', 'phone'] },
      ],
    });

    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    // Increment view count
    await car.increment('viewCount');

    return res.json({ success: true, data: { car } });
  } catch (error) {
    next(error);
  }
};

// ================================
// CREATE CAR LISTING (Sell a car)
// ================================
// const createCar = async (req, res, next) => {
//   try {
//     const {
//       brand, model, year, trim, price, originalPrice, condition, mileage,
//       modelType, fuelType, transmission, driveType, engineSize, horsepower,
//       color, doors, seats, features, location, city, description,
//     } = req.body;

//     // Get the 3D model URL from DB based on modelType
//     const model3D = await CarModel3D.findOne({ where: { modelType } });

//     const car = await Car.create({
//       brand, model, year, trim,
//       price, originalPrice,
//       condition, mileage,
//       modelType,
//       model3dUrl: model3D?.url || null,
//       model3dPublicId: model3D?.publicId || null,
//       fuelType, transmission, driveType, engineSize, horsepower,
//       color, doors, seats,
//       features: features ? JSON.parse(features) : [],
//       location, city,
//       description,
//       sellerId: req.user.id,
//     });

//     // Handle uploaded images (from multer-cloudinary)
//     if (req.files && req.files.length > 0) {
//       const imageRecords = req.files.map((file, index) => ({
//         carId: car.id,
//         url: file.path,          // Cloudinary URL
//         publicId: file.filename, // Cloudinary public_id
//         isPrimary: index === 0,  // First image is primary
//         order: index,
//       }));
//       await CarImage.bulkCreate(imageRecords);
//     }

//     // Fetch car with images
//     const createdCar = await Car.findByPk(car.id, {
//       include: [{ model: CarImage, as: 'images' }],
//     });

//     return res.status(201).json({
//       success: true,
//       message: 'Car listed successfully',
//       data: { car: createdCar },
//     });
//   } catch (error) {
//     next(error);
//   }
// };
const createCar = async (req, res, next) => {
  try {
    const {
      brand, model, year, trim, price, originalPrice, condition, mileage,
      modelType, fuelType, transmission, driveType, engineSize, horsepower,
      color, doors, seats, features, location, city, description,
    } = req.body;

    // Get 3D model URL from uploaded file
    const model3dUrl = req.file ? req.file.path : null;
    const model3dPublicId = req.file ? req.file.filename : null;

    const car = await Car.create({
      brand, model, year, trim,
      price, originalPrice,
      condition, mileage,
      modelType: modelType || `${brand}_${model}`.toLowerCase().replace(/\s+/g, '_'),
      model3dUrl,
      model3dPublicId,
      fuelType, transmission, driveType, engineSize, horsepower,
      color, doors, seats,
      features: features ? JSON.parse(features) : [],
      location, city,
      description,
      sellerId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Car listed successfully',
      data: { car },
    });
  } catch (error) {
    next(error);
  }
};
// ================================
// UPDATE CAR
// ================================
const updateCar = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    // Only seller or admin can update
    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // If modelType changes, update the 3D model URL
    if (req.body.modelType && req.body.modelType !== car.modelType) {
      const model3D = await CarModel3D.findOne({ where: { modelType: req.body.modelType } });
      req.body.model3dUrl = model3D?.url || null;
      req.body.model3dPublicId = model3D?.publicId || null;
    }

    if (req.body.features && typeof req.body.features === 'string') {
      req.body.features = JSON.parse(req.body.features);
    }

    await car.update(req.body);

    return res.json({ success: true, message: 'Car updated', data: { car } });
  } catch (error) {
    next(error);
  }
};

// ================================
// DELETE CAR
// ================================
const deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id, {
      include: [{ model: CarImage, as: 'images' }],
    });
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Delete all images from Cloudinary
    for (const image of car.images) {
      await deleteFromCloudinary(image.publicId, 'image');
    }

    await car.destroy(); // Cascade deletes car images from DB

    return res.json({ success: true, message: 'Car listing deleted' });
  } catch (error) {
    next(error);
  }
};

// ================================
// GET FILTER OPTIONS (for filter screen)
// Returns distinct values for dropdowns
// ================================
const getFilterOptions = async (req, res, next) => {
  try {
    const [brands, cities, priceRange, yearRange] = await Promise.all([
      Car.findAll({
        attributes: [[Car.sequelize.fn('DISTINCT', Car.sequelize.col('brand')), 'brand']],
        where: { status: 'available' },
        raw: true,
      }),
      Car.findAll({
        attributes: [[Car.sequelize.fn('DISTINCT', Car.sequelize.col('city')), 'city']],
        where: { status: 'available', city: { [Op.ne]: null } },
        raw: true,
      }),
      Car.findOne({
        attributes: [
          [Car.sequelize.fn('MIN', Car.sequelize.col('price')), 'min'],
          [Car.sequelize.fn('MAX', Car.sequelize.col('price')), 'max'],
        ],
        where: { status: 'available' },
        raw: true,
      }),
      Car.findOne({
        attributes: [
          [Car.sequelize.fn('MIN', Car.sequelize.col('year')), 'min'],
          [Car.sequelize.fn('MAX', Car.sequelize.col('year')), 'max'],
        ],
        where: { status: 'available' },
        raw: true,
      }),
    ]);

    return res.json({
      success: true,
      data: {
        brands: brands.map((b) => b.brand).filter(Boolean),
        cities: cities.map((c) => c.city).filter(Boolean),
        conditions: ['new', 'used', 'certified_pre_owned'],
        modelTypes: ['sedan', 'suv', 'truck'],
        fuelTypes: ['gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'],
        transmissions: ['automatic', 'manual', 'cvt'],
        driveTypes: ['fwd', 'rwd', 'awd', '4wd'],
        priceRange,
        yearRange,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// GET FEATURED / RECOMMENDED CARS
// ================================
const getFeaturedCars = async (req, res, next) => {
  try {
    const cars = await Car.findAll({
      where: { status: 'available', isFeatured: true },
      include: [{ model: CarImage, as: 'images' }],
      order: [['rating', 'DESC']],
      limit: 10,
    });
    return res.json({ success: true, data: { cars } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCars, getCarById, createCar, updateCar, deleteCar, getFilterOptions, getFeaturedCars };
