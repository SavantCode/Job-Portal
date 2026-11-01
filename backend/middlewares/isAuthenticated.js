import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({
                message: "User not authenticated",
                success: false,
            });
        }
        const decode = jwt.verify(token, process.env.SECRET_KEY);
        if (!decode) {
            return res.status(401).json({
                message: "Invalid token",
                success: false
            });
        }
        req.id = decode.userId;
        req.role = decode.role;
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).json({
            message: "Session expired or invalid token. Please login again.",
            success: false
        });
    }
};

export const isRecruiter = async (req, res, next) => {
    try {
        if (req.role === "recruiter") {
            return next();
        }
        const user = await User.findById(req.id).select("role");
        if (!user || user.role !== "recruiter") {
            return res.status(403).json({
                message: "Access denied. Recruiter privileges required.",
                success: false
            });
        }
        req.role = user.role;
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Authorization check failed.",
            success: false
        });
    }
};

export default isAuthenticated;