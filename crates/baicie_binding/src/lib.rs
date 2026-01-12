#![deny(clippy::all)]

use baicie_json_diff::JsonDiff;
use napi::bindgen_prelude::*;
use napi_derive::napi;
use serde_json::Value;

#[napi]
pub fn plus_100(input: u32) -> u32 {
  input + 100
}

/// 计算两个JSON字符串的差异
#[napi]
pub fn json_diff(old_json: String, new_json: String) -> Result<String> {
  let diff = JsonDiff::diff_str(&old_json, &new_json)
    .map_err(|e| Error::from_reason(format!("JSON diff error: {e}")))?;

  // 将操作序列化为JSON字符串
  let operations: Vec<serde_json::Value> = diff
    .operations
    .into_iter()
    .map(|op| match op {
      baicie_json_diff::DiffOperation::Add { path, value } => {
        serde_json::json!({
          "type": "add",
          "path": path,
          "value": value
        })
      }
      baicie_json_diff::DiffOperation::Remove { path, old_value } => {
        serde_json::json!({
          "type": "remove",
          "path": path,
          "oldValue": old_value
        })
      }
      baicie_json_diff::DiffOperation::Replace { path, old_value, new_value } => {
        serde_json::json!({
          "type": "replace",
          "path": path,
          "oldValue": old_value,
          "newValue": new_value
        })
      }
    })
    .collect();

  serde_json::to_string(&operations)
    .map_err(|e| Error::from_reason(format!("Serialization error: {e}")))
}

/// 获取详细的JSON差异信息（用于前端可视化）
#[napi]
pub fn get_json_diff_details(old_json: String, new_json: String) -> Result<String> {
  let diff = JsonDiff::diff_str(&old_json, &new_json)
    .map_err(|e| Error::from_reason(format!("JSON diff error: {e}")))?;

  // 获取详细的差异项
  let diff_items = diff.get_diff_items();

  // 序列化为JSON字符串
  let details: Vec<serde_json::Value> = diff_items
    .into_iter()
    .map(|item| {
      let mut obj = serde_json::json!({
        "operation": item.operation,
        "path": item.path
      });

      if let Some(old_val) = item.old_value {
        obj["oldValue"] = old_val;
      }

      if let Some(new_val) = item.new_value {
        obj["newValue"] = new_val;
      }

      obj
    })
    .collect();

  serde_json::to_string(&details)
    .map_err(|e| Error::from_reason(format!("Serialization error: {e}")))
}

/// 应用差异到JSON字符串
#[napi]
pub fn apply_json_diff(json_str: String, diff_operations: String) -> Result<String> {
  // 解析原始JSON
  let mut value: Value = serde_json::from_str(&json_str)
    .map_err(|e| Error::from_reason(format!("JSON parse error: {e}")))?;

  // 解析差异操作
  let operations: Vec<serde_json::Value> = serde_json::from_str(&diff_operations)
    .map_err(|e| Error::from_reason(format!("Diff operations parse error: {e}")))?;

  // 应用每个操作
  for op in operations {
    let op_type = op
      .get("type")
      .and_then(|v| v.as_str())
      .ok_or_else(|| Error::from_reason("Missing operation type"))?;
    let path =
      op.get("path").and_then(|v| v.as_str()).ok_or_else(|| Error::from_reason("Missing path"))?;

    match op_type {
      "add" => {
        let value_to_add =
          op.get("value").ok_or_else(|| Error::from_reason("Missing value for add operation"))?;
        apply_add_operation(&mut value, path, value_to_add)?;
      }
      "remove" => {
        apply_remove_operation(&mut value, path)?;
      }
      "replace" => {
        let new_value = op
          .get("newValue")
          .ok_or_else(|| Error::from_reason("Missing newValue for replace operation"))?;
        apply_replace_operation(&mut value, path, new_value)?;
      }
      _ => return Err(Error::from_reason(format!("Unknown operation type: {op_type}"))),
    }
  }

  serde_json::to_string(&value).map_err(|e| Error::from_reason(format!("Serialization error: {e}")))
}

