// Frontend/src/app/Models/node.model.ts
export interface Node {
  id?: string;
  name: string;
  nodeType: string;
  graphId: string;
  createdAt?: Date;
  positionX?: number;
  positionY?: number;
  properties?: { [key: string]: any };
}
