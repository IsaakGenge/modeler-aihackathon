// Frontend/src/app/Models/edge.model.ts
export interface Edge {
  id?: string;
  source: string;
  target: string;
  edgeType: string;
  graphId: string;
  createdAt?: Date;
  properties?: { [key: string]: any };
}
