import { describe, expect, test } from "vitest";
import {
  getUUIDfromIdentity,
  getBothUUIDandClientSymbol,
  isIdentityEqual,
  isClientSymbol,
  identityToString,
} from "./identity";

describe("utils module", () => {
  test("getIDinIdentity function", () => {
    expect(getUUIDfromIdentity({ symbol: "1" })).toBe(null);
    expect(getUUIDfromIdentity({ uuid: "col2" })).toBe("col2");
    expect(getUUIDfromIdentity({ symbol: "2", uuid: "2" })).toBe("2");
  });

  test("getBothUUIDandClientSymbol function", () => {
    expect(getBothUUIDandClientSymbol({ symbol: "1" })).toBe(null);
    expect(getBothUUIDandClientSymbol({ uuid: "col2" })).toBe(null);
    expect(getBothUUIDandClientSymbol({ symbol: "2", uuid: "2" })).toEqual({
      symbol: "2",
      uuid: "2",
    });
  });

  test("isClientSymbol function", () => {
    expect(isClientSymbol({ symbol: "1" })).toBe(true);
    expect(isClientSymbol({ uuid: "col2" })).toBe(false);
    expect(isClientSymbol({ symbol: "2", uuid: "2" })).toBe(false);
  });

  test("identityToString function", () => {
    expect(identityToString({ symbol: "1" })).toBe("1");
    expect(identityToString({ uuid: "col2" })).toBe("col2");
    expect(identityToString({ symbol: "2", uuid: "2" })).toBe("2");
  });

  test("isIdentityEqual function", () => {
    expect(isIdentityEqual({ symbol: "1" }, { symbol: "1" })).toBe(true);
    expect(isIdentityEqual({ uuid: "col2" }, { uuid: "col2" })).toBe(true);
    expect(
      isIdentityEqual({ symbol: "2", uuid: "2" }, { symbol: "2", uuid: "2" })
    ).toBe(true);
    expect(isIdentityEqual({ symbol: "1" }, { uuid: "1" })).toBe(false);
    expect(isIdentityEqual({ uuid: "col2" }, { symbol: "col2" })).toBe(false);
    expect(
      isIdentityEqual({ symbol: "2", uuid: "2" }, { symbol: "2", uuid: "3" })
    ).toBe(false);

    expect(isIdentityEqual({ symbol: "1", uuid: "1" }, { uuid: "1" })).toBe(
      true
    );
    expect(isIdentityEqual({ symbol: "1", uuid: "1" }, { uuid: "2" })).toBe(
      false
    );

    expect(isIdentityEqual({ symbol: "1", uuid: "1" }, { symbol: "1" })).toBe(
      true
    );
    expect(isIdentityEqual({ symbol: "1", uuid: "1" }, { symbol: "2" })).toBe(
      false
    );
  });
});
