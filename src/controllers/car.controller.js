const { Op } = require('sequelize');
const { Car, CarImage, CarModel3D, User } = require('../models/index');
const { deleteFromCloudinary } = require('../config/cloudinary');

// Shared include for images (ordered by isPrimary desc, then order asc)
const imageInclude = {
  model: CarImage,
  as: 'images',
  attributes: ['id', 'url', 'isPrimary', 'order'],
  required: false,
  separate: true,
  order: [['isPrimary', 'DESC'], ['order', 'ASC']],
};

// GET /api/cars
const getCars = async (req, res, next) => {
  try {
    const {
      brand, model, condition, modelType, city, fuelType,
      transmission, driveType, color,
      minPrice, maxPrice, minYear, maxYear, minMileage, maxMileage,
      minRating, isFeatured,
      sortBy = 'createdAt', sortOrder = 'DESC',
      page = 1, limit = 10, search,
    } = req.query;

    // const where = { status: 'available' };
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    if (search) {
      where[Op.or] = [
        { brand: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (brand) where.brand = { [Op.iLike]: `%${brand}%` };
    if (model) where.model = { [Op.iLike]: `%${model}%` };
    if (condition) where.condition = condition;
    if (modelType) where.modelType = { [Op.iLike]: `%${modelType}%` };
    if (city) where.city = { [Op.iLike]: `%${city}%` };
    if (fuelType) where.fuelType = fuelType;
    if (transmission) where.transmission = transmission;
    if (driveType) where.driveType = driveType;
    if (color) where.color = { [Op.iLike]: `%${color}%` };
    if (isFeatured !== undefined) where.isFeatured = isFeatured === 'true';

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
    if (minRating) where.rating = { [Op.gte]: parseFloat(minRating) };

    const allowedSorts = ['price', 'year', 'mileage', 'rating', 'createdAt', 'viewCount'];
    const sortField = allowedSorts.includes(sortBy) ? sortBy : 'createdAt';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows: cars } = await Car.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'seller',
          attributes: ['id', 'firstName', 'lastName', 'avatar', 'phone'],
        },
        imageInclude,
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

// GET /api/cars/:id
const getCarById = async (req, res, next) => {
  try {
    const car = await Car.findOne({
      where: { id: req.params.id, status: { [Op.ne]: 'hidden' } },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName', 'avatar', 'phone'] },
        imageInclude,
      ],
    });
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });
    await car.increment('viewCount');
    return res.json({ success: true, data: { car } });
  } catch (error) {
    next(error);
  }
};

// POST /api/cars — create car with its own 3D model
const createCar = async (req, res, next) => {
  try {
    const {
      brand, model, year, trim, price, originalPrice, condition, mileage,
      fuelType, transmission, driveType, engineSize, horsepower,
      color, doors, seats, features, location, city, description,
    } = req.body;

    // 3D model uploaded via multer → Cloudinary
    const model3dUrl = req.file ? req.file.path : null;
    const model3dPublicId = req.file ? req.file.filename : null;

    // Auto-generate modelType label from brand+model
    const modelType = `${brand}_${model}`.toLowerCase().replace(/\s+/g, '_');

    const car = await Car.create({
      brand, model, year, trim,
      price, originalPrice,
      condition, mileage,
      modelType,
      model3dUrl,
      model3dPublicId,
      fuelType, transmission, driveType, engineSize, horsepower,
      color, doors: doors || 4, seats: seats || 5,
      features: features ? (typeof features === 'string' ? JSON.parse(features) : features) : [],
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

// PATCH /api/cars/:id
const updateCar = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });
    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // If a new 3D model is uploaded, replace old one
    if (req.file) {
      if (car.model3dPublicId) {
        await deleteFromCloudinary(car.model3dPublicId, 'raw');
      }
      req.body.model3dUrl = req.file.path;
      req.body.model3dPublicId = req.file.filename;
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

// DELETE /api/cars/:id
const deleteCar = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });
    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    // Delete 3D model from Cloudinary
    if (car.model3dPublicId) {
      await deleteFromCloudinary(car.model3dPublicId, 'raw');
    }

    // Delete all car images from Cloudinary
    const images = await CarImage.findAll({ where: { carId: car.id } });
    await Promise.all(
      images.map((img) => deleteFromCloudinary(img.publicId, 'image').catch(() => { }))
    );

    await car.destroy(); // CarImage rows deleted via CASCADE
    return res.json({ success: true, message: 'Car deleted' });
  } catch (error) {
    next(error);
  }
};

// GET /api/cars/filter-options
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

// GET /api/cars/featured
const getFeaturedCars = async (req, res, next) => {
  try {
    const cars = await Car.findAll({
      where: { status: 'available', isFeatured: true },
      include: [
        { model: User, as: 'seller', attributes: ['id', 'firstName', 'lastName'] },
        imageInclude,
      ],
      order: [['rating', 'DESC']],
      limit: 10,
    });
    return res.json({ success: true, data: { cars } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCars, getCarById, createCar, updateCar, deleteCar, getFilterOptions, getFeaturedCars };
