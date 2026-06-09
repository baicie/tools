import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf-8')) as T
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf-8')
}

export function fileExists(file: string): boolean {
  return existsSync(file)
}

export function readText(file: string): string {
  return readFileSync(file, 'utf-8')
}

export async function writeText(file: string, value: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, value, 'utf-8')
}
