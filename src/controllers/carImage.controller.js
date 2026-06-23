const { Car, CarImage } = require('../models/index');
const { deleteFromCloudinary } = require('../config/cloudinary');

// POST /api/cars/:id/images
// Body: { images: [{ url, publicId, isPrimary? }, ...] }
// You upload to Cloudinary from your app/frontend, then send us the URLs + publicIds.
const addCarImages = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { images } = req.body;
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'images must be a non-empty array of { url, publicId } objects',
      });
    }

    // Validate each entry has the required fields
    for (const img of images) {
      if (!img.url || !img.publicId) {
        return res.status(400).json({
          success: false,
          message: 'Each image must have a url and publicId',
        });
      }
    }

    const existingCount = await CarImage.count({ where: { carId: car.id } });
    const hasPrimary    = await CarImage.findOne({ where: { carId: car.id, isPrimary: true } });

    const created = await Promise.all(
      images.map((img, index) =>
        CarImage.create({
          carId:     car.id,
          url:       img.url,
          publicId:  img.publicId,
          isPrimary: !hasPrimary && index === 0, // first ever image = primary
          order:     existingCount + index,
        })
      )
    );

    return res.status(201).json({
      success: true,
      message: `${created.length} image(s) added`,
      data: { images: created },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/cars/:id/images
const getCarImages = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    const images = await CarImage.findAll({
      where: { carId: car.id },
      order: [['order', 'ASC']],
    });

    return res.json({ success: true, data: { images } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cars/:id/images/:imageId
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

    // Delete from Cloudinary then from DB
    await deleteFromCloudinary(image.publicId, 'image');
    const wasPrimary = image.isPrimary;
    await image.destroy();

    // Promote next image to primary if the deleted one was primary
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

// PATCH /api/cars/:id/images/:imageId/primary
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

    await CarImage.update({ isPrimary: false }, { where: { carId: car.id } });
    await image.update({ isPrimary: true });

    return res.json({ success: true, message: 'Primary image updated', data: { image } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/cars/:id/images/reorder
// Body: { order: ["imageId1", "imageId2", ...] }
const reorderCarImages = async (req, res, next) => {
  try {
    const car = await Car.findByPk(req.params.id);
    if (!car) return res.status(404).json({ success: false, message: 'Car not found' });

    if (car.sellerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'order must be a non-empty array of image IDs',
      });
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
  addCarImages,
  getCarImages,
  deleteCarImage,
  setPrimaryImage,
  reorderCarImages,
};
