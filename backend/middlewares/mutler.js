import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const ALLOWED_EXTENSIONS = new Set([
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".rtf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp"
]);

const uploadInstance = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB max upload size
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
            return cb(
                new Error("Unsupported file type. Allowed formats: PDF, Word (.docx, .doc), or Images (.png, .jpg, .webp).")
            );
        }
        cb(null, true);
    }
}).single("file");

export const singleUpload = (req, res, next) => {
    uploadInstance(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    success: false,
                    message: "File size exceeds the 10MB limit. Please upload a smaller file."
                });
            }
            return res.status(400).json({
                success: false,
                message: err.message || "File upload error."
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "Invalid file upload."
            });
        }
        next();
    });
};