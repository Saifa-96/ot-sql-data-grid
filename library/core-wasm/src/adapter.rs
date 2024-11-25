use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Column {
    pub name: String,
    pub width: usize
}

#[derive(Serialize, Deserialize)]
pub struct InitialData {
    pub header: Vec<Column>,
    pub rows: Vec<HashMap<String, String>>,
    pub total: usize
}


#[derive(Serialize, Deserialize)]
pub struct CellData {
    pub row: Option<HashMap<String, String>>,
    pub col: Option<Column>,
    pub row_index: usize,
    pub col_index: usize,
    pub x: usize,
    pub y: usize
}
