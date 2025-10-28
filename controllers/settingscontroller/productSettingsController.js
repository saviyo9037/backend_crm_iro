const Leadform = require("../../models/leadformModel");
const Setting = require("../../models/settingsModel");
const asyncHandler = require("express-async-handler");

const productSettingsController = {
  addProduct: asyncHandler(async (req, res) => {
    const { title, active, duration, amount } = req.body;

    // 1️⃣ Basic input validation
    if (!title) {
      return res.status(400).json({ message: "Product title is required" });
    }

    // 2️⃣ Check if product already exists (case-insensitive)
    const existingProduct = await Setting.findOne({
      type: "products",
      title: { $regex: new RegExp(`^${title}$`, "i") },
    });

    if (existingProduct) {
      return res.status(400).json({ message: "Product already exists" });
    }

    // 3️⃣ Create new product
    const newProduct = await Setting.create({
      title,
      active,
      type: "products",
      duration,
      amount,
    });

    if (!newProduct) {
      return res.status(400).json({ message: "Cannot create product" });
    }

    // 4️⃣ Add new product title to Leadform options (unique)
    await Leadform.updateOne(
      { name: "Required Product-Type" },
      { $addToSet: { options: newProduct.title } }
    );

    await Leadform.updateOne(
      { name: "Enquired Product-Type" },
      { $addToSet: { options: newProduct.title } }
    );


    // 5️⃣ Return response
    return res
      .status(201)
      .json({ message: "Product Created Successfully", product: newProduct });
  }),

  getProducts: asyncHandler(async (req, res) => {
    const Products = await Setting.find({ type: "products" });
    if (!Products) {
      return res.status(400).send("Products not found");
    }
    return res.status(200).json({
      message: "Products Found",
      Products,
    });
  }),

  updateProductTitle: asyncHandler(async (req, res) => {
    const { title, duration, amount } = req.body;
    const { id } = req.params;

    const existing = await Setting.findById(id);

    if (!existing) {
      res.status(404).send("Product not found");
    }

    const updatedProduct = await Setting.findByIdAndUpdate(
      id,
      { title, duration, amount },
      { runValidators: true, new: true }
    );
    if (!updatedProduct) {
      return res.status(400).send("cannot be updated");
    }

    return res.status(200).json({ updatedProduct });
  }),
  updateProductActive: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { active } = req.body;

    const product = await Setting.findById(id);
    if (!product) {
      return res.status(400).json({ message: " Product does not exists " });
    }

    const activatedProduct = await Setting.findByIdAndUpdate(
      id,
      { active },
      { runValidators: true, new: true }
    );
    res.status(200).json({ activatedProduct });
  }),
  deleteProduct: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Setting.findById(id);

    if (!product) return res.status(400).send("product not exists");

    const deletedProduct = await Setting.findByIdAndDelete(id);

    if (!deletedProduct)
      return res.status(400).send("Product cannot be deleted");

    res.status(200).json({ message: "Product deleted successfully" });
  }),
};
module.exports = productSettingsController;
