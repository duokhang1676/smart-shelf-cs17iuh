import axios from "axios";
import { CreateUserDTO, UpdateUserDTO, User } from "../types/userTypes";
const apiUrl = import.meta.env.VITE_API_ENDPOINT;



export async function getUsers(): Promise<User[]> {
  const res = await axios.get(apiUrl + "/users");
  return res.data; // data là mảng user từ BE
}

export const getEmployees = async (): Promise<User[]> => {
  const users = await getUsers();
  return users.filter(user => user.role === "employee").map(employee => ({
    ...employee,
    // Format lại dữ liệu cho phù hợp với TaskDialog
    id: employee._id,
    name: `${employee.fullName}`,
  }));
};

const api = axios.create({ baseURL: '/api' });

const mapUser = (u: any): User => ({
  _id: u._id ?? u.id,
  username: u.username,
  rfid: u.rfid,
  email: u.email,
  fullName: u.fullName ?? '',
  phone: u.phone ?? '',
  avatar: u.avatar ?? '',
  address: u.address ?? '',
  dateOfBirth: u.dateOfBirth ? new Date(u.dateOfBirth).toISOString() : undefined,
  gender: u.gender,
  role: u.role, // 'user' | 'admin'
  isActive: typeof u.isActive === 'boolean' ? u.isActive : true,
  lastLogin: u.lastLogin ? new Date(u.lastLogin).toISOString() : undefined,
  emailVerified: !!u.emailVerified,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

export async function createUser(payload: CreateUserDTO): Promise<User> {
  const { data } = await api.post(apiUrl + '/users', payload);
  return mapUser(data);
}

export async function updateUser(id: string, payload: Partial<User>): Promise<User> {
  const res = await axios.put(`${apiUrl}/users/${id}`, payload);
  return res.data; // BE trả về user đã update
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}
