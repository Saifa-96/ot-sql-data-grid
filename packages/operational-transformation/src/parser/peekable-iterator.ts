export default class PeekableIterator<T> {
  private iter: IterableIterator<T>;
  private result: IteratorResult<T>;
  index: number = 0;

  constructor(iter: IterableIterator<T>) {
    this.iter = iter;
    this.result = this.iter.next();
  }

  next() {
    const curChar = this.result;
    this.result = this.iter.next();
    if (!this.result.done) {
      this.index += 1;
    }
    return curChar;
  }

  sync(iter: PeekableIterator<T>): PeekableIterator<T> {
    while (this.index > iter.index) {
      iter.next();
    }
    return iter;
  }

  peek() {
    return this.result;
  }
}
