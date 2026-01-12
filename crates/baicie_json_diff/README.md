# baicie_json_diff

一个用于计算和应用JSON差异的Rust crate。

## 功能特性

- 计算两个JSON值的差异
- 支持添加、删除和替换操作
- 可以将差异应用到原始JSON值
- 支持嵌套对象的差异计算
- 完整的错误处理

## 使用方法

### 基本用法

```rust
use baicie_json_diff::JsonDiff;
use serde_json::json;

// 计算两个JSON对象的差异
let old = json!({"name": "Alice", "age": 25});
let new = json!({"name": "Alice", "age": 26, "city": "Beijing"});

let diff = JsonDiff::diff(&old, &new).unwrap();

// 查看差异操作
for operation in &diff.operations {
    println!("{:?}", operation);
}

// 应用差异到原始值
let result = diff.apply(old).unwrap();
assert_eq!(result, new);
```

### 从JSON字符串计算差异

```rust
use baicie_json_diff::JsonDiff;

let old_json = r#"{"users": [{"name": "Alice"}]}"#;
let new_json = r#"{"users": [{"name": "Alice"}, {"name": "Bob"}]}"#;

let diff = JsonDiff::diff_str(old_json, new_json).unwrap();
```

### 差异操作类型

- `Add`: 添加新属性或值
- `Remove`: 删除现有属性或值
- `Replace`: 替换现有值

## API文档

### JsonDiff

主要结构体，用于表示JSON差异。

#### 方法

- `new() -> Self`: 创建新的JsonDiff实例
- `diff(old: &Value, new: &Value) -> Result<Self, JsonDiffError>`: 计算两个JSON值的差异
- `diff_str(old: &str, new: &str) -> Result<Self, JsonDiffError>`: 从JSON字符串计算差异
- `len(&self) -> usize`: 获取操作数量
- `is_empty(&self) -> bool`: 检查是否有差异
- `apply(&self, value: Value) -> Result<Value, JsonDiffError>`: 应用差异到JSON值

### DiffOperation

表示单个差异操作的枚举。

```rust
pub enum DiffOperation {
    Add { path: String, value: Value },
    Remove { path: String, old_value: Value },
    Replace { path: String, old_value: Value, new_value: Value },
}
```

### JsonDiffError

错误类型。

```rust
#[derive(Error, Debug)]
pub enum JsonDiffError {
    #[error("JSON parse error: {0}")]
    ParseError(#[from] serde_json::Error),
    #[error("Invalid JSON value type")]
    InvalidType,
}
```

## 许可证

MIT License
