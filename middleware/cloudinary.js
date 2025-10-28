const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const fileType = file.mimetype.split('/')[1] // 'jpeg', 'png', 'pdf', etc.
    let folder = 'crm_uploads/others'
    resource_type= 'auto'

    if (file.mimetype.startsWith('image/')) {
      folder = 'crm_uploads/images'
      resource_type= 'image'
    } else if (file.mimetype === 'application/pdf') {
      folder = 'crm_uploads/documents'
      resource_type = 'raw'
    }

    return {
      folder,
      resource_type, // Important for supporting both images & raw files
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx'],
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    }
  }
})


const upload = multer({ storage });

module.exports = { upload };
