import { describe, expect, test } from "@jest/globals";
import PeekableIterator from "./peekable-iterator";

describe("Test peekable-iterator class", () => {
  test("is peekable", () => {
    const testStr = "I'm a test string.";
    const iter = new PeekableIterator(testStr[Symbol.iterator]());
    expect(iter.peek()).toEqual({ value: "I", done: false });
    expect(iter.peek()).toEqual({ value: "I", done: false });
    expect(iter.next()).toEqual({ value: "I", done: false });
    expect(iter.peek()).toEqual({ value: "'", done: false });
    expect(iter.next()).toEqual({ value: "'", done: false });
    expect(iter.peek()).toEqual({ value: "m", done: false });
    expect(iter.next()).toEqual({ value: "m", done: false });
    expect(iter.peek()).toEqual({ value: " ", done: false });
    expect(iter.next()).toEqual({ value: " ", done: false });
    expect(iter.peek()).toEqual({ value: "a", done: false });
    expect(iter.next()).toEqual({ value: "a", done: false });
    expect(iter.peek()).toEqual({ value: " ", done: false });
    expect(iter.next()).toEqual({ value: " ", done: false });
    expect(iter.peek()).toEqual({ value: "t", done: false });
    expect(iter.next()).toEqual({ value: "t", done: false });
    expect(iter.peek()).toEqual({ value: "e", done: false });
    expect(iter.next()).toEqual({ value: "e", done: false });
    expect(iter.peek()).toEqual({ value: "s", done: false });
    expect(iter.next()).toEqual({ value: "s", done: false });
    expect(iter.peek()).toEqual({ value: "t", done: false });
    expect(iter.next()).toEqual({ value: "t", done: false });
    expect(iter.peek()).toEqual({ value: " ", done: false });
    expect(iter.next()).toEqual({ value: " ", done: false });
    expect(iter.peek()).toEqual({ value: "s", done: false });
    expect(iter.next()).toEqual({ value: "s", done: false });
    expect(iter.peek()).toEqual({ value: "t", done: false });
    expect(iter.next()).toEqual({ value: "t", done: false });
    expect(iter.peek()).toEqual({ value: "r", done: false });
    expect(iter.next()).toEqual({ value: "r", done: false });
    expect(iter.peek()).toEqual({ value: "i", done: false });
    expect(iter.next()).toEqual({ value: "i", done: false });
    expect(iter.peek()).toEqual({ value: "n", done: false });
    expect(iter.next()).toEqual({ value: "n", done: false });
    expect(iter.peek()).toEqual({ value: "g", done: false });
    expect(iter.next()).toEqual({ value: "g", done: false });
    expect(iter.peek()).toEqual({ value: ".", done: false });
    expect(iter.next()).toEqual({ value: ".", done: false });
    expect(iter.peek()).toEqual({ value: undefined, done: true });
    expect(iter.next()).toEqual({ value: undefined, done: true });
  });

  test("Test sync method", () => {
    const testStr = "123456789";
    const iter = new PeekableIterator(testStr[Symbol.iterator]());
    const item = iter.next();
    expect(item.value).toEqual("1");
    for (let i = 0; i < 3; i++) {
      iter.next();
    }
    expect(iter.peek()).toEqual({ value: "5", done: false });
    expect(iter.index).toBe(4);

    const iter2 = new PeekableIterator(testStr[Symbol.iterator]());
    const iter3 = iter.sync(iter2);
    expect(iter.index).toBe(iter2.index);
    expect(iter2).toBe(iter3);

    expect(iter2.peek()).toEqual({ value: "5", done: false });
    expect(iter2.peek()).toEqual({ value: "5", done: false });
    expect(iter2.next()).toEqual({ value: "5", done: false });
    expect(iter2.next()).toEqual({ value: "6", done: false });
    expect(iter.peek()).toEqual({ value: "5", done: false });
  });
});
