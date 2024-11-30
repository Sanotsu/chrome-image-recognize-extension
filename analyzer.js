document.addEventListener('DOMContentLoaded', () => {
  const imageUrlInput = document.getElementById('imageUrl');
  const imageFileInput = document.getElementById('imageFile');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const selectedImage = document.getElementById('selectedImage');
  const analysisResult = document.getElementById('analysisResult');
  const imagePlaceholder = document.querySelector('.image-placeholder');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  let currentImageType = null;
  let currentImageData = null;

  // 加载历史记录
  async function loadHistory() {
    const { history = [] } = await chrome.storage.local.get('history');
    historyList.innerHTML = '';

    history.reverse().forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <button class="delete-btn" title="删除此记录">删除</button>
        <img class="history-item-image" src="${item.imageData}" alt="历史图片">
        <div class="history-item-date">${new Date(item.timestamp).toLocaleString()}</div>
      `;

      // 点击历史记录项
      historyItem.addEventListener('click', (e) => {
        // 如果点击的是删除按钮，则不加载记录
        if (e.target.classList.contains('delete-btn')) {
          return;
        }
        // 加载历史记录
        currentImageType = item.imageType;
        currentImageData = item.imageData;
        selectedImage.src = item.imageData;
        analysisResult.innerHTML = marked.parse(item.result);

        // 更新选中状态
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
        historyItem.classList.add('active');
      });

      // 删除单条历史记录
      historyItem.querySelector('.delete-btn').addEventListener('click', async (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        if (confirm('确定要删除这条记录吗？')) {
          const { history = [] } = await chrome.storage.local.get('history');
          // 反转后的索引需要重新计算原始位置
          const originalIndex = history.length - 1 - index;
          history.splice(originalIndex, 1);
          await chrome.storage.local.set({ history });
          loadHistory();
        }
      });

      historyList.appendChild(historyItem);
    });
  }

  // 保存到历史记录
  async function saveToHistory(imageType, imageData, result) {
    const { history = [] } = await chrome.storage.local.get('history');

    // 限制历史记录数量为50条
    if (history.length >= 50) {
      history.shift();
    }

    history.push({
      imageType,
      imageData,
      result,
      timestamp: Date.now()
    });

    await chrome.storage.local.set({ history });
    loadHistory();
  }

  // 清空历史记录
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      await chrome.storage.local.remove('history');
      loadHistory();
    }
  });

  // 处理图片URL输入
  imageUrlInput.addEventListener('change', () => {
    const url = imageUrlInput.value.trim();
    if (url) {
      selectedImage.src = url;
      currentImageType = 'url';
      currentImageData = url;
    }
  });

  // 处理图片文件上传
  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedImage.src = e.target.result;
        currentImageType = 'base64';
        currentImageData = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // 分析图片
  analyzeBtn.addEventListener('click', async () => {
    if (!currentImageData) {
      alert('请先选择或上传图片');
      return;
    }

    try {
      const settings = await chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'model', 'prompt']);
      if (!settings.apiKey) {
        alert('请先在设置中配置API Key');
        return;
      }

      analyzeBtn.disabled = true;
      analyzeBtn.classList.add('loading');
      analysisResult.innerHTML = '<p>正在分析中...</p>';

      let imageContent;
      if (currentImageType === 'url') {
        imageContent = {
          type: 'image_url',
          image_url: {
            url: currentImageData
          }
        };
      } else {
        const base64Data = currentImageData.split(',')[1];
        imageContent = {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Data}`
          }
        };
      }

      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: settings.prompt || '请详细描述这张图片的内容，使用Markdown格式输出，包含合适的标题、段落和列表等结构。'
                },
                imageContent
              ]
            }
          ],
          max_tokens: 1000
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || '分析失败');
      }

      let markdownContent = data.choices[0].message.content;

      if (markdownContent.toLowerCase().startsWith('```markdown') && markdownContent.endsWith('```')) {
        markdownContent = markdownContent.slice(11, -3).trim();
      }

      if (markdownContent.startsWith('```') && markdownContent.endsWith('```')) {
        markdownContent = markdownContent.slice(3, -3).trim();
      }

      console.log("转化后的md内容", marked.parse(markdownContent))

      analysisResult.innerHTML = marked.parse(markdownContent);

      // 保存到历史记录
      await saveToHistory(currentImageType, currentImageData, markdownContent);

    } catch (error) {
      analysisResult.innerHTML = `<p class="error">分析失败：${error.message}</p>`;
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.classList.remove('loading');
    }
  });

  // 处理图片加载错误
  selectedImage.addEventListener('error', () => {
    imagePlaceholder.style.display = 'block';
    selectedImage.style.display = 'none';
    currentImageType = null;
    currentImageData = null;
    alert('图片加载失败，请检查URL是否正确');
  });

  // 初始加载历史记录
  loadHistory();
}); 