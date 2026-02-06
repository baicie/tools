import { useState } from 'react'
import { type DiffItem, diffJson } from '@baicie/napi-browser'
import Button from '../components/button'

interface PerfTestResult {
  jsonSize: number
  diffCount: number
  duration: number
  items: DiffItem[]
}

interface PerfTestButtonProps {
  onComplete?: (oldJson: string, newJson: string) => void
}

export default function PerfTestButton({ onComplete }: PerfTestButtonProps) {
  const [result, setResult] = useState<PerfTestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  // 生成指定大小的随机 JSON
  const generateRandomJson = (sizeKB: number): string => {
    const data: Record<string, any> = {
      metadata: {
        version: '1.0.0',
        timestamp: Date.now(),
        source: 'perf-test',
      },
      users: [],
    }

    // 计算需要多少条数据才能达到目标大小
    const targetSize = sizeKB * 1024
    const itemSize = 500 // 每条数据大约 500 字节
    const count = Math.floor(targetSize / itemSize)

    for (let i = 0; i < count; i++) {
      data.users.push({
        id: i,
        name: `User_${i}`,
        email: `user${i}@example.com`,
        age: Math.floor(Math.random() * 100),
        city: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu'][
          Math.floor(Math.random() * 5)
        ],
        active: Math.random() > 0.3,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'].slice(
          0,
          Math.floor(Math.random() * 5) + 1,
        ),
        profile: {
          avatar: `https://avatar.example.com/${i}.jpg`,
          bio: `This is user ${i}'s bio.`.repeat(10),
          settings: {
            theme: 'dark',
            language: 'zh-CN',
            notifications: true,
          },
        },
        createdAt: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        lastLogin: new Date().toISOString(),
      })
    }

    return JSON.stringify(data)
  }

  // 生成修改后的 JSON（添加、修改、删除一些字段）
  const generateModifiedJson = (originalJson: string): string => {
    const data = JSON.parse(originalJson)

    // 添加新用户
    data.users.push({
      id: 999999,
      name: 'New_User',
      email: 'new@example.com',
      age: 25,
      city: 'Hangzhou',
      active: true,
      tags: ['new', 'vip'],
      profile: {
        avatar: 'https://avatar.example.com/new.jpg',
        bio: 'New user bio',
        settings: {
          theme: 'light',
          language: 'en-US',
          notifications: false,
        },
      },
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    })

    // 修改部分用户
    for (let i = 0; i < Math.min(100, data.users.length); i++) {
      data.users[i].age = Math.floor(Math.random() * 100)
      data.users[i].city = 'Updated_City'
    }

    // 删除部分用户
    data.users = data.users.filter(
      (_: unknown, index: number) => index % 10 !== 0,
    )

    // 添加新字段
    data.metadata.updated = true
    data.metadata.updateTime = Date.now()

    return JSON.stringify(data)
  }

  const runPerfTest = async () => {
    setIsRunning(true)
    setResult(null)

    // 给 UI 时间更新
    await new Promise(resolve => setTimeout(resolve, 100))

    try {
      // 生成 1MB 的测试数据
      const oldJson = generateRandomJson(1024) // 1MB
      const newJson = generateModifiedJson(oldJson)

      // 测量 diff 性能
      const startTime = performance.now()
      const items = diffJson(oldJson, newJson)
      const endTime = performance.now()

      setResult({
        jsonSize: Math.floor(oldJson.length / 1024),
        diffCount: items.length,
        duration: Number((endTime - startTime).toFixed(2)),
        items,
      })

      // 回调通知父组件渲染结果
      if (onComplete) {
        onComplete(oldJson, newJson)
      }
    } catch (error) {
      console.error('Performance test failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={runPerfTest}
        disabled={isRunning}
        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isRunning ? '测试中...' : '运行性能测试 (1MB JSON)'}
      </Button>

      {result && (
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">
            性能测试结果
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {result.jsonSize} KB
              </div>
              <div className="text-sm text-gray-400">JSON 大小</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {result.diffCount}
              </div>
              <div className="text-sm text-gray-400">差异数量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {result.duration} ms
              </div>
              <div className="text-sm text-gray-400">执行时间</div>
            </div>
          </div>

          {/* 差异统计 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">差异类型分布</h4>
            <div className="flex gap-2 text-xs">
              {['add', 'remove', 'replace'].map(op => {
                const count = result.items.filter(
                  item => item.operation === op,
                ).length
                const color =
                  op === 'add'
                    ? 'bg-green-500'
                    : op === 'remove'
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                return (
                  <div key={op} className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-gray-400">{op}:</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 前 5 条差异预览 */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              差异预览 (前5条)
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {result.items.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs font-mono"
                >
                  <span
                    className={`px-1.5 py-0.5 rounded text-white ${
                      item.operation === 'add'
                        ? 'bg-green-500'
                        : item.operation === 'remove'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                    }`}
                  >
                    {item.operation}
                  </span>
                  <span className="text-gray-300 truncate">{item.path}</span>
                </div>
              ))}
              {result.items.length > 5 && (
                <div className="text-xs text-gray-500">
                  ... 还有 {result.items.length - 5} 条差异
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
