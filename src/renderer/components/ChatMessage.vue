<template>
  <div class="message" :class="{ 'message-ai': isAI, 'message-user': !isAI }">
    <div class="message-content">
      <div class="message-header">
        <span class="sender">{{ isAI ? 'AI' : 'User' }}</span>
        <span class="time">{{ formatTime(timestamp) }}</span>
      </div>
      <div class="message-body">
        <MdPreview :modelValue="content" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  isAI: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Number,
    default: () => Date.now()
  }
})

const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}
</script>

<style scoped>
.message {
  margin: 10px 0;
  max-width: 80%;
  padding: 10px;
  border-radius: 8px;
}

.message-ai {
  margin-right: auto;
  background-color: #f4f6f8;
}

.message-user {
  margin-left: auto;
  background-color: #e3f2fd;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
  font-size: 0.9em;
  color: #666;
}

.message-body {
  font-size: 1em;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.md-preview) {
  background: transparent;
  border: none;
  padding: 0;
}

:deep(.md-preview pre) {
  background: #f8f9fa;
  border-radius: 4px;
  padding: 1em;
}
</style>
