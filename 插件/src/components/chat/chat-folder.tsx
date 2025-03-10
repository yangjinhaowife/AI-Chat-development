import React, { useState } from 'react';
import ChatMessage from './ChatMessage';

interface Props {
  folder: { name: string };
  messages: any[];
  moveToFolder: (messageId: string, targetFolder: { name: string }) => void;
}

const ChatFolder: React.FC<Props> = ({ folder, messages, moveToFolder }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="chat-folder">
      <div className="folder-header" onClick={toggleExpand}>
        <span className={`folder-icon ${isExpanded ? 'expanded' : ''}`}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="folder-name">{folder.name}</span>
      </div>
      {isExpanded && (
        <div className="folder-content">
          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message}
              onMove={(targetFolder) => moveToFolder(message.id, targetFolder)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatFolder; 