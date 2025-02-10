import { SqlValue } from "sql.js";
import { Column } from "./schema";

interface DrawParams {
  canvas: HTMLCanvasElement;
  header: Column[];
  rowHeight: number;
  rows: Map<string, SqlValue>[];
}

class DataGrid {
  adaptDPR(canvas: HTMLCanvasElement) {
    const dpr = window.devicePixelRatio;
    const { width, height } = canvas;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    canvas.getContext("2d")?.scale(dpr, dpr);
  }

  /**
   * 根据参数渲染data-grid
   * @param params 渲染参数
   */
  draw(params: DrawParams) {
    const { canvas, header, rowHeight, rows } = params;
    const ctx = canvas.getContext("2d");

    if (ctx === null) {
      throw new Error("The context of the given canvas dom can't be null.");
    }

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(0, 0, 0, .2)";
    ctx.fillStyle = "black";

    let x = 0;
    for (const col of header) {
      this.drawColumnHeader(ctx, x, col, rowHeight);
      this.drawColumn(ctx, x, col, rowHeight, rows);
      x += col.width;
    }
  }

  private drawColumnHeader(
    ctx: CanvasRenderingContext2D,
    x: number,
    headerItem: Column,
    rowHeight: number
  ) {
    const { width, displayName } = headerItem;
    ctx.strokeRect(x, 0, width, rowHeight);
    ctx.fillText(displayName, x + 5, 16);
  }

  private drawColumn(
    ctx: CanvasRenderingContext2D,
    x: number,
    column: Column,
    rowHeight: number,
    rows: Map<string, SqlValue>[]
  ) {
    let y = rowHeight;
    for (const row of rows) {
      ctx.strokeRect(x, y, column.width, rowHeight);
      const value = row.get(column.fieldName)?.toString() ?? "";
      ctx.fillText(value, x + 5, y + 16);
      y += rowHeight;
    }
  }
}

export default DataGrid;
