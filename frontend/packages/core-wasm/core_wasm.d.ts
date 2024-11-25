/* tslint:disable */
/* eslint-disable */
export class DataGrid {
  free(): void;
  /**
   * @param {string} canvas_id
   */
  constructor(canvas_id: string);
  /**
   * @param {any} header
   */
  set_header(header: any): void;
  /**
   * @returns {boolean}
   */
  is_out_of_rows_range(): boolean;
  /**
   * @param {number} x
   * @param {number} y
   * @returns {any}
   */
  get_cell_by_position(x: number, y: number): any;
  /**
   * @param {any} js_rows
   * @param {number} total_count
   */
  append_rows(js_rows: any, total_count: number): void;
  /**
   * @param {number} vertical_step
   * @param {number} horizontal_step
   */
  move_viewport(vertical_step: number, horizontal_step: number): void;
  draw(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_datagrid_free: (a: number, b: number) => void;
  readonly datagrid_new: (a: number, b: number) => number;
  readonly datagrid_set_header: (a: number, b: number) => void;
  readonly datagrid_is_out_of_rows_range: (a: number) => number;
  readonly datagrid_get_cell_by_position: (a: number, b: number, c: number) => number;
  readonly datagrid_append_rows: (a: number, b: number, c: number) => void;
  readonly datagrid_move_viewport: (a: number, b: number, c: number) => void;
  readonly datagrid_draw: (a: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