fn apply_add_operation(value: &mut Value, path: &str, new_value: &Value) -> Result<()> {
  let parts: Vec<&str> = path.split('.').collect();
  set_nested_value(value, &parts, new_value)
}

fn apply_remove_operation(value: &mut Value, path: &str) -> Result<()> {
  let parts: Vec<&str> = path.split('.').collect();
  remove_nested_value(value, &parts)
}

fn apply_replace_operation(value: &mut Value, path: &str, new_value: &Value) -> Result<()> {
  let parts: Vec<&str> = path.split('.').collect();
  set_nested_value(value, &parts, new_value)
}

fn set_nested_value(value: &mut Value, path_parts: &[&str], new_value: &Value) -> Result<()> {
  if path_parts.is_empty() {
    *value = new_value.clone();
    return Ok(());
  }

  let obj =
    value.as_object_mut().ok_or_else(|| Error::from_reason("Cannot set value on non-object"))?;

  if path_parts.len() == 1 {
    obj.insert(path_parts[0].to_string(), new_value.clone());
    Ok(())
  } else {
    let child =
      obj.entry(path_parts[0].to_string()).or_insert(Value::Object(serde_json::Map::new()));
    set_nested_value(child, &path_parts[1..], new_value)
  }
}

fn remove_nested_value(value: &mut Value, path_parts: &[&str]) -> Result<()> {
  if path_parts.is_empty() {
    return Err(Error::from_reason("Invalid path: empty"));
  }

  let obj = value
    .as_object_mut()
    .ok_or_else(|| Error::from_reason("Cannot remove value from non-object"))?;

  if path_parts.len() == 1 {
    obj.remove(path_parts[0]);
    Ok(())
  } else if let Some(child) = obj.get_mut(path_parts[0]) {
    remove_nested_value(child, &path_parts[1..])
  } else {
    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_json_diff_binding() {
    let old_json = r#"{"name": "Alice", "age": 25}"#;
    let new_json = r#"{"name": "Alice", "age": 26, "city": "Beijing"}"#;

    let result = json_diff(old_json.to_string(), new_json.to_string());
    assert!(result.is_ok());

    let diff_str = result.unwrap();
    let diff_value: serde_json::Value = serde_json::from_str(&diff_str).unwrap();

    assert!(diff_value.is_array());
    let operations = diff_value.as_array().unwrap();
    assert_eq!(operations.len(), 2); // age change + city addition
  }

  #[test]
  fn test_get_json_diff_details() {
    let old_json = r#"{"name": "Alice", "age": 25}"#;
    let new_json = r#"{"name": "Alice", "age": 26, "city": "Beijing"}"#;

    let result = get_json_diff_details(old_json.to_string(), new_json.to_string());
    assert!(result.is_ok());

    let details_str = result.unwrap();
    let details_value: serde_json::Value = serde_json::from_str(&details_str).unwrap();

    assert!(details_value.is_array());
    let details = details_value.as_array().unwrap();
    assert_eq!(details.len(), 2); // age change + city addition

    // 检查age的变化
    let age_change = &details[0];
    assert_eq!(age_change["operation"], "replace");
    assert_eq!(age_change["path"], "age");
    assert_eq!(age_change["oldValue"], 25);
    assert_eq!(age_change["newValue"], 26);

    // 检查city的添加
    let city_add = &details[1];
    assert_eq!(city_add["operation"], "add");
    assert_eq!(city_add["path"], "city");
    assert_eq!(city_add["newValue"], "Beijing");
  }

  #[test]
  fn test_apply_json_diff_binding() {
    let original_json = r#"{"name": "Alice", "age": 25}"#;
    let diff_operations = r#"[{"type": "replace", "path": "age", "oldValue": 25, "newValue": 26}, {"type": "add", "path": "city", "value": "Beijing"}]"#;

    let result = apply_json_diff(original_json.to_string(), diff_operations.to_string());
    assert!(result.is_ok());

    let applied_json = result.unwrap();
    let applied_value: serde_json::Value = serde_json::from_str(&applied_json).unwrap();

    assert_eq!(applied_value["name"], "Alice");
    assert_eq!(applied_value["age"], 26);
    assert_eq!(applied_value["city"], "Beijing");
  }
}
