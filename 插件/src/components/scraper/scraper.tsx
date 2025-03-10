import React, { useState } from 'react';
import { Button, Input, List, message, Modal } from 'antd';
import { DownloadOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons';

interface ScraperProps {
  onDataFetched?: (data: any) => void;
}

const WebScraper: React.FC<ScraperProps> = ({ onDataFetched }) => {
  const [urls, setUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const addUrl = () => {
    if (!newUrl) return;
    if (!newUrl.startsWith('http')) {
      message.error('请输入有效的URL');
      return;
    }
    setUrls([...urls, newUrl]);
    setNewUrl('');
  };

  const removeUrl = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls);
  };

  const handleBatchUrls = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const urlList = e.target.value
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && url.startsWith('http'));
    setUrls(urlList);
  };

  const scrapeData = async () => {
    if (urls.length === 0) {
      message.warning('请至少添加一个URL');
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url);
          const text = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(text, 'text/html');
          
          return {
            url,
            title: doc.title,
            content: doc.body.textContent?.slice(0, 200) + '...',
          };
        })
      );

      setScrapedData(results);
      if (onDataFetched) {
        onDataFetched(results);
      }
      message.success('数据抓取成功！');
    } catch (error) {
      message.error('抓取数据时出错');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (scrapedData.length === 0) {
      message.warning('没有可导出的数据');
      return;
    }

    const dataStr = JSON.stringify(scrapedData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scraped-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="web-scraper">
      <div className="scraper-header">
        <Button 
          type="primary" 
          icon={<LinkOutlined />}
          onClick={showModal}
          className="add-urls-button"
        >
          管理URL列表
        </Button>
      </div>

      <Modal
        title="管理URL列表"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            关闭
          </Button>,
          <Button 
            key="scrape" 
            type="primary" 
            onClick={() => {
              handleCancel();
              scrapeData();
            }}
            disabled={urls.length === 0}
          >
            开始抓取
          </Button>
        ]}
        width={800}
      >
        <div className="url-manager">
          <div className="url-input-section">
            <Input.TextArea
              placeholder="批量输入URL（每行一个）"
              rows={4}
              onChange={handleBatchUrls}
              className="batch-input"
            />
            <div className="single-url-input">
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="输入单个URL"
                onPressEnter={addUrl}
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={addUrl}
              >
                添加
              </Button>
            </div>
          </div>

          <List
            className="url-list"
            bordered
            dataSource={urls}
            renderItem={(url, index) => (
              <List.Item
                actions={[
                  <Button type="link" danger onClick={() => removeUrl(index)}>
                    删除
                  </Button>
                ]}
              >
                {url}
              </List.Item>
            )}
          />
        </div>
      </Modal>

      {scrapedData.length > 0 && (
        <div className="results">
          <div className="results-header">
            <h3>抓取结果：</h3>
            <Button
              icon={<DownloadOutlined />}
              onClick={exportData}
              type="primary"
            >
              导出数据
            </Button>
          </div>
          <List
            bordered
            dataSource={scrapedData}
            renderItem={(item) => (
              <List.Item>
                <div>
                  <h4>{item.title}</h4>
                  <p>{item.url}</p>
                  <p>{item.content}</p>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default WebScraper; 