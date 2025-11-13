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
