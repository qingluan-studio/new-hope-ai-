import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#1a1a26',
    primaryTextColor: '#e4e4ec',
    primaryBorderColor: '#f59e0b',
    lineColor: '#8b5cf6',
    secondaryColor: '#12121a',
    tertiaryColor: '#0a0a0f',
  },
  securityLevel: 'sandbox',
})

export async function renderMermaidDiagrams(container: HTMLElement) {
  const elements = container.querySelectorAll('pre code.language-mermaid')
  for (const el of elements) {
    try {
      const parent = el.parentElement
      if (!parent) continue
      const code = el.textContent || ''
      const id = 'mermaid-' + Math.random().toString(36).slice(2, 8)
      const { svg } = await mermaid.render(id, code)
      const wrapper = document.createElement('div')
      wrapper.className = 'mermaid-wrapper'
      wrapper.innerHTML = svg
      parent.replaceWith(wrapper)
    } catch {
      // Mermaid parse failed, keep original code block
    }
  }
}
