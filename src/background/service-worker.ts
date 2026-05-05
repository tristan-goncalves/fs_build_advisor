const OLLAMA_ORIGIN_RULE_ID = 1;

async function installOllamaOriginRule(): Promise<void> {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [OLLAMA_ORIGIN_RULE_ID],
      addRules: [
        {
          id: OLLAMA_ORIGIN_RULE_ID,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            requestHeaders: [
              {
                header: "origin",
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: "http://localhost",
              },
            ],
          },
          condition: {
            requestDomains: ["localhost", "127.0.0.1"],
            resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
          },
        },
      ],
    });
    console.info("[FS Build Advisor] règle DNR Origin→http://localhost installée");
  } catch (err) {
    console.error("[FS Build Advisor] échec installation règle DNR :", err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    ?.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.error("[FS Build Advisor] sidePanel setup error:", err));
  void installOllamaOriginRule();
});

chrome.runtime.onStartup.addListener(() => {
  void installOllamaOriginRule();
});

chrome.action?.onClicked?.addListener?.((tab) => {
  if (tab.windowId !== undefined) {
    chrome.sidePanel?.open?.({ windowId: tab.windowId }).catch(() => {
    });
  }
});

export {};
