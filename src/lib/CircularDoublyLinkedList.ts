class CircularDoublyNode<T> {
  value: T;
  next: CircularDoublyNode<T> | null;
  prev: CircularDoublyNode<T> | null;

  constructor(value: T) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

export class CircularDoublyLinkedList<T> {
  private head: CircularDoublyNode<T> | null;

  constructor() {
    this.head = null;
  }

  add(value: T): void {
    const newNode = new CircularDoublyNode(value);
    if (!this.head) {
      this.head = newNode;
      newNode.next = newNode;
      newNode.prev = newNode;
      return;
    }

    newNode.next = this.head;
    newNode.prev = this.head.prev;
    this.head.prev!.next = newNode;
    this.head.prev = newNode;
  }

  getHeadValue(): T | null {
    return this.head ? this.head.value : null;
  }

  getNextValue(currentValue?: T | null): T | null {
    if (!this.head) return null;
    if (currentValue === undefined || currentValue === null) {
      return this.head.value;
    }

    let current = this.head;
    do {
      if (current.value === currentValue) {
        return current.next ? current.next.value : null;
      }
      current = current.next!;
    } while (current !== this.head);

    return this.head.value;
  }

  toArray(limit = 100): T[] {
    if (!this.head) return [];
    const result: T[] = [];
    let current = this.head;
    let count = 0;

    do {
      result.push(current.value);
      current = current.next!;
      count += 1;
    } while (current !== this.head && count < limit);

    return result;
  }

  remove(value: T): void {
    if (!this.head) return;

    let current = this.head;
    do {
      if (current.value === value) {
        if (current === this.head && current.next === this.head) {
          this.head = null;
        } else {
          current.prev!.next = current.next;
          current.next!.prev = current.prev;
          if (current === this.head) {
            this.head = current.next;
          }
        }
        return;
      }
      current = current.next!;
    } while (current !== this.head);
  }

  print(): void {
    if (!this.head) return;

    let current = this.head;
    do {
      console.log(current.value);
      current = current.next!;
    } while (current !== this.head);
  }
}
