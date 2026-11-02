import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is always loaded even if script is invoked from project root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DEFAULT_LOCAL_MONGO_URI = "mongodb://127.0.0.1:27017/jobportal";

// Enforce Mongoose Query & Filter Security Globally
mongoose.set("sanitizeFilter", true);
mongoose.set("strictQuery", true);

const resolveMongoUri = () => {
    const raw = (process.env.MONGO_URI || "").trim().replace(/^["']|["']$/g, "");
    if (raw.startsWith("mongodb://") || raw.startsWith("mongodb+srv://")) {
        return raw;
    }

    if (raw) {
        console.warn(
            `⚠️  Invalid MONGO_URI in backend/.env. Expected "mongodb://" or "mongodb+srv://". Falling back to local MongoDB: ${DEFAULT_LOCAL_MONGO_URI}`
        );
    } else {
        console.warn(
            `⚠️  MONGO_URI not set in backend/.env. Falling back to local MongoDB: ${DEFAULT_LOCAL_MONGO_URI}`
        );
    }

    return DEFAULT_LOCAL_MONGO_URI;
};

const connectDB = async () => {
    const uri = resolveMongoUri();
    try {
        await mongoose.connect(uri, {
            maxPoolSize: 20,
            serverSelectionTimeoutMS: 8000,
            socketTimeoutMS: 45000
        });
        console.log("✅ MongoDB connected successfully (sanitizeFilter & strictQuery enabled)");
        return true;
    } catch (error) {
        console.error("❌ MongoDB connection error:", error.message);
        console.info(
            "💡 Tip: Start your local MongoDB service (e.g. `net start MongoDB` or MongoDB Compass) OR set a valid MONGO_URI=mongodb+srv://... in backend/.env"
        );
        return false;
    }
};

export default connectDB;