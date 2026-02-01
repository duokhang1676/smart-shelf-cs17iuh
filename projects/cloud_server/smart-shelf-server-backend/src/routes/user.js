const express = require('express');
const router = express.Router();
const userController = require('../controller/user.controller');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { conditionalMulter } = require('../middleware/upload');

router.post('/register', userController.register);
router.post('/login', userController.login);

router.get('/', userController.getAllUsers);
router.post('/', conditionalMulter, userController.createUser);
router.put('/:id', conditionalMulter, userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;