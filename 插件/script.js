const API_KEY = 'sk-iclunnxwciaecoccggnxsnfdjxktykqklahszldfendzrgaf';
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';  // 这里使用智谱AI的API地址

let currentChatId = Date.now().toString();
let currentMessages = [];

// 添加新的变量来跟踪loading状态
let isLoading = false;

// 添加新的全局变量
let folders = JSON.parse(localStorage.getItem('folders') || '{}');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 绑定事件监听器
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    document.getElementById('userInput').addEventListener('keypress', handleEnterPress);
    document.getElementById('uploadBtn').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
    document.getElementById('historyBtn').addEventListener('click', showHistory);
    document.getElementById('newChatBtn').addEventListener('click', startNewChat);
    document.getElementById('newFolderBtn').addEventListener('click', createNewFolder);
    
    // 关闭模态框的点击事件
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('historyModal').style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('historyModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 从chrome.storage同步数据到localStorage
    try {
        const result = await chrome.storage.local.get('chatHistory');
        if (result.chatHistory) {
            localStorage.setItem('chatHistory', JSON.stringify(result.chatHistory));
        }
    } catch (error) {
        console.error('Error syncing storage:', error);
    }
    
    cleanupOldHistory();
    initializeDragAndDrop();
});

function handleEnterPress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message || isLoading) return;
    
    addMessageToChat('user', message);
    userInput.value = '';
    
    // 添加loading指示器
    isLoading = true;
    const loadingDiv = addLoadingIndicator();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "THUDM/glm-4-9b-chat",
                messages: [...currentMessages, { role: "user", content: message }]
            })
        });
        
        const data = await response.json();
        
        // 移除loading指示器
        loadingDiv.remove();
        isLoading = false;
        
        if (data.choices && data.choices[0]) {
            const aiResponse = data.choices[0].message.content;
            addMessageToChat('ai', aiResponse);
            currentMessages.push(
                { role: "user", content: message },
                { role: "assistant", content: aiResponse }
            );
            saveCurrentChat();
        } else {
            throw new Error('Invalid response from API');
        }
    } catch (error) {
        console.error('Error:', error);
        loadingDiv.remove();
        isLoading = false;
        addMessageToChat('ai', '抱歉，发生了错误，请稍后重试。');
    }
}

function addMessageToChat(role, content) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    // 创建头像元素
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = role === 'user' ? '👤' : '🤖';
    
    // 创建消息内容元素
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    // 组装消息
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const content = await readFileContent(file);
        const message = `请分析以下文件内容：\n\n${content}`;
        document.getElementById('userInput').value = message;
    } catch (error) {
        console.error('Error reading file:', error);
        addMessageToChat('ai', '文件读取失败，请重试。');
    }
}

function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function showHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    
    Object.entries(chatHistory)
        .sort(([,a], [,b]) => b.timestamp - a.timestamp)
        .forEach(([chatId, chat]) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.draggable = true; // 添加可拖动属性
            historyItem.dataset.chatId = chatId; // 添加数据属性
            
            // 创建内容容器
            const contentDiv = document.createElement('div');
            contentDiv.className = 'history-item-content';
            contentDiv.textContent = `${new Date(chat.timestamp).toLocaleString()} - ${chat.title || chat.messages[0]?.content.substring(0, 50) || '新对话'}...`;
            contentDiv.onclick = () => loadChat(chatId);
            
            // 创建操作按钮容器
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-item-actions';
            
            // 重命名按钮
            const renameBtn = document.createElement('button');
            renameBtn.className = 'history-action-btn';
            renameBtn.innerHTML = '✏️';
            renameBtn.title = '重命名';
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                renameHistoryItem(chatId, contentDiv);
            };
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-action-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = '删除';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteHistoryItem(chatId, historyItem);
            };
            
            // 组装元素
            actionsDiv.appendChild(renameBtn);
            actionsDiv.appendChild(deleteBtn);
            historyItem.appendChild(contentDiv);
            historyItem.appendChild(actionsDiv);
            
            // 添加拖拽事件监听器
            historyItem.addEventListener('dragstart', handleDragStart);
            historyItem.addEventListener('dragend', handleDragEnd);
            
            historyList.appendChild(historyItem);
        });
    
    document.getElementById('historyModal').style.display = 'block';
    renderFolders();
}

function loadChat(chatId) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    const chat = chatHistory[chatId];
    
    if (chat) {
        document.getElementById('chatContainer').innerHTML = '';
        currentChatId = chatId;
        currentMessages = chat.messages;
        
        chat.messages.forEach(msg => {
            addMessageToChat(msg.role === 'user' ? 'user' : 'ai', msg.content);
        });
    }
    
    document.getElementById('historyModal').style.display = 'none';
}

function startNewChat() {
    if (currentMessages.length > 0) {
        saveCurrentChat();
    }
    
    document.getElementById('chatContainer').innerHTML = '';
    currentMessages = [];
    currentChatId = Date.now().toString();
}

