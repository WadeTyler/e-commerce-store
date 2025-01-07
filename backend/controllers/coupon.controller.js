import Coupon from "../models/coupon.model.js";


export const getCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ userId: req.user._id, isActive: true });
    res.status(200).json(coupon || null);
  } catch (error) {
    console.error("Error in getCoupon: ", error);
    res.status(500).json({ message: "Server Error" });
  }
}

export const validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await Coupon.findOne({ code: code, isActive: true, userId: req.user._id });

    if (!coupon) {
      return res.status(400).json({ message: "Invalid coupon code" });
    }

    if (coupon.expirationDate < new Date()) {
      coupon.isActive = false;
      coupon.save();
      return res.status(400).json({ message: "Coupon has expired" });
    }

    res.status(200).json({
      message: "Coupon is valid",
      code: coupon.code,
      discountPercentage: coupon.discountPercentage
    });
  } catch (error) {
    console.error("Error in validateCoupon: ", error);
    res.status(500).json({ message: "Server Error" });
  }
}