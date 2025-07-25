const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, images, quantity } = req.body;
        const newProduct = new Product({ name, description, price, images, quantity });
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, { name, description, price }, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addImagesToProduct = async (req, res) => {
    try {
        const { images } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        product.images.push(...images);
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.removeImagesFromProduct = async (req, res) => {
    try {
        const { images } = req.body; // Array of image URLs to remove
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        product.images = product.images.filter(img => !images.includes(img));
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateProductQuantity = async (req, res) => {
    try {
        const { quantity } = req.body;

        if (typeof quantity !== 'number') {
            return res.status(400).json({ message: 'Quantity must be a number' });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { quantity },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
