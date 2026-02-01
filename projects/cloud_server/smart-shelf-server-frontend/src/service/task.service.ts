import axios from "axios";
const apiUrl = import.meta.env.VITE_API_ENDPOINT;

export interface TaskResponse {
    _id: string;
    title: string;
    description: string;
    assignedTo: {
        _id: string;
        fullName: string;
        email: string;
    };
    assignedBy: {
        _id: string;
        fullName: string;
        email: string;
    };
    dueDate: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskDto {
    title: string;
    description: string;
    assignedTo: string;
    assignedBy: string;
    dueDate: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// Lấy tất cả tasks
export const getAllTasks = async (): Promise<TaskResponse[]> => {
    const response = await axios.get(`${apiUrl}/tasks`);
    return response.data;
};

// Lấy task theo ID
export const getTaskById = async (taskId: string): Promise<TaskResponse> => {
    const response = await axios.get(`${apiUrl}/tasks/${taskId}`);
    return response.data;
};

// Tạo task mới
export interface Task {
    title: string;
    description: string;
    assignedTo: string; // ID của employee
    dueDate: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

export const createTask = async (task: Task) => {
    const response = await axios.post(`${apiUrl}/tasks`, task);
    return response.data;
};

// Cập nhật task
export const updateTask = async (taskId: string, taskData: Partial<CreateTaskDto>): Promise<TaskResponse> => {
    const response = await axios.put(`${apiUrl}/tasks/${taskId}`, taskData);
    return response.data;
};

// Cập nhật trạng thái task
export const updateTaskStatus = async (taskId: string, status: Task['status']): Promise<TaskResponse> => {
    const response = await axios.patch(`${apiUrl}/tasks/${taskId}/status`, { status });
    return response.data;
};

// Xóa task
export const deleteTask = async (taskId: string): Promise<void> => {
    await axios.delete(`${apiUrl}/tasks/${taskId}`);
};

// Lấy tasks của employee đang đăng nhập
export const getMyTasks = async (): Promise<TaskResponse[]> => {
    const response = await axios.get(`${apiUrl}/tasks/my-tasks`);
    return response.data;
};

// Lấy tasks mà employee đã giao
export const getAssignedByMeTasks = async (): Promise<TaskResponse[]> => {
    const response = await axios.get(`${apiUrl}/tasks/assigned-by-me`);
    return response.data;
};