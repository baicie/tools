#![deny(clippy::all)]

use baicie_json_diff::JsonDiff;
use napi::bindgen_prelude::*;
use napi_derive::napi;

#[napi(object)]
pub struct DiffItem {
  pub path: String,
  pub operation: String, // "add" | "remove" | "replace"
  pub old_value: Option<String>,
  pub new_value: Option<String>,
}

/// 计算两个JSON字符串的差异，直接返回差异对象数组
#[napi]
pub fn diff_json(old_json: String, new_json: String) -> Result<Vec<DiffItem>> {
  let diff = JsonDiff::diff_str(&old_json, &new_json)
    .map_err(|e| Error::from_reason(format!("JSON diff error: {e}")))?;

  // 获取差异项并转换为 js 对象
  let diff_items: Vec<DiffItem> = diff
    .get_diff_items()
    .into_iter()
    .map(|item| DiffItem {
      path: item.path,
      operation: item.operation.as_str().to_string(),
      old_value: item.old_value.map(|v| v.to_string()),
      new_value: item.new_value.map(|v| v.to_string()),
    })
    .collect();

  Ok(diff_items)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_json_diff() {
    let old_json = r#"{"name": "Alice", "age": 25}"#;
    let new_json = r#"{"name": "Alice", "age": 26, "city": "Beijing"}"#;

    let result = diff_json(old_json.to_string(), new_json.to_string());
    assert!(result.is_ok());

    let diff_items = result.unwrap();
    assert_eq!(diff_items.len(), 2); // age change + city addition

    // 找到 age 变化
    let age_change =
      diff_items.iter().find(|item| item.path == "age").expect("age change not found");
    assert_eq!(age_change.operation, "replace");
    assert_eq!(age_change.old_value, Some("25".to_string()));
    assert_eq!(age_change.new_value, Some("26".to_string()));

    // 找到 city 添加
    let city_add = diff_items.iter().find(|item| item.path == "city").expect("city add not found");
    assert_eq!(city_add.operation, "add");
    assert_eq!(city_add.new_value, Some("\"Beijing\"".to_string()));
  }
}
