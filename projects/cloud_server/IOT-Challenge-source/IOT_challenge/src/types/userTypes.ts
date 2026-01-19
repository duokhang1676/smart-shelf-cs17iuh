export type Gender = 'male' | 'female' | 'other';
export type Role = 'employee' | 'admin' | 'manager' | 'user';

export interface User {
  _id: string;                 // map từ _id
  username: string;
  rfid: string;
  email: string;
  fullName?: string;
  phone?: string;
  avatar?: string;
  address?: string;
  dateOfBirth?: string;       // ISO string
  gender?: Gender;
  role: Role;                 // 'user' | 'admin'
  isActive: boolean;
  lastLogin?: string;         // ISO
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}


export interface LoginResponse {
  token: string;
  user: User;
}


// Khi tạo mới cần password
export type CreateUserDTO = Omit<User,
  'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'emailVerified'
> & {
  password: string;
};

// Cập nhật: password tùy chọn
export type UpdateUserDTO = Partial<CreateUserDTO> & { id?: string };