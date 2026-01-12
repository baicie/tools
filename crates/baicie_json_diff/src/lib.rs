use serde_json::{Map, Value};
use thiserror::Error;

/// JSON diff相关的错误类型
#[derive(Error, Debug)]
pub enum JsonDiffError {
  #[error("JSON parse error: {0}")]
  ParseError(#[from] serde_json::Error),
  #[error("Invalid JSON value type")]
  InvalidType,
}

/// JSON diff操作类型
#[derive(Debug, Clone, PartialEq)]
pub enum DiffOperation {
  Add { path: String, value: Value },
  Remove { path: String, old_value: Value },
  Replace { path: String, old_value: Value, new_value: Value },
}

/// 差异项的详细信息
#[derive(Debug, Clone)]
pub struct DiffItem {
  pub operation: String, // "add", "remove", "replace"
  pub path: String,
  pub old_value: Option<Value>,
  pub new_value: Option<Value>,
}

/// JSON diff结果
#[derive(Debug, Clone)]
pub struct JsonDiff {
  pub operations: Vec<DiffOperation>,
}

impl JsonDiff {
  /// 创建新的JsonDiff实例
  pub fn new() -> Self {
    Self { operations: Vec::new() }
  }

  /// 计算两个JSON值的差异
  pub fn diff(old: &Value, new: &Value) -> Result<Self, JsonDiffError> {
    let mut diff = Self::new();
    diff.compute_diff("", old, new);
    Ok(diff)
  }

  /// 从JSON字符串计算差异
  pub fn diff_str(old: &str, new: &str) -> Result<Self, JsonDiffError> {
    let old_value: Value = serde_json::from_str(old)?;
    let new_value: Value = serde_json::from_str(new)?;
    Self::diff(&old_value, &new_value)
  }

  fn compute_diff(&mut self, path: &str, old: &Value, new: &Value) {
    match (old, new) {
      (Value::Object(old_obj), Value::Object(new_obj)) => {
        self.diff_objects(path, old_obj, new_obj);
      }
      (Value::Array(old_arr), Value::Array(new_arr)) => {
        self.diff_arrays(path, old_arr, new_arr);
      }
      _ => {
        if old != new {
          self.operations.push(DiffOperation::Replace {
            path: path.to_string(),
            old_value: old.clone(),
            new_value: new.clone(),
          });
        }
      }
    }
  }

  fn diff_objects(&mut self, base_path: &str, old: &Map<String, Value>, new: &Map<String, Value>) {
    // 检查新增的键
    for (key, value) in new {
      if !old.contains_key(key) {
        let path = if base_path.is_empty() { key.clone() } else { format!("{base_path}.{key}") };
        self.operations.push(DiffOperation::Add { path, value: value.clone() });
      }
    }

    // 检查删除的键和修改的值
    for (key, old_value) in old {
      let path = if base_path.is_empty() { key.clone() } else { format!("{base_path}.{key}") };

      if let Some(new_value) = new.get(key) {
        // 键存在，比较值
        self.compute_diff(&path, old_value, new_value);
      } else {
        // 键被删除
        self.operations.push(DiffOperation::Remove { path, old_value: old_value.clone() });
      }
    }
  }

  fn diff_arrays(&mut self, base_path: &str, old: &[Value], new: &[Value]) {
    // 简单实现：如果数组长度不同或内容不同，则替换整个数组
    if old.len() != new.len() || old != new {
      self.operations.push(DiffOperation::Replace {
        path: base_path.to_string(),
        old_value: Value::Array(old.to_vec()),
        new_value: Value::Array(new.to_vec()),
      });
    }
  }

  /// 获取操作数量
  pub fn len(&self) -> usize {
    self.operations.len()
  }

  /// 检查是否有差异
  pub fn is_empty(&self) -> bool {
    self.operations.is_empty()
  }

  /// 获取详细的差异项列表
  pub fn get_diff_items(&self) -> Vec<DiffItem> {
    self.operations.iter().map(|op| match op {
      DiffOperation::Add { path, value } => DiffItem {
        operation: "add".to_string(),
        path: path.clone(),
        old_value: None,
        new_value: Some(value.clone()),
      },
      DiffOperation::Remove { path, old_value } => DiffItem {
        operation: "remove".to_string(),
        path: path.clone(),
        old_value: Some(old_value.clone()),
        new_value: None,
      },
      DiffOperation::Replace { path, old_value, new_value } => DiffItem {
        operation: "replace".to_string(),
        path: path.clone(),
        old_value: Some(old_value.clone()),
        new_value: Some(new_value.clone()),
      },
    }).collect()
  }

