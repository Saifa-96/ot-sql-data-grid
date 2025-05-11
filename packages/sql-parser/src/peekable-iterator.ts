export default class PeekableIterator<T> {
  private iter: IterableIterator<T>;
  private result: IteratorResult<T>;
  private ignore?: (item: T) => boolean;

  constructor(iter: IterableIterator<T>, ignore?: (item: T) => boolean) {
    this.iter = iter;
    this.ignore = ignore;
    this.result = this._nextResult();
  }

  private _nextResult(): IteratorResult<T> {
    let result = this.iter.next();
    while (!result.done && this.ignore && this.ignore(result.value)) {
      result = this.iter.next();
    }
    return result;
  }

  next() {
    const item = this.result;
    this.result = this._nextResult();
    return item;
  }

  peek() {
    return this.result;
  }
}
