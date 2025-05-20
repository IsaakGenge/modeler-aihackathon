// Frontend/src/app/Models/graph.model.ts
export interface Graph {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateGraphDto {
  name: string;
}
