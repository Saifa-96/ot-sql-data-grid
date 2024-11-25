use wasm_bindgen::{JsCast, JsValue};
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement};

#[derive(Clone)]
pub enum Cell {
    HEAD(String),
    ELM(String),
}

pub struct Canvas {
    pub width: f64,
    height: f64,
    ctx: CanvasRenderingContext2d,
}

impl Canvas {
    pub fn new(element_id: &String) -> Self {
        let document = web_sys::window().unwrap().document().unwrap();
        let canvas: HtmlCanvasElement = document
            .get_element_by_id(element_id)
            .unwrap()
            .dyn_into()
            .unwrap();
        let width = canvas.width() as f64;
        let height = canvas.height() as f64;
        let ctx: CanvasRenderingContext2d = canvas
            .get_context("2d")
            .unwrap()
            .unwrap()
            .dyn_into()
            .unwrap();

        Self { width, height, ctx }
    }

    pub fn get_canvas_size(&self) -> (f64, f64) {
        (self.width, self.height)
    }
}

impl Canvas {
    pub fn draw_grid(&self, grid: &Vec<Vec<Cell>>, col_widths: &Vec<usize>, row_height: f64) {
        let ctx = &self.ctx;

        ctx.clear_rect(0.0, 0.0, self.width, self.height);

        let line_color = JsValue::from("rgba(0, 0, 0, .2");
        ctx.set_stroke_style(&line_color);

        let font_color = JsValue::from("black");
        ctx.set_fill_style(&font_color);

        let mut x = 0.0;
        for (col_index, col) in grid.iter().enumerate() {
            let col_width = col_widths[col_index] as f64;
            for (row_index, cell) in col.iter().enumerate() {
                let y = row_index as f64 * row_height;
                ctx.stroke_rect(x, y, col_width, row_height);

                let text_x = x + 5.0;
                let text_y = y + 16.0;
                match cell {
                    Cell::HEAD(str) => {
                        let _ = ctx.fill_text(str, text_x, text_y);
                    }
                    Cell::ELM(str) => {
                        let _ = ctx.fill_text(str, text_x, text_y);
                    }
                }
            }
            x += col_width;
        }
    }

    pub fn draw_vertical_scrollbar(&self, offset: f64, bar_height: f64) {
        let ctx = &self.ctx;
        let scrollbar_color = JsValue::from("green");
        ctx.set_fill_style(&scrollbar_color);
        ctx.fill_rect(self.width - 10.0, offset, 10.0, bar_height);
    }

    pub fn draw_horizontal_scrollbar(&self, offset: f64, bar_width: f64) {
        let ctx = &self.ctx;
        let scrollbar_color = JsValue::from("red");
        ctx.set_fill_style(&scrollbar_color);
        ctx.fill_rect(offset, self.height - 10.0, bar_width, 10.0);
    }
}
