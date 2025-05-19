import { describe, expect, test } from "vitest";
import { Keyword } from "../src/keyword";
import { Lexer } from "../src/lexer";
import PeekableIterator from "../src/peekable-iterator";
import { TokenType } from "../src/token";

describe("Test lexer class", () => {
  test("Test simple sql text", () => {
    const lexer = new Lexer(`
        create table tbl (
            id1 int primary key,
            id2 integer
        );`);

    const tokens = Array.from(lexer.scan());
    expect(tokens).toEqual([
      { type: TokenType.Keyword, value: Keyword.Create },
      { type: TokenType.Keyword, value: Keyword.Table },
      { type: TokenType.Ident, value: "tbl" },
      { type: TokenType.OpenParen },
      { type: TokenType.Ident, value: "id1" },
      { type: TokenType.Keyword, value: Keyword.Int },
      { type: TokenType.Keyword, value: Keyword.Primary },
      { type: TokenType.Keyword, value: Keyword.Key },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "id2" },
      { type: TokenType.Keyword, value: Keyword.Integer },
      { type: TokenType.CloseParen },
      { type: TokenType.Semicolon },
    ]);
  });

  test("Test string", () => {
    const lexer = new Lexer(
      `select * from tbl where c1 = 'foo' and c2 = 'bar' and c3 = '123''sdd' and c4 = 'foo''s foo"s' ;`
    );
    const tokens = Array.from(lexer.scan());
    expect(tokens).toEqual([
      { type: TokenType.Keyword, value: Keyword.Select },
      { type: TokenType.Asterisk },
      { type: TokenType.Keyword, value: Keyword.From },
      { type: TokenType.Ident, value: "tbl" },
      { type: TokenType.Keyword, value: Keyword.Where },
      { type: TokenType.Ident, value: "c1" },
      { type: TokenType.Equals },
      { type: TokenType.String, value: "foo" },
      { type: TokenType.Keyword, value: Keyword.And },
      { type: TokenType.Ident, value: "c2" },
      { type: TokenType.Equals },
      { type: TokenType.String, value: "bar" },
      { type: TokenType.Keyword, value: Keyword.And },
      { type: TokenType.Ident, value: "c3" },
      { type: TokenType.Equals },
      { type: TokenType.String, value: "123''sdd" },
      { type: TokenType.Keyword, value: Keyword.And },
      { type: TokenType.Ident, value: "c4" },
      { type: TokenType.Equals },
      { type: TokenType.String, value: "foo''s foo\"s" },
      { type: TokenType.Semicolon },
    ]);
  });

  test("Test complicated sql text", () => {
    const lexer = new Lexer(`
            CREATE TABLE tbl
            (
                id1 int primary key,
                id2 integer,
                c1 bool null,
                c2 boolean not null,
                c3 float null,
                c4 double,
                c5 string,
                c6 text,
                c7 varchar default 'foo',
                c8 int default 100,
            );
    `);

    const tokens = Array.from(lexer.scan());
    expect(tokens).toEqual([
      { type: TokenType.Keyword, value: Keyword.Create },
      { type: TokenType.Keyword, value: Keyword.Table },
      { type: TokenType.Ident, value: "tbl" },
      { type: TokenType.OpenParen },
      { type: TokenType.Ident, value: "id1" },
      { type: TokenType.Keyword, value: Keyword.Int },
      { type: TokenType.Keyword, value: Keyword.Primary },
      { type: TokenType.Keyword, value: Keyword.Key },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "id2" },
      { type: TokenType.Keyword, value: Keyword.Integer },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c1" },
      { type: TokenType.Keyword, value: Keyword.Bool },
      { type: TokenType.Keyword, value: Keyword.Null },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c2" },
      { type: TokenType.Keyword, value: Keyword.Boolean },
      { type: TokenType.Keyword, value: Keyword.Not },
      { type: TokenType.Keyword, value: Keyword.Null },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c3" },
      { type: TokenType.Keyword, value: Keyword.Float },
      { type: TokenType.Keyword, value: Keyword.Null },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c4" },
      { type: TokenType.Keyword, value: Keyword.Double },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c5" },
      { type: TokenType.Keyword, value: Keyword.String },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c6" },
      { type: TokenType.Keyword, value: Keyword.Text },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c7" },
      { type: TokenType.Keyword, value: Keyword.Varchar },
      { type: TokenType.Keyword, value: Keyword.Default },
      { type: TokenType.String, value: "foo" },
      { type: TokenType.Comma },
      { type: TokenType.Ident, value: "c8" },
      { type: TokenType.Keyword, value: Keyword.Int },
      { type: TokenType.Keyword, value: Keyword.Default },
      { type: TokenType.Number, value: "100" },
      { type: TokenType.Comma },
      { type: TokenType.CloseParen },
      { type: TokenType.Semicolon },
    ]);
  });

  test("Test peekable iterator", () => {
    const testStr = `
        CREATE TABLE tbl
        (
          id1 int primary key,
          id2 integer,
          c1 bool null,
          c2 boolean not null,
          c3 float null,
          c4 double,
          c5 string,
          c6 text,
          c7 varchar default 'foo',
          c8 int default 100,
        );
    `;
    const iter = new Lexer(testStr).scan();
    const peekableIter = new PeekableIterator(iter);
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Create },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Create },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Create },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Table },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Table },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "tbl" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "tbl" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.OpenParen },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.OpenParen },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "id1" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "id1" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Int },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Int },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Primary },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Primary },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Key },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Key },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "id2" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "id2" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Integer },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Integer },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c1" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c1" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Bool },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Bool },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Null },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Null },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c2" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c2" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Boolean },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Boolean },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Not },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Not },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Null },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Null },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c3" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c3" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Float },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Float },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Null },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Null },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c4" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c4" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Double },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Double },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c5" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c5" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.String },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.String },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c6" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c6" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Text },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Text },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c7" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c7" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Varchar },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Varchar },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Default },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Default },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.String, value: "foo" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.String, value: "foo" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c8" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Ident, value: "c8" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Int },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Int },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Default },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Keyword, value: Keyword.Default },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Number, value: "100" },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Number, value: "100" },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Comma },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.CloseParen },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.CloseParen },
    });
    expect(peekableIter.peek()).toEqual({
      done: false,
      value: { type: TokenType.Semicolon },
    });
    expect(peekableIter.next()).toEqual({
      done: false,
      value: { type: TokenType.Semicolon },
    });
  });

  test("Test single line comment", () => {
    const sql = `SELECT * FROM users -- this is a comment`;
    const lexer = new Lexer(sql);
    const tokens = Array.from(lexer.scan());
    expect(tokens).toEqual([
      { type: TokenType.Keyword, value: Keyword.Select },
      { type: TokenType.Asterisk },
      { type: TokenType.Keyword, value: Keyword.From },
      { type: TokenType.Ident, value: "users" },
      { type: TokenType.SingleLineComment, value: "this is a comment" },
    ]);
  });

  test("Test multi line comment", () => {
    const sql = `SELECT * FROM users /* 
    this is a comment
    111
     */`;
    const lexer = new Lexer(sql);
    const tokens = Array.from(lexer.scan());
    expect(tokens).toEqual([
      { type: TokenType.Keyword, value: Keyword.Select },
      { type: TokenType.Asterisk },
      { type: TokenType.Keyword, value: Keyword.From },
      { type: TokenType.Ident, value: "users" },
      {
        type: TokenType.MultiLineComment,
        value: "this is a comment\n    111",
      },
    ]);
  });
});
