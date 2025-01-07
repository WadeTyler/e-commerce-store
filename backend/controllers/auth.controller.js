import User from "../models/user.model.js";
import { redis } from "../lib/redis.js";
import jwt from "jsonwebtoken";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  });

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60); // 7 days
};

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, // prevents XSS attacks, cross site scripting attacks
    secure: process.env.NODE_ENV === "production", // only send cookie over HTTPS in production
    sameSite: "strict", // prevents CSRF attacks, cross-site request forgery 
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // prevents XSS attacks, cross site scripting attacks
    secure: process.env.NODE_ENV === "production", // only send cookie over HTTPS in production
    sameSite: "strict", // prevents CSRF attacks, cross-site request forgery 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

export const signup = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists." });
    }
  
    const user = await User.create({ name, email, password });

    // authenticate user
    const { accessToken, refreshToken } = generateTokens(user._id);

    // store refresh token in redis
    await storeRefreshToken(user._id, refreshToken);

    setCookies(res, accessToken, refreshToken);

    return res.status(201).json({ 
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role 
    });
  } catch (error) {
    console.log("Error in signup controller: ", error.message);
    return res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && await user.comparePassword(password)) {
       const { accessToken, refreshToken } = generateTokens(user._id);
       await storeRefreshToken(user._id, refreshToken);
       setCookies(res, accessToken, refreshToken);

       return res.status(201).json({ 
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role 
      });
    }

    else {
      return res.status(401).json({ message: "Invalid email or password." });
    }

  } catch (error) {
    console.log("Error in login controller: ", error.message);
    
    return res.status(500).json({ message: error.message });
  }

};

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      await redis.del(`refresh_token:${decoded.userId}`);
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    console.log("Error in logout controller: ", error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// this will refresh the access token
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided." });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userId = decoded.userId;
    const storedToken = await redis.get(`refresh_token:${userId}`);

    if (refreshToken !== storedToken) {
      return res.status(401).json({ message: "Invalid refresh token." });
    }

    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "15m",
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true, // prevents XSS attacks, cross site scripting attacks
      secure: process.env.NODE_ENV === "production", // only send cookie over HTTPS in production
      sameSite: "strict", // prevents CSRF attacks, cross-site request forgery 
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    return res.status(200).json({ message: "Access token refreshed." });

  } catch (error) {
    console.error("Error in refreshToken controller: ", error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}

export const getProfile = async (req, res) => {
  try {
    return res.status(200).json(req.user);
  } catch (error) {
    console.error("Error in getProfile controller: ", error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
}