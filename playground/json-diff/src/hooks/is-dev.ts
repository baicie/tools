export function isDev() {
  console.log(import.meta.env)
  return import.meta.env.MODE === 'development'
}
