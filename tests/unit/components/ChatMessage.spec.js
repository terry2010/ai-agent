import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ChatMessage from '@/renderer/components/ChatMessage.vue'

describe('ChatMessage.vue', () => {
  it('renders message content correctly', () => {
    const wrapper = mount(ChatMessage, {
      props: {
        content: 'Test message',
        isAI: false
      }
    })
    expect(wrapper.text()).toContain('Test message')
    expect(wrapper.text()).toContain('User')
  })

  it('displays AI role correctly', () => {
    const wrapper = mount(ChatMessage, {
      props: {
        content: 'AI response',
        isAI: true
      }
    })
    expect(wrapper.text()).toContain('AI')
    expect(wrapper.text()).toContain('AI response')
  })

  it('renders markdown content correctly', () => {
    const wrapper = mount(ChatMessage, {
      props: {
        content: '# Header\n- List item',
        isAI: true
      }
    })
    const text = wrapper.text()
    expect(text).toContain('Header')
    expect(text).toContain('List item')
  })

  it('handles code blocks correctly', () => {
    const wrapper = mount(ChatMessage, {
      props: {
        content: '```javascript\nconst test = "code";\n```',
        isAI: true
      }
    })
    expect(wrapper.text()).toContain('const test = "code";')
  })

  it('formats timestamp correctly', () => {
    const timestamp = new Date('2024-02-20T12:00:00').getTime()
    const wrapper = mount(ChatMessage, {
      props: {
        content: 'Test message',
        isAI: false,
        timestamp
      }
    })
    expect(wrapper.find('.time').exists()).toBe(true)
    expect(wrapper.find('.time').text()).toMatch(/\d{1,2}:\d{2}:\d{2}/)
  })
})
