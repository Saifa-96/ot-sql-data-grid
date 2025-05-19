import { describe, expect, test } from "vitest";
import PeekableIterator from "../src/peekable-iterator";

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

  test('should skip ignored items', () => {
    const testStr = "I am a test string.";
    const iter = new PeekableIterator(testStr[Symbol.iterator](), (item) => item === " ");
    expect(iter.peek()).toEqual({ value: "I", done: false });
    expect(iter.next()).toEqual({ value: "I", done: false });
    expect(iter.peek()).toEqual({ value: "a", done: false });
    expect(iter.next()).toEqual({ value: "a", done: false });
    expect(iter.peek()).toEqual({ value: "m", done: false });
    expect(iter.next()).toEqual({ value: "m", done: false });
    expect(iter.peek()).toEqual({ value: "a", done: false });
    expect(iter.next()).toEqual({ value: "a", done: false });
    expect(iter.peek()).toEqual({ value: "t", done: false });
    expect(iter.next()).toEqual({ value: "t", done: false });
    expect(iter.peek()).toEqual({ value: "e", done: false });
    expect(iter.next()).toEqual({ value: "e", done: false });
    expect(iter.peek()).toEqual({ value: "s", done: false });
    expect(iter.next()).toEqual({ value: "s", done: false });
    expect(iter.peek()).toEqual({ value: "t", done: false });
    expect(iter.next()).toEqual({ value: "t", done: false });
  })
});
