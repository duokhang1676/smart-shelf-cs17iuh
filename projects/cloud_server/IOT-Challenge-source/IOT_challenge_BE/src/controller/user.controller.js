const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../model/User'); // chỉnh đúng đường dẫn model của bạn

// Đăng ký tài khoản
exports.register = async (req, res) => {
  try {
    const userData = req.body;

    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const newUser = new User(userData); // không hash ở đây nếu đã dùng pre('save')
    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({ message: 'User registered successfully', user: userResponse });
  } catch (err) {
    res.status(500).json({ message: 'Register failed', error: err.message });
  }
};


// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(username, password);
    

    const user = await User.findOne({ username });
    console.log(user);
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// Lấy tất cả người dùng
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Get users failed', error: err.message });
  }
};

// Tạo user (dành cho admin)
exports.createUser = async (req, res) => {
  try {
    const userData = req.body;

    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    const newUser = new User(userData); // không hash ở đây nếu đã dùng pre('save')
    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({ message: 'User registered successfully', user: userResponse });
  } catch (err) {
    res.status(500).json({ message: 'Register failed', error: err.message });
  }
};


// Cập nhật user theo ID
exports.updateUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    let updatedData = { ...rest };

    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true }).select('-password');
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'Update user failed', error: err.message });
  }
};

// Xóa user theo ID
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Delete user failed', error: err.message });
  }
};
