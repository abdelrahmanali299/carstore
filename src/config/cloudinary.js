const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Shared 3D Models (sedan/suv/truck generic) ──
const modelStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'carstore/3d-models',
    resource_type: 'raw',
    allowed_formats: ['glb', 'gltf'],
    public_id: (req, file) => `model_${req.body.modelType || 'default'}_${Date.now()}`,
  },
});

// ── Per-Car 3D Model (e.g. Mercedes C40 specific model) ──
const carModelStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'carstore/car-models',
    resource_type: 'raw',
    allowed_formats: ['glb', 'gltf'],
    public_id: (req, file) => `car_model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  },
});

// ── Car Images ──
const carImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'carstore/car-images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 800, crop: 'fill', quality: 'auto' }],
    public_id: (req, file) => `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  },
});

// ── Avatars ──
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'carstore/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
    public_id: (req, file) => `avatar_${req.user.id}_${Date.now()}`,
  },
});

const uploadModel = multer({
  storage: modelStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

// Per-car 3D model — single file field named "model3d"
const uploadCarModel = multer({
  storage: carModelStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
}).single('model3d');

const uploadCarImages = multer({
  storage: carImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('images', 10);

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('avatar');

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

const getModelUrl = async (modelType) => {
  try {
    const result = await cloudinary.search
      .expression(`folder:carstore/3d-models AND public_id:*model_${modelType}*`)
      .sort_by('created_at', 'desc')
      .max_results(1)
      .execute();
    return result.resources.length > 0 ? result.resources[0].secure_url : null;
  } catch (error) {
    console.error('Cloudinary search error:', error);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadModel,
  uploadCarModel,
  uploadCarImages,
  uploadAvatar,
  deleteFromCloudinary,
  getModelUrl,
};
