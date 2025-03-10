import React from 'react';
import WebScraper from './components/scraper/scraper';
import 'antd/dist/antd.css';
import './styles/scraper.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <WebScraper />
    </div>
  );
};

export default App; 