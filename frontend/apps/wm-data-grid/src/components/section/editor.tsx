"use client";

import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import initWasm, * as wasm from "core-wasm";
import { debounce } from "lodash";
import { z } from "zod";

const CANVAS_WIDTH = 950;
const CANVAS_HEIGHT = 800;

export function Editor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputProps, setInputProps] = useState<{
    x: number;
    y: number;
    width: number;
    defaultValue: string;
  } | null>(null);

  const handleDoubleClick = useCallback<MouseEventHandler<HTMLCanvasElement>>(
    (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const pos = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        const payload = gridRef.current?.get_cell_by_position(pos.x, pos.y);
        const { success, data } = cellDataSchema.safeParse(payload);
        if (success && data.row) {
          console.log(data);
          const defaultValue = data.row.get(data.col.name) ?? "";
          setInputProps({
            x: data.x,
            y: data.y,
            defaultValue,
            width: data.col.width,
          });
        }
      }
    },
    []
  );

  const gridRef = useRef<wasm.DataGrid | null>(null);
  const { init, nextPage } = useSocketIO();
  const firstRender = useRef(true);
  useEffect(() => {
    if (!firstRender.current) return;
    firstRender.current = false;
    const run = async () => {
      const result = await init();
      await initWasm();
      if (result.success) {
        const grid = new wasm.DataGrid("canvas");
        grid.set_header(result.data.header);
        grid.append_rows(result.data.rows, result.data.total);
        grid.draw();
        gridRef.current = grid;
      }
    };
    run();
    return () => {
      gridRef.current?.free();
      gridRef.current = null;
    };
  }, [init]);

  useEffect(() => {
    let canvasDom = canvasRef.current;

    const loadNextPage = debounce(async () => {
      const { success, data } = await nextPage();
      if (success) {
        gridRef.current?.append_rows(data.rows, data.total);
        gridRef.current?.draw();
      }
    }, 200);

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) {
        const step = e.deltaX > -1 ? 1 : -2;
        gridRef.current?.move_viewport(0, step);
      } else {
        const step = e.deltaY > -1 ? 1 : -2;
        gridRef.current?.move_viewport(step, 0);
      }
      gridRef.current?.draw();

      if (gridRef.current?.is_out_of_rows_range()) {
        loadNextPage();
      }
    };

    const bindWheelEvent = () => {
      if (canvasRef.current) {
        canvasDom = canvasRef.current;
        canvasDom.addEventListener("wheel", handler);
      } else {
        requestAnimationFrame(bindWheelEvent);
      }
    };

    bindWheelEvent();

    return () => {
      canvasDom?.removeEventListener("wheel", handler);
    };
  }, [nextPage]);

  return (
    <div className="relative">
      <canvas
        id="canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        ref={canvasRef}
        onDoubleClick={handleDoubleClick}
      />
      {inputProps && (
        <input
          className="absolute text-xs leading-[26px]"
          autoFocus
          defaultValue={inputProps.defaultValue}
          onBlur={() => setInputProps(null)}
          style={{
            width: inputProps.width,
            left: inputProps.x,
            top: inputProps.y,
          }}
        />
      )}
    </div>
  );
}

const useSocketIO = () => {
  const curPageRef = useRef(1);
  const socket = useRef(io("ws://localhost:3009"));

  const cache = useRef<Map<string, Promise<unknown>>>(new Map());
  const request = useCallback(
    (msg: string, payload?: unknown): Promise<unknown> => {
      const waitingPromise = cache.current.get(msg);
      if (waitingPromise !== undefined) return waitingPromise;

      const p = new Promise((resolve) => {
        socket.current.emit(msg, payload);
        socket.current.on(msg, (data) => {
          cache.current.delete(msg);
          resolve(data);
        });
      });

      cache.current.set(msg, p);
      return p;
    },
    []
  );

  const init = useCallback(async () => {
    const result = await request("init").then(initialDataSchema.safeParse);
    return result;
  }, [request]);

  const nextPage = useCallback(async () => {
    const page = curPageRef.current + 1;
    const result = await request("next-page", { page }).then(
      pageSchema.safeParse
    );
    if (result.success) {
      curPageRef.current++;
    }
    return result;
  }, [request]);

  return { init, nextPage };
};

const cellDataSchema = z.object({
  row_index: z.number(),
  col_index: z.number(),
  row: z.map(z.string(), z.string()).nullable(),
  col: z.object({
    name: z.string(),
    width: z.number(),
  }),
  x: z.number(),
  y: z.number(),
});

const initialDataSchema = z.object({
  header: z
    .array(
      z.object({
        name: z.string(),
        width: z.number(),
      })
    )
    .default([{ name: "empty", width: 120 }]),
  rows: z.array(z.record(z.string(), z.string())).default([]),
  total: z.number().default(0),
});

const pageSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())).default([]),
  total: z.number().default(0),
});
