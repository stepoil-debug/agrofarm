const pageBaseUrl = new URL('./', window.location.href).href

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {})
  })
}

document.addEventListener('click', (event) => {
  const target = event.target.closest?.('[data-action="login"]')
  if (!target) return

  const config = window.AGROFARM_CONFIG || {}
  if (!config.supabaseUrl || !config.supabaseAnonKey) return

  event.preventDefault()
  event.stopPropagation()

  const redirect = encodeURIComponent(pageBaseUrl)
  const authUrl = `${config.supabaseUrl.replace(/\/$/, '')}/auth/v1/authorize?provider=google&redirect_to=${redirect}`
  window.location.assign(authUrl)
}, true)
