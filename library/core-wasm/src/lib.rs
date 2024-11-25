use std::{collections::HashMap, panic};
use wasm_bindgen::prelude::*;

mod adapter;
mod data_state;
mod renderer;
mod visibility_state;

#[wasm_bindgen]
pub struct DataGrid {
    canvas: renderer::Canvas,
    data_state: data_state::DataState,
    viewport: visibility_state::Viewport,
}

#[wasm_bindgen]
impl DataGrid {
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_id: String) -> Self {
        panic::set_hook(Box::new(console_error_panic_hook::hook));
        let canvas = renderer::Canvas::new(&canvas_id);
        let data_state = data_state::DataState::new();
        let viewport = visibility_state::Viewport::new();
        Self {
            canvas,
            data_state,
            viewport,
        }
    }

    pub fn set_header(&mut self, header: JsValue) {
        let data = serde_wasm_bindgen::from_value::<Vec<adapter::Column>>(header);
        match data {
            Ok(columns) => {
                let mut header: Vec<data_state::Column> = Vec::with_capacity(columns.len());
                let mut col_widths: Vec<usize> = Vec::with_capacity(columns.len());
                for col in columns {
                    let col_item = data_state::Column {
                        name: col.name,
                        field_type: data_state::FieldType::String,
                    };
                    header.push(col_item);
                    col_widths.push(col.width);
                }
                self.data_state.set_header(header, col_widths);
            }
            Err(_) => {
                todo!();
            }
        };
    }

    pub fn is_out_of_rows_range(&self) -> bool {
        let (_, height) = self.canvas.get_canvas_size();
        self.viewport.cur_row + (height as usize / self.viewport.row_height)
            > self.data_state.get_rows_len()
    }

    pub fn get_cell_by_position(&self, x: usize, y: usize) -> JsValue {
        let col_widths = self.data_state.get_col_widths();
        let mut row_data: Option<&HashMap<String, String>> = None;
        let row_index = y / self.viewport.row_height;
        if row_index != 0 {
            row_data = self
                .data_state
                .get_row_by_idx(row_index + self.viewport.cur_row - 1);
        }

        let cols_visibility_state = self
            .viewport
            .get_cols_visibility_state(self.canvas.width as usize, col_widths);
        let mut column_data: Option<&data_state::Column> = None;
        let mut total_col_width: usize = 0;
        let mut cur_col_width: usize = 0;
        let mut col_index: usize = 0;
        for (cur_col_index, col_idx) in cols_visibility_state.range.iter().enumerate() {
            cur_col_width = col_widths.get(*col_idx).cloned().unwrap_or(100);
            total_col_width += cur_col_width;
            if total_col_width > x {
                column_data = self.data_state.get_column_by_idx(*col_idx);
                col_index = cur_col_index;
                break;
            }
        }

        let cell_data = adapter::CellData {
            row: row_data.cloned(),
            col: column_data.map(|data| adapter::Column {
                name: data.name.clone(),
                width: cur_col_width,
            }),
            row_index,
            col_index,
            x: total_col_width - cur_col_width,
            y: row_index * self.viewport.row_height,
        };
        serde_wasm_bindgen::to_value(&cell_data).unwrap()
    }

    pub fn append_rows(&mut self, js_rows: JsValue, total_count: usize) {
        let data = serde_wasm_bindgen::from_value::<Vec<HashMap<String, String>>>(js_rows);
        match data {
            Ok(rows) => {
                self.data_state.set_total(total_count);
                self.data_state.append_rows(rows);
            }
            Err(_) => {}
        }
    }

    pub fn move_viewport(&mut self, vertical_step: isize, horizontal_step: isize) {
        if vertical_step != 0 {
            let max = self.data_state.get_total();
            self.viewport.vertical_move(vertical_step, max);
        }
        if horizontal_step != 0 {
            let max = self.data_state.get_col_widths().len();
            self.viewport.horizontal_move(horizontal_step, max);
        }
    }

    pub fn draw(&self) {
        let col_widths = self.data_state.get_col_widths();
        let (width, height) = self.canvas.get_canvas_size();
        let total_row = self.data_state.get_total();

        let rows_visibility_state = self
            .viewport
            .get_rows_visibility_state(height as usize, total_row);
        let cols_visibility_state = self
            .viewport
            .get_cols_visibility_state(width as usize, col_widths);

        let columns_data = self.data_state.get_columns_data(
            &rows_visibility_state.range,
            &cols_visibility_state.range,
            |header_value| match header_value {
                Some(str) => renderer::Cell::HEAD(str),
                None => renderer::Cell::ELM("".to_string()),
            },
            |cell_value| match cell_value {
                Some(str) => renderer::Cell::ELM(str),
                None => renderer::Cell::ELM("".to_string()),
            },
        );

        let render_col_widths: Vec<usize> = cols_visibility_state
            .range
            .iter()
            .map(|&idx| col_widths.get(idx).cloned().unwrap_or(100))
            .collect();

        self.canvas.draw_grid(
            &columns_data,
            &render_col_widths,
            self.viewport.row_height as f64,
        );
        self.canvas.draw_vertical_scrollbar(
            rows_visibility_state.offset as f64,
            rows_visibility_state.length as f64,
        );
        self.canvas.draw_horizontal_scrollbar(
            cols_visibility_state.offset as f64,
            cols_visibility_state.length as f64,
        );
    }
}
