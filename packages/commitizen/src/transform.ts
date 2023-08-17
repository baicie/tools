import esbuild from 'esbuild'

export async function transformTypeScript(
  code: string,
) {
  const res = await esbuild.transform(code, {
    loader: 'ts',
    platform: 'browser',
    format: 'esm',
    logLevel: 'error',
    target: 'es2020',
    sourcemap: true,
    charset: 'utf8',
  })

  return res.code
}
