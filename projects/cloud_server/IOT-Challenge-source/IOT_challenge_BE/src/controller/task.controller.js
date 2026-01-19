const Task = require('../model/Task');

// Tạo task mới
exports.createTask = async (req, res) => {
    try {
        const task = await Task.create(req.body);
        res.status(201).json(task);
    } catch (err) {
        res.status(400).json({
            error: err.message
        });
    }
};

// Lấy tất cả task
exports.getAllTasks = async (req, res) => {
    try {
        const tasks = await Task.find().populate('assignedBy assignedTo', 'fullName email role');
        res.json(tasks);
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

// Lấy task theo id
exports.getTaskById = async (req, res) => {
    try {
        const task = await Task.findById(req.params.id).populate('assignedBy assignedTo', 'fullName email role');
        if (!task) return res.status(404).json({
            error: 'Task not found'
        });
        res.json(task);
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

// Cập nhật task
exports.updateTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
            new: true
        });
        if (!task) return res.status(404).json({
            error: 'Task not found'
        });
        res.json(task);
    } catch (err) {
        res.status(400).json({
            error: err.message
        });
    }
};

// Xóa task
exports.deleteTask = async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) return res.status(404).json({
            error: 'Task not found'
        });
        res.json({
            message: 'Task deleted'
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};