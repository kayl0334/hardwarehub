const express = require("express");
const supabase = require("../config/supabase");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// Protect every route in this file
router.use(requireAdmin);

function validProduct(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";

  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  const price = body.price;
  const stock = body.stock;
  const categoryId = body.category_id;

  if (!name || name.length > 150) return null;

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0)
    return null;

  if (!Number.isSafeInteger(stock) || stock < 0) return null;

  if (!Number.isSafeInteger(categoryId) || categoryId < 1) return null;

  const imageUrl = body.image_url ?? null;

  if (
    imageUrl !== null &&
    (typeof imageUrl !== "string" ||
      !imageUrl.startsWith("https://") ||
      imageUrl.length > 2048)
  )
    return null;

  return {
    name,
    description,
    price,
    stock,
    category_id: categoryId,
    image_url: imageUrl,
  };
}

function validId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// GET ALL PRODUCTS FOR ADMIN
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(id, name)")
    .order("id");

  if (error) {
    console.error("Admin product list:", error.message);

    return res.status(500).json({
      success: false,
      error: {
        code: "PRODUCT_FETCH_FAILED",
        message: "Unable to load products.",
      },
    });
  }

  res.json({ success: true, data });
});

// ADD PRODUCT
router.post("/", async (req, res) => {
  const product = validProduct(req.body || {});

  if (!product) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_PRODUCT",
        message: "Check product name, price, stock, category and image URL.",
      },
    });
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...product,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Add product:", error.message);

    return res.status(500).json({
      success: false,
      error: {
        code: "PRODUCT_CREATE_FAILED",
        message: "Unable to add product.",
      },
    });
  }

  res.status(201).json({ success: true, data });
});

// UPDATE PRODUCT
router.put("/:id", async (req, res) => {
  const id = validId(req.params.id);
  const product = validProduct(req.body || {});

  if (!id || !product) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Invalid product ID or product details.",
      },
    });
  }

  const { data, error } = await supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Update product:", error.message);

    return res.status(500).json({
      success: false,
      error: {
        code: "PRODUCT_UPDATE_FAILED",
        message: "Unable to update product.",
      },
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found.",
      },
    });
  }

  res.json({ success: true, data });
});

// ARCHIVE PRODUCT INSTEAD OF PERMANENT DELETION
router.delete("/:id", async (req, res) => {
  const id = validId(req.params.id);

  if (!id) {
    return res.status(422).json({
      success: false,
      error: {
        code: "INVALID_PRODUCT_ID",
        message: "Invalid product ID.",
      },
    });
  }

  const { data, error } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Archive product:", error.message);

    return res.status(500).json({
      success: false,
      error: {
        code: "PRODUCT_ARCHIVE_FAILED",
        message: "Unable to archive product.",
      },
    });
  }

  if (!data) {
    return res.status(404).json({
      success: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found.",
      },
    });
  }

  res.json({
    success: true,
    message: "Product archived successfully.",
  });
});

module.exports = router;
