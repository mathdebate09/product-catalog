const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', authMiddleware, productController.createProduct);
router.put('/:id', authMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);
router.post('/:id/images', authMiddleware, productController.addImagesToProduct);
router.delete('/:id/images', authMiddleware, productController.removeImagesFromProduct);
router.patch('/:id/quantity', authMiddleware, productController.updateProductQuantity);

module.exports = router;