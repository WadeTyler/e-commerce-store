import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';


export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({ message: "Unauthorized - No access token provided." });
    }

    try {
      // decode
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findOne({ _id: decoded.userId }).select("-password");

      if (!user) {
        return res.status(401).json({ message: "Unauthorized - User not found." });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Unauthorized - Access token expired." });
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error("Error in protectRoute: ", error);
    return res.status(500).json({ message: "Unauthorized - Server Error." });
  }
}

export const adminRoute = async (req, res, next) => {
  try {
    if (req.user && req.user.role === "admin") {
      next();
    }
    else {
      return res.status(403).json({ message: "Forbidden - Admin access required." });
    }
  } catch (error) {
    console.error("Error in adminRoute: ", error);
    return res.status(500).json({ message: "Unauthorized - Server Error" });
  }
}