
const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// GET ALL HARDWARE PRODUCTS
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        stock,
        image_url,
        category:categories(id, name)
      `)
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data,
      meta: {
        total: data.length
      }
    });

  } catch (error) {
    console.error("Products error:", error.message);

    res.status(500).json({
      success: false,
      error: {
        code: "PRODUCT_FETCH_FAILED",
        message: "Unable to load hardware products."
      }
    });
  }
});

// GET SINGLE HARDWARE PRODUCT
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(422).json({
        success: false,
        error: {
          code: "INVALID_PRODUCT_ID",
          message: "Invalid product ID."
        }
      });
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, stock, image_url")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found."
        }
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error("Product error:", error.message);

    res.status(500).json({
      success: false,
      error: {
        code: "PRODUCT_FETCH_FAILED",
        message: "Unable to load product."
      }
    });
  }
});

module.exports = router;
