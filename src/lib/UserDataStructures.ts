// Estructura de datos: HashMap para caché de usuarios
export class UserHashMap {
  private data: Map<string, any>;

  constructor() {
    this.data = new Map();
  }

  set(key: string, value: any): void {
    this.data.set(key, value);
  }

  get(key: string): any {
    return this.data.get(key);
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): boolean {
    return this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  size(): number {
    return this.data.size;
  }
}

// Estructura de datos: Cola para historial de sesiones
export class SessionQueue<T> {
  private items: T[];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.items = [];
    this.maxSize = maxSize;
  }

  enqueue(item: T): void {
    if (this.items.length >= this.maxSize) {
      this.dequeue(); // Eliminar el más antiguo
    }
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  toArray(): T[] {
    return [...this.items];
  }
}

// Estructura de datos: Stack para navegación
export class NavigationStack<T> {
  private items: T[];

  constructor() {
    this.items = [];
  }

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}
