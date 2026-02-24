export interface UserInfo {
    id: string;
    email: string;
    role: string;
    phone: string;
    address: string | null;
}

export interface CreateUserData {
    email: string;
    phone: string;
    address?: string | null;
    role: string;
}

export interface UserRepository {
    findByEmail(email: string): Promise<UserInfo | null>;
    findById(id: string): Promise<UserInfo | null>;
    create(data: CreateUserData): Promise<UserInfo>;
}
