export interface CatalogCategory {
  id: number;
  name: string;
  color: string;
  icon?: string | null;
}

export interface CatalogTopic {
  id: number;
  name: string;
  description?: string | null;
  estimatedTime: number;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  order: number;
  updatedAt: string;
  isActive?: boolean;
  courseId?: number;
}

export interface CatalogCourse {
  id: number;
  name: string;
  categoryId: number;
  category?: CatalogCategory;
  description?: string | null;
  color: string;
  icon?: string | null;
  order: number;
  isActive: boolean;
  isGlobal: boolean;
  userId?: number | null;
  topics?: CatalogTopic[];
}