function saveCurrentChat() {
    if (currentMessages.length === 0) return;
    
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    const existingChat = chatHistory[currentChatId];
    
    chatHistory[currentChatId] = {
        messages: currentMessages,
        timestamp: Date.now(),
        title: existingChat?.title || currentMessages[0]?.content.substring(0, 50) || '新对话'
    };
    
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    
    // 同步更新chrome.storage
    chrome.storage.local.set({ chatHistory: chatHistory });
}

function cleanupOldHistory() {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const newHistory = Object.fromEntries(
        Object.entries(chatHistory).filter(([, chat]) => chat.timestamp > sevenDaysAgo)
    );
    
    localStorage.setItem('chatHistory', JSON.stringify(newHistory));
}

function renameHistoryItem(chatId, contentDiv) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    const chat = chatHistory[chatId];
    
    const input = document.createElement('input');
    input.className = 'rename-input';
    input.value = chat.title || chat.messages[0]?.content.substring(0, 50) || '新对话';
    
    const originalContent = contentDiv.innerHTML;
    contentDiv.innerHTML = '';
    contentDiv.appendChild(input);
    input.focus();
    
    const handleRename = () => {
        const newTitle = input.value.trim();
        if (newTitle) {
            chatHistory[chatId].title = newTitle;
            
            // 同时更新localStorage和chrome.storage
            localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            chrome.storage.local.set({ chatHistory: chatHistory });
            
            contentDiv.textContent = `${new Date(chat.timestamp).toLocaleString()} - ${newTitle}...`;
        } else {
            contentDiv.innerHTML = originalContent;
        }
    };
    
    input.onblur = handleRename;
    input.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRename();
        }
    };
}

function deleteHistoryItem(chatId, historyItem) {
    if (confirm('确定要删除这条历史记录吗？')) {
        const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
        delete chatHistory[chatId];
        
        // 同时更新localStorage和chrome.storage
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        chrome.storage.local.set({ chatHistory: chatHistory });
        
        historyItem.remove();
        
        // 如果删除的是当前对话，清空当前对话
        if (chatId === currentChatId) {
            startNewChat();
        }
    }
}

function addLoadingIndicator() {
    const chatContainer = document.getElementById('chatContainer');
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'typing-indicator';
    loadingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return loadingDiv;
}

function createNewFolder() {
    const folderName = prompt('请输入文件夹名称：');
    if (!folderName) return;
    
    const folderId = 'folder_' + Date.now();
    folders[folderId] = {
        name: folderName,
        chats: []
    };
    
    saveFolders();
    renderFolders();
}

function renderFolders() {
    const container = document.getElementById('importantChats');
    container.innerHTML = '';
    
    Object.entries(folders).forEach(([folderId, folder]) => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder';
        folderDiv.dataset.folderId = folderId;
        
        // 创建文件夹头部
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        
        // 创建文件夹图标、名称和操作按钮
        const headerContent = document.createElement('div');
        headerContent.className = 'folder-header-content';
        headerContent.innerHTML = `
            <div class="folder-icon">📁</div>
            <div class="folder-name">${folder.name}</div>
        `;
        
        // 创建文件夹操作按钮
        const folderActions = document.createElement('div');
        folderActions.className = 'folder-actions';
        
        // 删除文件夹按钮
        const deleteFolderBtn = document.createElement('button');
        deleteFolderBtn.className = 'folder-action-btn';
        deleteFolderBtn.innerHTML = '🗑️';
        deleteFolderBtn.title = '删除文件夹';
        deleteFolderBtn.onclick = (e) => {
            e.stopPropagation();
            deleteFolder(folderId);
        };
        
        // 折叠按钮
        const toggleBtn = document.createElement('div');
        toggleBtn.className = 'folder-toggle';
        toggleBtn.innerHTML = '▼';
        
        folderActions.appendChild(deleteFolderBtn);
        folderActions.appendChild(toggleBtn);
        
        folderHeader.appendChild(headerContent);
        folderHeader.appendChild(folderActions);
        
        // 创建文件夹内容容器
        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content expanded';
        
        // 渲染文件夹内的聊天记录
        if (folder.chats && folder.chats.length > 0) {
            folder.chats.forEach(chat => {
                const chatItem = document.createElement('div');
                chatItem.className = 'history-item';
                chatItem.draggable = true;
                chatItem.dataset.chatId = chat.id;
                
                const chatContent = document.createElement('div');
                chatContent.className = 'history-item-content';
                chatContent.textContent = `${new Date(chat.timestamp).toLocaleString()} - ${chat.title || chat.messages[0]?.content.substring(0, 50) || '新对话'}...`;
                chatContent.onclick = () => loadChat(chat.id);
                
                chatItem.appendChild(chatContent);
                folderContent.appendChild(chatItem);
                
                chatItem.addEventListener('dragstart', handleDragStart);
                chatItem.addEventListener('dragend', handleDragEnd);
            });
        } else {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-folder-message';
            emptyMessage.textContent = '文件夹为空';
            folderContent.appendChild(emptyMessage);
        }
        
        // 添加折叠/展开功能
        folderHeader.addEventListener('click', () => {
            const toggle = folderHeader.querySelector('.folder-toggle');
            const isExpanded = folderContent.classList.contains('expanded');
            
            if (isExpanded) {
                folderContent.classList.remove('expanded');
                toggle.classList.add('collapsed');
            } else {
                folderContent.classList.add('expanded');
                toggle.classList.remove('collapsed');
            }
        });
        
        // 添加拖放事件监听器
        folderDiv.addEventListener('dragover', handleDragOver);
        folderDiv.addEventListener('dragleave', handleDragLeave);
        folderDiv.addEventListener('drop', handleDrop);
        
        // 组装文件夹
        folderDiv.appendChild(folderHeader);
        folderDiv.appendChild(folderContent);
        container.appendChild(folderDiv);
    });
}

