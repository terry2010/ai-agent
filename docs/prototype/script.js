// 模拟AI响应
const mockResponses = [
    "我来帮您分析一下这段代码...",
    "这是一个很好的问题。让我为您解释一下...",
    "根据您的描述，我建议可以这样实现：\n```python\ndef example():\n    print('Hello World')\n```",
    "您说得对，不过我们还可以考虑以下几点..."
];

// 发送消息
function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    
    if (text) {
        // 添加用户消息
        addMessage(text, 'user');
        input.value = '';

        // 模拟AI思考时间，然后回复
        setTimeout(() => {
            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
            addMessage(randomResponse, 'ai');
        }, 1000);
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
