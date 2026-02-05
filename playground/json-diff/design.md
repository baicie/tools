# JSON 差异化渲染实现说明（Rendering Layer）

本文说明类似 Git / 配置对比工具中的 **JSON 差异化渲染** 是如何实现的，重点在 **渲染层设计**，不展开 diff 算法本身。

---

## 一、核心思想

差异化渲染的关键不在于字符串，而在于：

> **把 JSON 文本拆解为「行 + token」，再对 token 应用差异样式**

最终渲染的不是字符串，而是结构化数据。

---

## 二、渲染数据模型

### 1. 行模型（RenderLine）

```ts
type RenderLine = {
  no: number;          // 行号
  indent: number;      // 缩进层级
  tokens: RenderToken[];
};
2. Token 模型（RenderToken）
type RenderToken = {
  text: string;        // 显示文本
  kind: 'key' | 'value' | 'punctuation';
  diff?: 'added' | 'removed' | 'modified';
};
差异信息始终附着在 token 上，而不是整行。

三、JSON → 行（保持格式）
function jsonToLines(obj) {
  return JSON.stringify(obj, null, 2).split('\n');
}
说明：

使用 JSON.stringify(obj, null, 2) 保证缩进一致

每一行单独渲染，便于行号与高亮控制

四、行 → Token（关键步骤）
1. JSON 行 tokenizer
function tokenizeLine(line) {
  const tokens = [];

  // 缩进
  const indent = line.match(/^\s*/)[0];
  if (indent) {
    tokens.push({ text: indent, kind: 'punctuation' });
  }

  const content = line.trim();

  // key-value 行
  const keyMatch = content.match(/^"([^"]+)":/);
  if (keyMatch) {
    tokens.push({ text: `"${keyMatch[1]}"`, kind: 'key' });
    tokens.push({ text: ': ', kind: 'punctuation' });

    const value = content.slice(keyMatch[0].length);
    tokens.push({ text: value, kind: 'value' });
  } else {
    // 纯值 / 结构符号
    tokens.push({ text: content, kind: 'value' });
  }

  return tokens;
}
说明：

key / value / 标点符号分离

为后续差异高亮提供最小颗粒度

五、差异信息如何作用到渲染
1. diff 数据结构示例
const diffMap = {
  'config.timeout': 'modified',
  'config.debug': 'added',
  'permissions[2]': 'added'
};
2. 路径计算（渲染时维护）
渲染时维护一个 path 栈：

let pathStack = [];
每解析到 key 时更新路径，用于查找 diffMap。

3. 将 diff 映射到 token
function applyDiff(tokens, path) {
  const diffType = diffMap[path];
  if (!diffType) return tokens;

  return tokens.map(token =>
    token.kind === 'value'
      ? { ...token, diff: diffType }
      : token
  );
}
规则：

key 通常不高亮

value 才是差异承载点

六、DOM / React 渲染示例
function Line({ line }) {
  return (
    <div className="line">
      <span className="line-no">{line.no}</span>
      {line.tokens.map((t, i) => (
        <span
          key={i}
          className={[
            'token',
            t.kind,
            t.diff && `diff-${t.diff}`
          ].join(' ')}
        >
          {t.text}
        </span>
      ))}
    </div>
  );
}
七、样式（视觉差异的来源）
.line {
  white-space: pre;
  font-family: monospace;
}

.line-no {
  user-select: none;
  color: #999;
  margin-right: 8px;
}

.token.key {
  color: #0b4ddb;
}

.token.value {
  color: #24292f;
}

.diff-modified {
  background: #fff3cd;
}

.diff-added {
  background: #e6f4ff;
}

.diff-removed {
  background: #ffecec;
}
八、特殊情况说明
<anonymous> / line 0 / col 0
当：

无 source

无 stack

无行列信息

可直接渲染为：

{ text: '<anonymous>', kind: 'value', diff: 'unknown' }
并整体标记为未知来源错误。

九、工程级优化建议
行号与内容分离（避免复制时带行号）

hover 高亮整行

基于 path 前缀折叠对象

大 JSON 使用虚拟列表（virtual scroll）

十、总结
差异化渲染的本质是：

JSON → 行 → token → token 样式

真正复杂的不是 diff 算法，而是 渲染结构的拆分粒度是否合理。

只要 token 设计正确，任何 diff 结果都可以被优雅渲染。


---

如果你愿意，我可以下一步直接帮你补：
- ✅ **JSON diff viewer 完整 demo（React / Vue）**
- ✅ **错误栈 diff（stacktrace 高亮版）**
- ✅ **类似 VS Code / GitHub 的 unified / split 视图**

你这个 md 是准备放在 **项目文档 / 技术方案 / 对外 SDK 文档** 哪一类？
```
