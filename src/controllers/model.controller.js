const { CarModel3D, Car } = require('../models/index');
const { deleteFromCloudinary } = require('../config/cloudinary');
const { sequelize } = require('../config/database');

// ================================
// GET ALL 3D MODELS
// GET /api/models
// ================================
const getModels = async (req, res, next) => {
  try {
    const models = await CarModel3D.findAll({ order: [['modelType', 'ASC']] });
    return res.json({ success: true, data: { models } });
  } catch (error) {
    next(error);
  }
};

// ================================
// GET SINGLE 3D MODEL BY TYPE
// GET /api/models/sedan
// ================================
const getModelByType = async (req, res, next) => {
  try {
    const { modelType } = req.params;
    const model = await CarModel3D.findOne({ where: { modelType } });
    if (!model) return res.status(404).json({ success: false, message: `No 3D model found for type: ${modelType}` });
    return res.json({ success: true, data: { model } });
  } catch (error) {
    next(error);
  }
};

// ================================
// UPLOAD / REPLACE 3D MODEL (Admin only)
// POST /api/models/upload
// Body: modelType (sedan|suv|truck), displayName
// File: model (.glb)
// ================================
const uploadModel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No 3D model file uploaded' });
    }

    const { modelType, displayName } = req.body;
    if (!modelType) {
      return res.status(400).json({ success: false, message: 'modelType is required (sedan | suv | truck)' });
    }

    const cloudinaryUrl = req.file.path;      // Cloudinary secure URL
    const cloudinaryPublicId = req.file.filename; // Cloudinary public_id

    // Check if a model of this type already exists
    const existing = await CarModel3D.findOne({ where: { modelType } });

    if (existing) {
      // Delete old model from Cloudinary
      await deleteFromCloudinary(existing.publicId, 'raw');

      // Update the record
      await existing.update({
        url: cloudinaryUrl,
        publicId: cloudinaryPublicId,
        displayName: displayName || existing.displayName,
      });

      // Update all cars that use this model type → point to new URL
      await Car.update(
        { model3dUrl: cloudinaryUrl, model3dPublicId: cloudinaryPublicId },
        { where: { modelType } }
      );

      return res.json({
        success: true,
        message: `3D model for "${modelType}" replaced successfully`,
        data: { model: existing },
      });
    }

    // Create new model record
    const model = await CarModel3D.create({
      modelType,
      url: cloudinaryUrl,
      publicId: cloudinaryPublicId,
      displayName: displayName || modelType,
    });

    return res.status(201).json({
      success: true,
      message: `3D model for "${modelType}" uploaded successfully`,
      data: { model },
    });
  } catch (error) {
    next(error);
  }
};

// ================================
// UPDATE MODEL THUMBNAIL
// PATCH /api/models/:modelType/thumbnail
// ================================
const updateThumbnail = async (req, res, next) => {
  try {
    const { modelType } = req.params;
    const model = await CarModel3D.findOne({ where: { modelType } });
    if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No thumbnail image uploaded' });
    }

    await model.update({ thumbnailUrl: req.file.path });

    return res.json({ success: true, message: 'Thumbnail updated', data: { model } });
  } catch (error) {
    next(error);
  }
};

// ================================
// DELETE 3D MODEL (Admin only)
// DELETE /api/models/:modelType
// ================================
const deleteModel = async (req, res, next) => {
  try {
    const { modelType } = req.params;
    const model = await CarModel3D.findOne({ where: { modelType } });
    if (!model) return res.status(404).json({ success: false, message: 'Model not found' });

    await deleteFromCloudinary(model.publicId, 'raw');
    await model.destroy();

    // Null out the model URL on all cars that used this type
    await Car.update({ model3dUrl: null, model3dPublicId: null }, { where: { modelType } });

    return res.json({ success: true, message: `3D model for "${modelType}" deleted` });
  } catch (error) {
    next(error);
  }
};

module.exports = { getModels, getModelByType, uploadModel, updateThumbnail, deleteModel };
