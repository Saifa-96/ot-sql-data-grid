pub struct Viewport {
    fixed_row: usize,
    fixed_col: Option<usize>,
    pub cur_row: usize,
    pub cur_col: usize,
    pub row_height: usize,
}

pub struct VisibilityState {
    pub range: Vec<usize>,
    pub offset: f64,
    pub length: f64,
}

impl Viewport {
    pub fn new() -> Self {
        Self {
            row_height: 26,
            fixed_row: 0,
            fixed_col: None,
            cur_row: 1,
            cur_col: 0,
        }
    }

    pub fn vertical_move(&mut self, step: isize, max: usize) {
        let row_idx = self.cur_row as isize;
        self.cur_row = (row_idx + step)
            .try_into()
            .unwrap_or(0)
            .clamp(self.fixed_row + 1, max);
    }

    pub fn horizontal_move(&mut self, step: isize, max: usize) {
        let col_idx = self.cur_col as isize;
        let min = match self.fixed_col {
            Some(idx) => idx + 1,
            None => 0,
        };
        self.cur_col = (col_idx + step).try_into().unwrap_or(0).clamp(min, max);
    }

    pub fn get_rows_visibility_state(&self, height: usize, total_row: usize) -> VisibilityState {
        let visible_row_count = (height / self.row_height) + 1;
        let row_idx = self.cur_row;
        let mut range = gen_vec(0, self.fixed_row + 1);
        let rest_idx = gen_vec(row_idx, visible_row_count - range.len());
        range.extend(rest_idx);

        let (length, offset) = self.get_vertical_bar_state(
            total_row as f64,
            visible_row_count as f64,
            height as f64,
            self.row_height as f64,
        );

        VisibilityState {
            range,
            offset,
            length,
        }
    }

    pub fn get_cols_visibility_state(
        &self,
        width: usize,
        col_widths: &Vec<usize>,
    ) -> VisibilityState {
        let mut col_idx = self.cur_col;
        let length = match self.fixed_col {
            Some(idx) => idx + 1,
            None => 0,
        };
        let mut visible_col_idx = gen_vec(0, length);
        let mut content_width: usize = visible_col_idx.iter().fold(0, |acc, &idx| {
            let width = col_widths[idx];
            acc + width
        });

        while col_idx < col_widths.len() && content_width < width {
            content_width += col_widths[col_idx];
            visible_col_idx.push(col_idx);
            col_idx += 1;
        }

        let (length, offset) = self.get_horizontal_bar_state(
            width as f64,
            (content_width - col_widths[col_idx - 1]) as f64,
            col_widths,
        );

        VisibilityState {
            range: visible_col_idx,
            offset,
            length,
        }
    }

    fn get_vertical_bar_state(
        &self,
        total_row: f64,
        visible_row_count: f64,
        height: f64,
        row_height: f64,
    ) -> (f64, f64) {
        let fixed_len: f64 = self.fixed_row as f64 + 1.0;
        let offset = fixed_len * row_height;
        let ratio: f64 = (height - offset) / (total_row * row_height);
        let cur_height = visible_row_count * row_height;
        let scroll_height = cur_height * ratio;

        let y = (self.cur_row as f64 - fixed_len) * row_height * ratio;
        let y = y + offset;

        (scroll_height, y)
    }

    fn get_horizontal_bar_state(
        &self,
        width: f64,
        content_width: f64,
        col_width: &Vec<usize>,
    ) -> (f64, f64) {
        let total_width: f64 = col_width.iter().fold(0, |acc, width| acc + *width) as f64;
        let ratio: f64 = width / total_width;
        let scroll_width = content_width * ratio;

        let x = (self.fixed_col.unwrap_or(0)..self.cur_col).fold(0.0, |acc, idx| {
            let width = col_width[idx] as f64;
            acc + width
        });

        (scroll_width, x)
    }
}

fn gen_vec(start: usize, length: usize) -> Vec<usize> {
    if length == 0 {
        return Vec::new();
    }
    (0..length).map(|x| x + start).collect()
}