  /// 应用diff到原始JSON值
  pub fn apply(&self, mut value: Value) -> Result<Value, JsonDiffError> {
    for operation in &self.operations {
      match operation {
        DiffOperation::Add { path, value: new_value } => {
          Self::apply_add(&mut value, path, new_value)?;
        }
        DiffOperation::Remove { path, .. } => {
          Self::apply_remove(&mut value, path)?;
        }
        DiffOperation::Replace { path, new_value, .. } => {
          Self::apply_replace(&mut value, path, new_value)?;
        }
      }
    }
    Ok(value)
  }

  fn apply_add(root: &mut Value, path: &str, value: &Value) -> Result<(), JsonDiffError> {
    let parts: Vec<&str> = path.split('.').collect();
    Self::set_nested_value(root, &parts, value)
  }

  fn apply_remove(root: &mut Value, path: &str) -> Result<(), JsonDiffError> {
    let parts: Vec<&str> = path.split('.').collect();
    Self::remove_nested_value(root, &parts)
  }

  fn apply_replace(root: &mut Value, path: &str, value: &Value) -> Result<(), JsonDiffError> {
    let parts: Vec<&str> = path.split('.').collect();
    Self::set_nested_value(root, &parts, value)
  }

  fn set_nested_value(
    value: &mut Value,
    path_parts: &[&str],
    new_value: &Value,
  ) -> Result<(), JsonDiffError> {
    if path_parts.is_empty() {
      *value = new_value.clone();
      return Ok(());
    }

    let obj = value.as_object_mut().ok_or(JsonDiffError::InvalidType)?;

    if path_parts.len() == 1 {
      obj.insert(path_parts[0].to_string(), new_value.clone());
      Ok(())
    } else {
      let child = obj.entry(path_parts[0].to_string()).or_insert(Value::Object(Map::new()));
      Self::set_nested_value(child, &path_parts[1..], new_value)
    }
  }

  fn remove_nested_value(value: &mut Value, path_parts: &[&str]) -> Result<(), JsonDiffError> {
    if path_parts.is_empty() {
      return Err(JsonDiffError::InvalidType);
    }

    let obj = value.as_object_mut().ok_or(JsonDiffError::InvalidType)?;

    if path_parts.len() == 1 {
      obj.remove(path_parts[0]);
      Ok(())
    } else if let Some(child) = obj.get_mut(path_parts[0]) {
      Self::remove_nested_value(child, &path_parts[1..])
    } else {
      Ok(())
    }
  }
}

impl Default for JsonDiff {
  fn default() -> Self {
    Self::new()
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  #[test]
  fn test_diff_identical_objects() {
    let old = json!({"a": 1, "b": 2});
    let new = json!({"a": 1, "b": 2});

    let diff = JsonDiff::diff(&old, &new).unwrap();
    assert!(diff.is_empty());
  }

  #[test]
  fn test_diff_added_property() {
    let old = json!({"a": 1});
    let new = json!({"a": 1, "b": 2});

    let diff = JsonDiff::diff(&old, &new).unwrap();
    assert_eq!(diff.len(), 1);

    match &diff.operations[0] {
      DiffOperation::Add { path, value } => {
        assert_eq!(path, "b");
        assert_eq!(value, &json!(2));
      }
      _ => panic!("Expected Add operation"),
    }
  }

  #[test]
  fn test_diff_removed_property() {
    let old = json!({"a": 1, "b": 2});
    let new = json!({"a": 1});

    let diff = JsonDiff::diff(&old, &new).unwrap();
    assert_eq!(diff.len(), 1);

    match &diff.operations[0] {
      DiffOperation::Remove { path, old_value } => {
        assert_eq!(path, "b");
        assert_eq!(old_value, &json!(2));
      }
      _ => panic!("Expected Remove operation"),
    }
  }

  #[test]
  fn test_diff_modified_property() {
    let old = json!({"a": 1});
    let new = json!({"a": 2});

    let diff = JsonDiff::diff(&old, &new).unwrap();
    assert_eq!(diff.len(), 1);

    match &diff.operations[0] {
      DiffOperation::Replace { path, old_value, new_value } => {
        assert_eq!(path, "a");
        assert_eq!(old_value, &json!(1));
        assert_eq!(new_value, &json!(2));
      }
      _ => panic!("Expected Replace operation"),
    }
  }

  #[test]
  fn test_apply_diff() {
    let old = json!({"a": 1, "b": 2});
    let new = json!({"a": 2, "c": 3});

    let diff = JsonDiff::diff(&old, &new).unwrap();
    let result = diff.apply(old).unwrap();

    assert_eq!(result, new);
  }
}
