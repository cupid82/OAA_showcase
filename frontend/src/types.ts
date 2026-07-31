export interface Item {
  id: string;
  title: string;
  description: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: { message: string; details?: Record<string, string[]> };
}