function initializeDragAndDrop() {
    // 为历史记录项添加拖动功能
    document.querySelectorAll('.history-item').forEach(item => {
        if (!item.hasAttribute('draggable')) {  // 防止重复添加
            item.draggable = true;
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        }
    });

    // 为文件夹添加放置区域
    document.querySelectorAll('.folder').forEach(folder => {
        folder.addEventListener('dragover', handleDragOver);
        folder.addEventListener('dragleave', handleDragLeave);
        folder.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    e.stopPropagation();
    const item = e.target.closest('.history-item');
    if (!item) return;

    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'chat',
        chatId: item.dataset.chatId,
        source: item.closest('.folder') ? item.closest('.folder').dataset.folderId : 'history'
    }));
    
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    e.target.closest('.history-item').classList.remove('dragging');
    document.querySelectorAll('.folder').forEach(folder => {
        folder.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const folder = e.target.closest('.folder');
    if (folder) {
        folder.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const folder = e.target.closest('.folder');
    if (folder && !folder.contains(e.relatedTarget)) {
        folder.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const folder = e.target.closest('.folder');
    if (!folder) return;
    
    folder.classList.remove('drag-over');
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'chat') {
            moveChat(data.chatId, data.source, folder.dataset.folderId);
        }
    } catch (error) {
        console.error('Drop error:', error);
    }
}

function moveChat(chatId, sourceLocation, targetFolderId) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    const chat = chatHistory[chatId];
    
    if (!chat) return;
    
    // 如果源和目标相同，不执行移动
    if (sourceLocation === targetFolderId) return;
    
    // 从源位置移除
    if (sourceLocation === 'history') {
        delete chatHistory[chatId];
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        chrome.storage.local.set({ chatHistory: chatHistory });
    } else {
        const sourceFolder = folders[sourceLocation];
        if (sourceFolder) {
            sourceFolder.chats = sourceFolder.chats.filter(c => c.id !== chatId);
        }
    }
    
    // 添加到目标位置
    if (targetFolderId === 'history') {
        chatHistory[chatId] = chat;
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
        chrome.storage.local.set({ chatHistory: chatHistory });
    } else {
        if (!folders[targetFolderId].chats) {
            folders[targetFolderId].chats = [];
        }
        folders[targetFolderId].chats.push({
            id: chatId,
            ...chat
        });
        saveFolders();
    }
    
    // 刷新显示
    showHistory();
}

function showFolderContent(folderId) {
    const folderDiv = document.querySelector(`[data-folder-id="${folderId}"]`);
    const folderContent = folderDiv.querySelector('.folder-content');
    const toggle = folderDiv.querySelector('.folder-toggle');
    
    const isExpanded = folderContent.classList.contains('expanded');
    
    if (isExpanded) {
        folderContent.classList.remove('expanded');
        toggle.classList.add('collapsed');
    } else {
        folderContent.classList.add('expanded');
        toggle.classList.remove('collapsed');
    }
}

function saveFolders() {
    localStorage.setItem('folders', JSON.stringify(folders));
    chrome.storage.local.set({ folders: folders });
}

// 添加删除文件夹功能
function deleteFolder(folderId) {
    if (!confirm('确定要删除此文件夹吗？文件夹内的对话将被移回历史记录。')) return;
    
    const folder = folders[folderId];
    if (!folder) return;
    
    // 将文件夹内的对话移回历史记录
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '{}');
    
    if (folder.chats) {
        folder.chats.forEach(chat => {
            chatHistory[chat.id] = {
                messages: chat.messages,
                timestamp: chat.timestamp,
                title: chat.title
            };
        });
    }
    
    // 更新历史记录
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    chrome.storage.local.set({ chatHistory: chatHistory });
    
    // 删除文件夹
    delete folders[folderId];
    saveFolders();
    
    // 刷新显示
    showHistory();
} 