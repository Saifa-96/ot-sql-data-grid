class ResultError extends Error {
  type: "expected" | "unexpected";
  constructor(message: string, type: "expected" | "unexpected" = "expected") {
    super(message);
    this.type = type;
  }
}

interface IOResultOK<T> {
  type: "ok";
  data: T;
}

interface IOResultErr {
  type: "err";
  err: ResultError;
}

export type IOResult<T> = IOResultOK<T> | IOResultErr;

const ok = <T>(data: T): IOResultOK<T> => ({ type: "ok", data });

const err = (msg: string): IOResultErr => {
  throw new ResultError(msg);
};

const map = <A, T>(arg: IOResult<A>, fn: (arg: A) => T): IOResult<T> => {
  if (arg.type === "err") return arg;
  try {
    return { type: "ok", data: fn(arg.data) };
  } catch (e) {
    if (e instanceof ResultError) {
      return { type: "err", err: e };
    } else {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        type: "err",
        err: new ResultError(msg ?? "Unknown error", "unexpected"),
      };
    }
  }
};

const from =
  <Arg, R>(fn: (arg: Arg) => IOResult<R>) =>
  (arg: Arg): IOResult<R> => {
    try {
      return fn(arg);
    } catch (e) {
      if (e instanceof ResultError) {
        return { type: "err", err: e };
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        return {
          type: "err",
          err: new ResultError(msg ?? "Unknown error", "unexpected"),
        };
      }
    }
  };

const io = {
  from,
  map,
  ok,
  err,
};

export default io;
