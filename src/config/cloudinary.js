const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================================
// STORAGE: 3D Models (.glb, .gltf)
// ================================
const modelStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'carstore/3d-models',
    resource_type: 'raw', // Required for non-image files like .glb
    allowed_formats: ['glb', 'gltf'],
    // Models are named by type: sedan, suv, truck
    public_id: (req, file) => {
      const modelType = req.body.modelType || 'default';
      return `model_${modelType}_${Date.now()}`;
    },
  },
});

// ================================
// STORAGE: Car Images
// ================================
const carImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'carstore/car-images',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 800, crop: 'fill', quality: 'auto' }, // Optimize
    ],
    public_id: (req, file) => `car_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  },
});

// ================================
// STORAGE: User Avatars
// ================================
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'carstore/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' },
    ],
    public_id: (req, file) => `avatar_${req.user.id}_${Date.now()}`,
  },
});

// Multer upload instances
const uploadModel = multer({
  storage: modelStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for 3D models
});

const uploadCarImages = multer({
  storage: carImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per image
}).array('images', 10); // Max 10 images per car

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('avatar');

// Helper: delete a file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

// Helper: get 3D model URL by type
const getModelUrl = async (modelType) => {
  try {
    const result = await cloudinary.search
      .expression(`folder:carstore/3d-models AND public_id:*model_${modelType}*`)
      .sort_by('created_at', 'desc')
      .max_results(1)
      .execute();

    if (result.resources.length > 0) {
      return result.resources[0].secure_url;
    }
    return null;
  } catch (error) {
    console.error('Cloudinary search error:', error);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadModel,
  uploadCarImages,
  uploadAvatar,
  deleteFromCloudinary,
  getModelUrl,
};
