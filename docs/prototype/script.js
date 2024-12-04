// 模拟AI响应
const mockResponses = [
    "我来帮您分析一下这段代码...",
    "这是一个很好的问题。让我为您解释一下...",
    "根据您的描述，我建议可以这样实现：\n```python\ndef example():\n    print('Hello World')\n```",
    "您说得对，不过我们还可以考虑以下几点..."
];

// 面板控制
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const otherPanels = ['settingsPanel', 'filePanel', 'logPanel'].filter(id => id !== panelId);
    
    // 关闭其他面板
    otherPanels.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
    
    // 切换当前面板
    panel.classList.toggle('active');
}

function toggleSettings() {
    togglePanel('settingsPanel');
}

function toggleFilePanel() {
    togglePanel('filePanel');
}

function toggleLogs() {
    togglePanel('logPanel');
}

// 模型状态模拟
let modelStatus = {
    connected: true,
    type: 'local'
};

function handleModelChange(value) {
    modelStatus.type = value;
    // 模拟连接过程
    showToast('正在切换模型...');
    setTimeout(() => {
        modelStatus.connected = Math.random() > 0.3; // 随机模拟连接成功或失败
        updateModelStatus();
        showToast(modelStatus.connected ? '模型切换成功' : '模型连接失败');
    }, 1000);
}

function updateModelStatus() {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    
    dot.style.background = modelStatus.connected ? '#4CAF50' : '#ff5252';
    text.textContent = modelStatus.connected ? 
        `${modelStatus.type === 'local' ? 'Llama2' : 'GPT'} 已连接` : 
        '模型未连接';
}

// 文件操作模拟
function simulateFileRead() {
    showToast('正在读取文件...');
    setTimeout(() => {
        addMessage('文件内容已读取：\n```python\ndef example():\n    return "Hello World"\n```', 'ai');
    }, 500);
}

function simulateFileWrite() {
    showToast('正在写入文件...');
    setTimeout(() => {
        showToast('文件写入成功');
    }, 500);
}

// 发送消息
function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    
    if (text) {
        // 检查模型状态
        if (!modelStatus.connected) {
            showToast('错误：模型未连接');
            return;
        }
        
        // 添加用户消息
        addMessage(text, 'user');
        input.value = '';

        // 显示思考状态
        showThinking();
        
        // 模拟AI响应
        setTimeout(() => {
            const response = generateResponse(text);
            addMessage(response, 'ai');
            hideThinking();
        }, 1000 + Math.random() * 2000);
    }
}

// 添加消息到对话区域
function addMessage(text, type) {
    const messages = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // 如果包含代码块，进行特殊处理
    if (text.includes('```')) {
        const parts = text.split('```');
        parts.forEach((part, index) => {
            if (index % 2 === 0) {
                // 普通文本
                if (part.trim()) {
                    contentDiv.appendChild(document.createTextNode(part));
                }
            } else {
                // 代码块
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = part.trim();
                pre.appendChild(code);
                contentDiv.appendChild(pre);
            }
        });
    } else {
        contentDiv.textContent = text;
    }
    
    messageDiv.appendChild(contentDiv);
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
}

// 清空输入
function clearInput() {
    document.getElementById('userInput').value = '';
}

// 显示思考状态
function showThinking() {
    const messages = document.getElementById('messages');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = 'message ai thinking';
    thinkingDiv.innerHTML = '<div class="message-content">正在思考...</div>';
    messages.appendChild(thinkingDiv);
    messages.scrollTop = messages.scrollHeight;
}

// 隐藏思考状态
function hideThinking() {
    const thinking = document.querySelector('.thinking');
    if (thinking) {
        thinking.remove();
    }
}

// 工具栏功能
function uploadFile() {
    showToast('文件上传功能即将推出');
}

function insertCodeBlock() {
    const input = document.getElementById('userInput');
    const code = '```python\n# 在这里输入代码\n```';
    const start = input.selectionStart;
    const end = input.selectionEnd;
    
    input.value = input.value.substring(0, start) + code + input.value.substring(end);
    input.focus();
    input.selectionStart = start + code.indexOf('#');
    input.selectionEnd = start + code.indexOf('```', 3);
}

// Toast提示
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const messageEl = toast.querySelector('.toast-message');
    messageEl.textContent = message;
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// 模拟响应生成
function generateResponse(text) {
    const responses = [
        {
            trigger: '代码',
            response: '这是一个示例代码：\n```python\ndef example():\n    print("Hello")\n    return True\n```\n\n这段代码的功能是：\n1. 打印"Hello"\n2. 返回True'
        },
        {
            trigger: '文件',
            response: '我可以帮您处理文件操作，您可以：\n1. 点击上方的文件按钮\n2. 选择读取或写入操作\n3. 查看文件列表'
        },
        {
            trigger: '设置',
            response: '您可以通过顶部的设置按钮来：\n1. 配置本地模型\n2. 调整界面主题\n3. 查看系统日志'
        }
    ];

    // 查找匹配的响应
    const matchedResponse = responses.find(r => text.includes(r.trigger));
    return matchedResponse ? matchedResponse.response : '我明白了，让我想想...';
}

// 支持按Enter发送消息
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// 模拟模型状态变化
function toggleModelStatus() {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    const isConnected = dot.style.background === 'rgb(76, 175, 80)';
    
    dot.style.background = isConnected ? '#ff5252' : '#4CAF50';
    text.textContent = isConnected ? '模型未连接' : '模型已连接';
}

// 每10秒随机切换一次模型状态（仅用于演示）
setInterval(toggleModelStatus, 10000);

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 绑定快捷键
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // 关闭所有面板
            ['settingsPanel', 'filePanel', 'logPanel'].forEach(id => {
                document.getElementById(id).classList.remove('active');
            });
        }
    });

    // 代码块复制功能
    document.addEventListener('click', (e) => {
        if (e.target.tagName === 'PRE') {
            const code = e.target.querySelector('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('代码已复制到剪贴板');
            });
        }
    });
});
