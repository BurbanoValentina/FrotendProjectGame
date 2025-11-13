export class ArrayStructure<T> {
  private items: T[];

  constructor() {
    this.items = [];
  }

  add(item: T): void {
    this.items.push(item);
  }

  get(index: number): T | undefined {
    return this.items[index];
  }

  remove(index: number): T | undefined {
    return this.items.splice(index, 1)[0];
  }

  size(): number {
    return this.items.length;
  }
}
