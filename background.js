let currentTab;
const version = "1.0";
const requestStore = new Map();

// Add URL pattern matching
const API_PATTERNS = [
    /^https?:\/\/[^/]*aimapms\.com\/api\/.*/,  // Matches *.aimapms.com/api/*
    /^https?:\/\/127\.0\.0\.1:\d+\/api\/.*/
];

function isApiRequest(url) {
    return API_PATTERNS.some(pattern => pattern.test(url));
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'P' : 'A';
    
    hours = hours % 12;
    hours = hours ? hours : 12;
    hours = String(hours).padStart(2, '0');

    return `${month}-${day}-${year} ${hours}:${minutes}${ampm}`;
}

function parseUrlAndParams(url) {
    try {
        const urlObj = new URL(url);
        const params = {};
        urlObj.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return {
            path: urlObj.pathname,
            params: Object.keys(params).length > 0 ? params : null
        };
    } catch (e) {
        return { path: url, params: null };
    }
}

function parseRequestBody(postData) {
    if (!postData) return null;
    
    try {
        // Try parsing as JSON
        return JSON.parse(postData);
    } catch (e) {
        try {
            // Try parsing as URL encoded form data
            const params = {};
            const searchParams = new URLSearchParams(postData);
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
            return Object.keys(params).length > 0 ? params : null;
        } catch (e) {
            return postData; // Return as is if parsing fails
        }
    }
}

function parseResponseData(data) {
    if (!data) return null;

    try {
        // If it's already an object/array, return as is
        if (typeof data === 'object') return data;

        // Try parsing as JSON
        const parsed = JSON.parse(data);
        return parsed;
    } catch (e) {
        // If it's a number string, convert to number
        if (!isNaN(data)) return Number(data);
        
        // Return as string if all else fails
        return data;
    }
}

function handleRequest(tabId, params) {
    const { requestId, request, timestamp } = params;
    const { path, params: urlParams } = parseUrlAndParams(request.url);
    
    requestStore.set(requestId, {
        timestamp,
        method: request.method,
        path,
        params: urlParams,
        requestBody: parseRequestBody(request.postData),
        type: request.resourceType
    });
}

async function handleResponse(tabId, params) {
    const { requestId, response } = params;
    const storedRequest = requestStore.get(requestId);
    
    if (!storedRequest) return;

    try {
        const responseBody = await new Promise((resolve, reject) => {
            chrome.debugger.sendCommand({
                tabId
            }, "Network.getResponseBody", {
                requestId
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(response);
                }
            });
        });

        const completeRequest = {
            ...storedRequest,
            status: response.status,
            responseBody: parseResponseData(responseBody?.body),
            timestamp: formatDate(storedRequest.timestamp * 1000)
        };

        chrome.tabs.sendMessage(tabId, {
            type: 'network-request',
            data: completeRequest
        });

        console.log('Network Request:', {
            path: completeRequest.path,
            method: completeRequest.method,
            params: completeRequest.params,
            requestBody: completeRequest.requestBody,
            responseBody: completeRequest.responseBody,
            status: completeRequest.status
        });

        requestStore.delete(requestId);

    } catch (error) {
        console.error('Error handling response:', error);
    }
}

// Initialize debugger for a tab
function initializeDebugger(tab) {
    currentTab = tab;
    chrome.debugger.attach({ tabId: tab.id }, version, 
        onAttach.bind(null, tab.id));
}

function onAttach(tabId) {
    chrome.debugger.sendCommand({ tabId }, "Network.enable");
    chrome.debugger.onEvent.addListener(onDebuggerEvent);
}

async function onDebuggerEvent(debuggeeId, message, params) {
    if (!currentTab || currentTab.id !== debuggeeId.tabId) return;

    switch (message) {
        case "Network.requestWillBeSent":
            if (isApiRequest(params.request.url)) {
                handleRequest(debuggeeId.tabId, params);
            }
            break;
        case "Network.responseReceived":
            if (isApiRequest(params.response.url)) {
                await handleResponse(debuggeeId.tabId, params);
            }
            break;
    }
}

// Initialize debugger when tab is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (chrome.runtime.lastError) return;
        initializeDebugger(tab);
    });
});

// Cleanup when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    if (currentTab && currentTab.id === tabId) {
        chrome.debugger.detach({ tabId });
        currentTab = null;
    }
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'get-requests') {
        const requests = Array.from(requestStore.values())
            .filter(req => isApiRequest(req.url))
            .map(req => ({
                ...req,
                timestamp: formatDate(req.timestamp * 1000)
            }));
        sendResponse(requests);
    }
    return true;
});
