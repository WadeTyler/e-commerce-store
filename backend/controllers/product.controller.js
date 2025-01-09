import { redis } from "../lib/redis.js";
import Product from "../models/product.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});  // find all products

    return res.status(200).json({ products });

  } catch (error) {
    console.error("Error in getAllProducts: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_products");
    if (featuredProducts) {
      return res.status(200).json(JSON.parse(featuredProducts));
    }

    // if not in redis, fetch from mongodb
    // .lean() is gonna return a plain js object instead of mongoose document, which is good for performance
    featuredProducts = await Product.find({ isFeatured: true }).lean();

    if (!featuredProducts) {
      return res.status(404).json({ message: "Featured products not found." });
    }

    // store in redis for future quick access
    redis.set("featured_products", JSON.stringify(featuredProducts));

    return res.status(200).json(featuredProducts);
  } catch (error) {
    console.error("Error in getFeaturedProducts: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    let cloudinaryResponse = null;

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {folder: "products"});
    }

    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url || "",
      category,
    });

    return res.status(201).json({ product });
  } catch (error) {
    console.error("Error in createProduct: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

export const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0];  // this will get the id of the image in cloudinary
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("Image deleted from cloudinary");
      } catch (error) {
        console.error("Error deleting image from cloudinary: ", error);
      }
    }

    await Product.findByIdAndDelete(productId);

    return res.status(200).json({ message: "Product deleted successfully." });

  } catch (error) {
    console.error("Error in deleteProduct: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 3 }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          price: 1,
          image: 1,
        }
      }
    ]);

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error in getRecommendedProducts: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

export const getProductsByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const products = await Product.find({ category });

    return res.status(200).json({products});
  } catch (error) {
    console.error("Error in getProductsByCategory: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.isFeatured = !product.isFeatured;
      const updatedProduct = await product.save();

      // update cache
      await updateFeaturedProductsCache(updatedProduct);
      return res.status(200).json( updatedProduct );
    }

    else {
      return res.status(404).json({ message: "Product not found." });
    }

  } catch (error) {
    console.error("Error in toggleFeaturedProduct: ", error);
    return res.status(500).json({ message: "Server Error" });
  }
}

async function updateFeaturedProductsCache(product) {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.error("Error in updateFeaturedProductsCache: ", error);
  }
}