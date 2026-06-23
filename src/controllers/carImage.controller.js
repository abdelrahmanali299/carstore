const { Car, CarImage } = require('../models/index');
const { deleteFromCloudinary } = require('../config/cloudinary');

// POST /api/cars/:id/images  — upload 1–10 images for a car
const uploadCarImages = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    // Count existing images so we can set order correctly
    const existingCount = await CarImage.count({ where: { carId: car.id } });
    const hasPrimary   = await CarImage.findOne({ where: { carId: car.id, isPrimary: true } });

    const images = await Promise.all(
      req.files.map((file, index) =>
        CarImage.create({
          carId:     car.id,
          url:       file.path,       // Cloudinary secure URL
          publicId:  file.filename,   // Cloudinary public_id
          isPrimary: !hasPrimary && index === 0, // first ever upload = primary
          order:     existingCount + index,
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: `${images.length} image(s) uploaded`,
      data: { images },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/cars/:id/images  — list all images for a car
const getCarImages = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    const images = await CarImage.findAll({
      where:  { carId: car.id },
      order:  [['order', 'ASC']],
    });

    return res.json({ success: true, data: { images } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cars/:id/images/:imageId  — delete a single image
const deleteCarImage = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const image = await CarImage.findOne({
      where: { id: req.params.imageId, carId: car.id },
    });
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    // Remove from Cloudinary
    await deleteFromCloudinary(image.publicId, 'image');
    const wasPrimary = image.isPrimary;
    await image.destroy();

    // If deleted image was primary, promote the next one
    if (wasPrimary) {
      const next_ = await CarImage.findOne({
        where: { carId: car.id },
        order: [['order', 'ASC']],
      });
      if (next_) await next_.update({ isPrimary: true });
    }

    return res.json({ success: true, message: 'Image deleted' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/cars/:id/images/:imageId/primary  — set an image as primary
const setPrimaryImage = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const image = await CarImage.findOne({
      where: { id: req.params.imageId, carId: car.id },
    });
    if (!image) return res.status(404).json({ success: false, message: 'Image not found' });

    // Clear current primary, then set new one
    await CarImage.update({ isPrimary: false }, { where: { carId: car.id } });
    await image.update({ isPrimary: true });

    return res.json({ success: true, message: 'Primary image updated', data: { image } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/cars/:id/images/reorder  — reorder images
// Body: { order: ["imageId1", "imageId2", ...] }
const reorderCarImages = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { order } = req.body; // array of image IDs in desired order
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, message: 'order must be a non-empty array of image IDs' });
    }

    await Promise.all(
      order.map((imageId, index) =>
        CarImage.update({ order: index }, { where: { id: imageId, carId: car.id } })
      )
    );

    const images = await CarImage.findAll({
      where: { carId: car.id },
      order: [['order', 'ASC']],
    });

    return res.json({ success: true, message: 'Images reordered', data: { images } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadCarImages,
  getCarImages,
  deleteCarImage,
  setPrimaryImage,
  reorderCarImages,
};
