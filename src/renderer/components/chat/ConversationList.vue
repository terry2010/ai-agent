<template>
  <div class="conversation-list">
    <div class="list-header">
      <el-button type="primary" @click="createNewConversation" size="small">
        新建对话
      </el-button>
    </div>
    
    <el-scrollbar>
      <div class="list-content">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: conversation.id === currentConversationId }"
          @click="selectConversation(conversation.id)"
        >
          <div class="title-wrapper">
            <el-input
              v-if="editingId === conversation.id"
              v-model="editingTitle"
              size="small"
              @blur="saveTitle(conversation.id)"
              @keyup.enter="saveTitle(conversation.id)"
              ref="titleInput"
            />
            <span v-else class="title" @dblclick="startEditing(conversation)">
              {{ conversation.title }}
            </span>
          </div>
          
          <div class="actions">
            <el-tooltip content="编辑标题" placement="top" :hide-after="1000">
              <el-button
                type="text"
                @click.stop="startEditing(conversation)"
                :class="{ 'hidden': editingId === conversation.id }"
              >
                <i class="el-icon-edit" />
              </el-button>
            </el-tooltip>
            
            <el-tooltip content="删除对话" placement="top" :hide-after="1000">
              <el-popconfirm
                title="确定要删除这个对话吗？"
                @confirm="deleteConversation(conversation.id)"
                @click.stop
              >
                <template #reference>
                  <el-button type="text" :class="{ 'hidden': editingId === conversation.id }">
                    <i class="el-icon-delete" />
                  </el-button>
                </template>
              </el-popconfirm>
            </el-tooltip>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useChatStore } from '../../stores/chatStore'

const chatStore = useChatStore()

const conversations = computed(() => chatStore.conversations)
const currentConversationId = computed(() => chatStore.currentConversationId)

const editingId = ref(null)
const editingTitle = ref('')

function createNewConversation() {
  chatStore.createNewConversation()
}

function selectConversation(id) {
  chatStore.selectConversation(id)
}

function startEditing(conversation) {
  editingId.value = conversation.id
  editingTitle.value = conversation.title
  // 等待DOM更新后聚焦输入框
  setTimeout(() => {
    const input = document.querySelector('.conversation-item.active .el-input__inner')
    if (input) input.focus()
  }, 0)
}

function saveTitle(id) {
  if (editingTitle.value.trim()) {
    chatStore.updateConversationTitle(id, editingTitle.value)
  }
  editingId.value = null
}

function deleteConversation(id) {
  chatStore.deleteConversation(id)
}
</script>

<style scoped>
.conversation-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color);
}

.list-header {
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color);
}

.list-content {
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.conversation-item:hover {
  background-color: var(--el-fill-color-light);
}

.conversation-item.active {
  background-color: var(--el-color-primary-light-9);
}

.title-wrapper {
  flex: 1;
  margin-right: 8px;
  overflow: hidden;
}

.title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .actions {
  opacity: 1;
}

.hidden {
  display: none;
}

:deep(.el-scrollbar__wrap) {
  height: 100%;
}
</style>
