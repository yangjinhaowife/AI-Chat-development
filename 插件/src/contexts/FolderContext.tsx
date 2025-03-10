import React, { createContext, useContext, useState } from 'react';

interface Folder {
  id: string;
  name: string;
}

const FolderContext = createContext<Folder[]>([]);

export const FolderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [folders] = useState<Folder[]>([]);
  return <FolderContext.Provider value={folders}>{children}</FolderContext.Provider>;
};

export const useFolders = () => useContext(FolderContext); 