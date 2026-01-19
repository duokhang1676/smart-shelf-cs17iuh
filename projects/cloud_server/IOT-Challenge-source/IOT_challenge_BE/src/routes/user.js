const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.delete('/:id', verifyToken, isAdmin, userController.deleteUser);

router.get('/', userController.getAllUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;