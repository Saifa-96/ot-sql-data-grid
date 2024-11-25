use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub enum FieldType {
    String,
    Int,
    Float,
}

#[derive(Serialize, Deserialize)]
pub struct Column {
    pub name: String,
    pub field_type: FieldType,
}

type Rows = Vec<HashMap<String, String>>;

pub struct DataState {
    header: Vec<Column>,
    col_widths: Vec<usize>,
    rows: Rows,
    total: usize,
}

impl DataState {
    pub fn new() -> Self {
        Self {
            header: vec![],
            col_widths: vec![],
            rows: vec![],
            total: 0,
        }
    }

    pub fn set_header(&mut self, header: Vec<Column>, col_widths: Vec<usize>) {
        self.header = header;
        self.col_widths = col_widths;
    }

    pub fn get_column_by_idx(&self, idx: usize) -> Option<&Column> {
        self.header.get(idx)
    }

    pub fn get_row_by_idx(&self, idx: usize) -> Option<&HashMap<String, String>> {
        self.rows.get(idx)
    }

    pub fn append_rows(&mut self, rows: Rows) {
        self.rows.extend(rows);
    }

    pub fn set_total(&mut self, total: usize) {
        self.total = total;
    }

    pub fn get_total(&self) -> usize {
        self.total
    }

    pub fn get_rows_len(&self) -> usize {
        self.rows.len()
    }

    pub fn get_col_widths(&self) -> &Vec<usize> {
        &self.col_widths
    }

    pub fn get_columns_data<F, T, U>(
        &self,
        row_range: &Vec<usize>,
        col_range: &Vec<usize>,
        map_header: F,
        map_data: T,
    ) -> Vec<Vec<U>>
    where
        F: Fn(Option<String>) -> U,
        T: Fn(Option<String>) -> U,
    {
        let mut data = Vec::new();
        for col_idx in col_range {
            let mut column = Vec::new();
            let header_data = self.header.get(*col_idx);

            for row_idx in row_range {
                let cell = if *row_idx == 0 {
                    map_header(header_data.map(|data| data.name.clone()))
                } else {
                    let cell_data = self.rows.get(*row_idx).and_then(|data| {
                        header_data
                            .and_then(|header| data.get(&header.name))
                            .cloned()
                    });
                    map_data(cell_data)
                };
                column.push(cell);
            }

            data.push(column);
        }
        data
    }
}
