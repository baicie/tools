# NAPI + Vue 3 测试页面

这个项目演示了如何在Vue 3应用中使用Rust原生绑定(NAPI)，特别是JSON差异计算功能。

## 功能特性

- 🔢 **Plus 100 测试**: 基础的NAPI函数调用示例
- 📊 **JSON Diff 测试**: 完整的JSON差异计算和应用演示
- 🎯 **预设测试用例**: 快速测试不同场景的JSON差异
- 🛠️ **错误处理**: 完整的错误显示和处理
- 📱 **响应式设计**: 支持移动端和桌面端

## 运行项目

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 测试页面功能

### 1. Plus 100 测试
点击按钮测试基本的Rust函数调用，返回输入值加100的结果。

### 2. JSON Diff 测试

#### 手动输入测试
- 在"原始 JSON"和"新 JSON"文本框中输入JSON数据
- 点击"计算差异"按钮查看差异操作
- 点击"应用差异"按钮将差异应用到原始JSON

#### 预设测试用例
提供了4个预设测试用例：
- **基础属性修改**: 简单值修改
- **添加新属性**: 添加新字段
- **删除属性**: 删除现有字段
- **嵌套对象**: 复杂嵌套结构

### 3. 差异操作类型
系统支持三种差异操作：
- `add`: 添加新属性
- `remove`: 删除现有属性
- `replace`: 替换属性值

## 技术栈

- **前端**: Vue 3 + TypeScript + Vite
- **后端**: Rust + NAPI-RS
- **构建**: Rolldown + esbuild
- **运行时**: WebAssembly (WASM)

## API 接口

### jsonDiff(oldJson: string, newJson: string): string
计算两个JSON字符串的差异，返回差异操作的JSON字符串。

### applyJsonDiff(jsonStr: string, diffOperations: string): string
将差异操作应用到JSON字符串，返回应用后的JSON字符串。

### plus100(input: number): number
简单的数学运算，返回输入值加100的结果。

## 项目结构

```
playground/napi-vue3/
├── src/
│   ├── App.vue          # 主应用组件
│   └── main.ts          # 应用入口
├── public/              # 静态资源
├── dist/                # 构建输出
├── package.json         # 项目配置
├── vite.config.ts       # Vite配置
└── tsconfig*.json       # TypeScript配置
```

## 注意事项

- 该项目依赖于`@baicie/napi-browser`包提供的WebAssembly运行时
- 首次加载时需要初始化WASM模块，可能会有短暂的加载时间
- 所有JSON处理都在客户端进行，无需服务器端支持
