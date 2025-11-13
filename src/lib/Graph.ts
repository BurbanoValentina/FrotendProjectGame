export class Graph {
  private adjacencyList: Map<string, string[]>;

  constructor() {
    this.adjacencyList = new Map();
  }

  addVertex(vertex: string): void {
    this.adjacencyList.set(vertex, []);
  }

  addEdge(vertex1: string, vertex2: string): void {
    this.adjacencyList.get(vertex1)?.push(vertex2);
    this.adjacencyList.get(vertex2)?.push(vertex1);
  }

  print(): void {
    this.adjacencyList.forEach((edges, vertex) => {
      console.log(`${vertex} -> ${edges.join(', ')}`);
    });
  }
}
