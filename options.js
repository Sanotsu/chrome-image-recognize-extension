document.addEventListener('DOMContentLoaded', () => {
  // 加载保存的设置
  chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'model', 'prompt'], (result) => {
    document.getElementById('apiKey').value = result.apiKey || '';
    document.getElementById('apiEndpoint').value = result.apiEndpoint || 'https://api.openai.com/v1/chat/completions';
    document.getElementById('model').value = result.model || 'gpt-4-vision-preview';
    document.getElementById('prompt').value = result.prompt || '请详细描述这张图片的内容，使用Markdown格式输出，包含合适的标题、段落和列表等结构。';
  });

  // 保存设置
  document.getElementById('saveBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    const apiEndpoint = document.getElementById('apiEndpoint').value;
    const model = document.getElementById('model').value;
    const prompt = document.getElementById('prompt').value;

    chrome.storage.sync.set({
      apiKey,
      apiEndpoint,
      model,
      prompt
    }, () => {
      alert('设置已保存！');
    });
  });
}); 