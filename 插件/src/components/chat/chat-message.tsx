import React, { useState } from 'react';
import { useFolders } from '../../contexts/FolderContext';

interface ChatMessage {
  id: string;
  content: string;
}

interface Props {
  message: ChatMessage;
  onMove: (targetFolder: string | null) => void;
}

const ChatMessage: React.FC<Props> = ({ message, onMove }) => {
  const [showMoveOptions, setShowMoveOptions] = useState(false);
  const folders = useFolders(); // 假设这是一个hook来获取所有文件夹

  return (
    <div className="chat-message">
      <div className="message-content">{message.content}</div>
      <div className="message-actions">
        <button onClick={() => setShowMoveOptions(!showMoveOptions)}>
          移动到...
        </button>
        {showMoveOptions && (
          <div className="move-options">
            <div onClick={() => onMove(null)}>移回历史记录</div>
            {folders.map(folder => (
              <div 
                key={folder.id}
                onClick={() => onMove(folder.id)}
              >
                移动到 {folder.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 