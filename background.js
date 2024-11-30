chrome.action.onClicked.addListener((tab) => {
  chrome.windows.getCurrent({}, (currentWindow) => {
    const width = Math.floor(currentWindow.width * 0.8);
    const height = Math.floor(currentWindow.height * 0.8);
    const left = Math.floor((currentWindow.width - width) / 2);
    const top = Math.floor((currentWindow.height - height) / 2);

    chrome.windows.create({
      url: 'analyzer.html',
      type: 'popup',
      width: width,
      height: height,
      left: left,
      top: top
    });
  });
}); 