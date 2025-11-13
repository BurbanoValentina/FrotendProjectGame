class DoublyNode<T> {
  value: T;
  next: DoublyNode<T> | null;
  prev: DoublyNode<T> | null;

  constructor(value: T) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

export class DoublyLinkedList<T> {
  private head: DoublyNode<T> | null;
  private tail: DoublyNode<T> | null;

  constructor() {
    this.head = null;
    this.tail = null;
  }

  add(value: T): void {
    const newNode = new DoublyNode(value);
    if (!this.head) {
      this.head = newNode;
      this.tail = newNode;
      return;
    }

    this.tail!.next = newNode;
    newNode.prev = this.tail;
    this.tail = newNode;
  }

  remove(value: T): void {
    if (!this.head) return;

    if (this.head.value === value) {
      if (this.head === this.tail) {
        this.head = this.tail = null;
      } else {
        this.head = this.head.next;
        this.head!.prev = null;
      }
      return;
    }

    let current: DoublyNode<T> | null = this.head;
    while (current !== null) {
      if (current.value === value) {
        if (current.next) {
          current.next.prev = current.prev;
        }
        if (current.prev) {
          current.prev.next = current.next;
        }
        if (current === this.tail) {
          this.tail = current.prev;
        }
        return;
      }
      current = current.next as DoublyNode<T> | null;
    }
  }

  print(): void {
    let current: DoublyNode<T> | null = this.head;
    while (current !== null) {
      console.log(current.value);
      current = current.next as DoublyNode<T> | null;
    }
  }
}
