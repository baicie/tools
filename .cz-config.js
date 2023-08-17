// .cz-config.js

'use strict';

module.exports = {  
  types: [
       {value: 'feat',     name: 'feat:      一个新的特性'},
       {value: 'fix',      name: 'fix:       修复一个Bug'},
       {value: 'docs',     name: 'docs:      变更的只有文档'},
       {value: 'style',    name: 'style:     空格, 分号等格式修复'},
       {value: 'refactor', name: 'refactor:  代码重构，注意和特性、修复区分开'},
       {value: 'perf',     name: 'perf:      提升性能'},
       {value: 'test',     name: 'test:      添加一个测试'},
       {value: 'build',    name: 'build:     影响构建系统或外部依赖项的更改'},
       {value: 'ci',       name: 'ci:        更改为我们的CI配置文件和脚本'},
   ],
   messages: {
       type: '选择一种你的提交类型:',
       scope: '选择一个scope (可选):',
       customScope: '模块名称:',
       subject: '短描述:\n',
       body: '长描述，使用"|"换行(可选)：\n',
       breaking: '非兼容性说明 (可选):\n',
       footer: '关联关闭的issue，例如：#1, #2(可选):\n',
       confirmCommit: '确定提交?'
   },
   allowCustomScopes: true,
   allowBreakingChanges: ['feat', 'fix'],
   subjectLimit: 100
};
