export default class PeekableIterator<T> {
  private iter: IterableIterator<T>;
  private char: IteratorResult<T>;

  constructor(iter: IterableIterator<T>) {
    this.iter = iter;
    this.char = this.iter.next();
  }

  next() {
    const curChar = this.char;
    this.char = this.iter.next();
    return curChar;
  }

  peek() {
    return this.char;
  }
}
