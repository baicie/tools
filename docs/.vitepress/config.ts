import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'baicie tools',
  description: '一个现代化的前端工具链集合',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '首页', link: '/' },
      { text: 'CLI', link: '/cli/' },
      { text: 'Pkg', link: '/pkg/' },
      { text: 'Tools', link: '/tools/' },
      { text: 'Storage', link: '/storage/' },
      { text: 'Release', link: '/release/' },
    ],

    sidebar: {
      '/cli/': [
        {
          text: '@baicie/cli',
          items: [
            { text: '介绍', link: '/cli/' },
            { text: '快速开始', link: '/cli/getting-started' },
            { text: '命令', link: '/cli/commands' },
            { text: '模板', link: '/cli/templates' },
          ],
        },
      ],
      '/pkg/': [
        {
          text: '@baicie/pkg',
          items: [
            { text: '介绍', link: '/pkg/' },
            { text: '快速开始', link: '/pkg/getting-started' },
            { text: 'API 文档', link: '/pkg/api' },
            { text: '示例', link: '/pkg/examples' },
          ],
        },
      ],
      '/tools/': [
        {
          text: '@baicie/tools',
          items: [
            { text: '介绍', link: '/tools/' },
            { text: '快速开始', link: '/tools/getting-started' },
            { text: '数组工具', link: '/tools/array' },
            { text: '对象工具', link: '/tools/object' },
            { text: '字符串工具', link: '/tools/string' },
            { text: '数字工具', link: '/tools/number' },
            { text: '日期工具', link: '/tools/date' },
            { text: '函数工具', link: '/tools/function' },
            { text: 'Promise 工具', link: '/tools/promise' },
            { text: '类型判断', link: '/tools/type' },
            { text: '验证工具', link: '/tools/validate' },
            { text: 'URL 工具', link: '/tools/url' },
            { text: '随机工具', link: '/tools/random' },
          ],
        },
      ],
      '/storage/': [
        {
          text: '@baicie/storage',
          items: [
            { text: '介绍', link: '/storage/' },
            { text: '快速开始', link: '/storage/getting-started' },
            { text: 'API 文档', link: '/storage/api' },
          ],
        },
      ],
      '/release/': [
        {
          text: '@baicie/release',
          items: [
            { text: '介绍', link: '/release/' },
            { text: '快速开始', link: '/release/getting-started' },
            { text: 'API 文档', link: '/release/api' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/baicie/tools' }],
  },
})
