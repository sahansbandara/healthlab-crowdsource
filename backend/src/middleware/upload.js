const path = require("path");
const multer = require("multer");
const fs = require("fs");

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "affiliation-proofs");
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  // dir may already exist
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".bin";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP) or PDF."), false);
  }
};

const uploadAffiliationProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single("affiliationProof");

// Post images: optional single image, images only
const POST_IMAGE_DIR = path.join(process.cwd(), "uploads", "post-images");
const POST_IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const POST_IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

try {
  fs.mkdirSync(POST_IMAGE_DIR, { recursive: true });
} catch (e) {}

const postImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, POST_IMAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const postImageFilter = (req, file, cb) => {
  if (POST_IMAGE_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid image type. Allowed: JPEG, PNG, GIF, WebP."), false);
  }
};

const uploadPostImage = multer({
  storage: postImageStorage,
  fileFilter: postImageFilter,
  limits: { fileSize: POST_IMAGE_MAX_SIZE },
}).single("image");

module.exports = { uploadAffiliationProof, uploadPostImage, UPLOAD_DIR };
