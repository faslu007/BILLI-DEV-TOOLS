// content.js
class BaseExecution {
    constructor() {
        this.features = [];
        this.init();
    }

    init() {
        // Initialize environment indicator
        this.initEnvironmentFeature();
        // Initialize network panel
        this.initNetworkPanelFeature();
        
        // Initialize all features
        this.executeFeatures();
    }

    initEnvironmentFeature() {
        const envFeature = new EnvironmentFeature();
        this.features.push(envFeature);
    }

    initNetworkPanelFeature() {
        const networkPanelFeature = new NetworkPanelFeature();
        this.features.push(networkPanelFeature);
    }

    executeFeatures() {
        // Execute when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.runFeatures());
        } else {
            this.runFeatures();
        }
    }

    runFeatures() {
        this.features.forEach(feature => {
            if (typeof feature.execute === 'function') {
                feature.execute();
            }
        });
    }
}

class EnvironmentFeature {
    constructor() {
        this.environments = {
            'qa.aimapms.com': {
                color: '#FF9800',
                label: 'QA',
                shortLabel: '[QA]'
            },
            'qa2.aimapms.com': {
                color: '#9C27B0',
                label: 'QA2',
                shortLabel: '[QA2]'
            },
            'qa3.aimapms.com': {
                color: '#2196F3',
                label: 'QA3',
                shortLabel: '[QA3]'
            },
            'localhost': {
                color: '#4CAF50',
                label: 'LOCAL',
                shortLabel: '[LOCAL]'
            }
        };
    }

    execute() {
        this.applyCustomizations();
    }

    getEnvironmentInfo(url) {
        try {
            const hostname = new URL(url).hostname;
            return this.environments[hostname] || null;
        } catch (error) {
            console.error('Error parsing URL:', error);
            return null;
        }
    }

    updateDocumentTitle() {
        const envInfo = this.getEnvironmentInfo(window.location.href);
        if (!envInfo) return;

        let currentTitle = document.title;
        const envTags = Object.values(this.environments)
            .map(info => info.shortLabel);

        // Remove existing environment tags
        envTags.forEach(tag => {
            currentTitle = currentTitle.replace(tag, '').trim();
        });

        document.title = `${envInfo.shortLabel} ${currentTitle}`;
    }

    addEnvironmentIndicator() {
        const envInfo = this.getEnvironmentInfo(window.location.href);
        if (!envInfo) return;

        this.removeExistingIndicator();
        const { indicator, envText } = this.createIndicatorElements(envInfo);
        document.body.appendChild(indicator);
        document.body.appendChild(envText);
    }

    removeExistingIndicator() {
        const existingElements = [
            document.getElementById('environment-indicator'),
            document.getElementById('environment-text')
        ];

        existingElements.forEach(element => {
            if (element) element.remove();
        });
    }

    createIndicatorElements(envInfo) {
        const indicator = document.createElement('div');
        indicator.id = 'environment-indicator';
        Object.assign(indicator.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            height: '5px',
            backgroundColor: envInfo.color,
            zIndex: '9999',
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            transition: 'all 0.3s ease'
        });

        const envText = document.createElement('div');
        envText.id = 'environment-text';
        Object.assign(envText.style, {
            position: 'fixed',
            top: '5px',
            right: '10px',
            padding: '4px 8px',
            backgroundColor: envInfo.color,
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            borderRadius: '0 0 4px 4px',
            zIndex: '9999',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
        });
        envText.textContent = envInfo.label;

        return { indicator, envText };
    }

    applyCustomizations() {
        this.addEnvironmentIndicator();
        this.updateDocumentTitle();
    }
}

class NetworkPanelFeature {
    constructor() {
        this.panel = null;
        this.requests = [];
        this.maxRequests = 10;
    }

    execute() {
        this.createPanel();
        this.addPanelToggle();
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'network-request') {
                debugger
                this.addRequest(message.data);
            }
        });
    }

    addRequest(request) {
        this.requests.unshift(request);
        if (this.requests.length > this.maxRequests) {
            this.requests = this.requests.slice(0, this.maxRequests);
        }
        this.updatePanel();
    }

    getMethodColor(method) {
        switch (method) {
            case 'GET':
                return 'green';
            case 'POST':
                return 'blue';
            case 'PUT':
                return 'orange';
            case 'DELETE':
                return 'red';
            default:
                return 'black';
        }
    }

    getStatusColor(status) {
        if (status >= 200 && status < 300) {
            return 'green';
        } else if (status >= 300 && status < 400) {
            return 'yellow';
        } else {
            return 'red';
        }
    }

    formatData(data) {
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return data || 'No data';
        }
    }

    formatTimestamp(timestamp) {
        try {
            // Handle timestamp in seconds (if it's not already in milliseconds)
            if (timestamp.toString().length === 10) {
                timestamp *= 1000;
            }

            const date = new Date(timestamp);

            // Ensure valid date
            if (isNaN(date)) return timestamp;

            const options = {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            };

            // Get the formatted string
            let formattedDate = date.toLocaleString('en-US', options);

            // Adjust AM/PM formatting to your desired style
            formattedDate = formattedDate.replace(' AM', 'A').replace(' PM', 'P');

            return formattedDate;
        } catch (e) {
            return timestamp;
        }
    }

    initJsonViewer(elementId, data) {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Using JSONEditor if available, otherwise fallback to formatted pre
        if (window.JSONEditor) {
            new JSONEditor(element, {
                mode: 'view',
                modes: ['view'],
                data: data
            });
        } else {
            element.innerHTML = `<pre style="margin: 0; white-space: pre-wrap;">${this.formatData(data)}</pre>`;
        }
    }

    updatePanel() {
        const content = document.getElementById('network-monitor-content');
        if (!content) return;

        content.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Path</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Expand</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.requests.map((request, index) => `
                        <tr>
                            <td>${this.formatTimestamp(request.timestamp)}</td>
                            <td>
                                <div style="font-weight: bold; font-size: 12px;">${request.path}</div>
                                ${request.params ? `
                                    <small style="color: #666; font-size: 11px;">
                                        Params: ${this.formatData(request.params)}
                                    </small>
                                ` : ''}
                            </td>
                            <td><span class="method" style="color: ${this.getMethodColor(request.method)}">${request.method}</span></td>
                            <td><span class="status" style="color: ${this.getStatusColor(request.status)}">${request.status}</span></td>
                            <td>
                                <button class="toggle-details" data-index="${index}">
                                    <span class="toggle-icon">▶</span>
                                </button>
                                <div class="details" id="request-details-${index}" style="display: none;">
                                    <div class="json-viewer-tabs">
                                        <button class="tab-button active" data-tab="request-${index}">Request</button>
                                        <button class="tab-button" data-tab="response-${index}">Response</button>
                                    </div>
                                    <div class="tab-content" id="request-${index}" style="display: block;">
                                        <div class="json-viewer">
                                            <h4>Request Body</h4>
                                            <div class="json-tree" id="request-body-${index}"></div>
                                        </div>
                                        ${request.params ? `
                                            <div class="json-viewer">
                                                <h4>URL Parameters</h4>
                                                <div class="json-tree" id="request-params-${index}"></div>
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="tab-content" id="response-${index}" style="display: none;">
                                        <div class="json-viewer">
                                            <h4>Response Body</h4>
                                            <div class="json-tree" id="response-body-${index}"></div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        // Add click event listeners to all toggle buttons
        content.querySelectorAll('.toggle-details').forEach(button => {
            button.addEventListener('click', (e) => {
                // Find the closest button if clicked on child element
                const button = e.target.closest('.toggle-details');
                if (!button) return;

                const index = button.getAttribute('data-index');
                const details = document.getElementById(`request-details-${index}`);
                const icon = button.querySelector('.toggle-icon');

                if (details) {
                    const isExpanded = details.style.display !== 'none';
                    details.style.display = isExpanded ? 'none' : 'block';

                    // Rotate arrow icon
                    if (icon) {
                        icon.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(90deg)';
                    }

                    // Update aria-expanded state
                    button.setAttribute('aria-expanded', !isExpanded);
                }
            });
        });

        // After rendering HTML, initialize JSON viewers and tab functionality
        this.requests.forEach((request, index) => {
            // Initialize JSON viewers
            this.initJsonViewer(`request-body-${index}`, request.requestBody);
            if (request.params) {
                this.initJsonViewer(`request-params-${index}`, request.params);
            }
            this.initJsonViewer(`response-body-${index}`, request.responseBody);

            // Add tab functionality
            const tabButtons = document.querySelectorAll(`.tab-button[data-tab]`);
            tabButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    const tabId = e.target.getAttribute('data-tab');
                    const tabContents = e.target.closest('.details').querySelectorAll('.tab-content');
                    const buttons = e.target.closest('.json-viewer-tabs').querySelectorAll('.tab-button');

                    tabContents.forEach(content => {
                        content.style.display = content.id === tabId ? 'block' : 'none';
                    });
                    buttons.forEach(btn => {
                        btn.classList.toggle('active', btn === e.target);
                    });
                });
            });
        });
    }

    addPanelToggle() {
        const envText = document.getElementById('environment-text');
        if (envText) {
            envText.style.cursor = 'pointer';
            envText.addEventListener('click', () => this.togglePanel());
        }
    }

    togglePanel() {
        if (this.panel) {
            this.panel.style.display = this.panel.style.display === 'none' ? 'flex' : 'none';
        }
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'network-monitor-panel';
        Object.assign(panel.style, {
            position: 'fixed',
            right: '10px',
            top: '40px',
            width: '1200px',
            height: '700px',
            backgroundColor: 'white',
            boxShadow: '0 0 10px rgba(0,0,0,0.2)',
            borderRadius: '4px',
            zIndex: '10000',
            display: 'none',
            flexDirection: 'column',
            fontFamily: 'Arial, sans-serif',
            resize: 'both',
            overflow: 'auto'
        });

        const header = document.createElement('div');
        Object.assign(header.style, {
            padding: '10px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px 4px 0 0'
        });

        const title = document.createElement('h3');
        title.textContent = 'Network Monitor';
        title.style.margin = '0';

        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        Object.assign(closeButton.style, {
            border: 'none',
            background: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0 5px'
        });
        closeButton.onclick = () => this.togglePanel();

        header.appendChild(title);
        header.appendChild(closeButton);

        const content = document.createElement('div');
        content.id = 'network-monitor-content';
        Object.assign(content.style, {
            padding: '10px',
            overflowY: 'auto',
            height: '100%'
        });

        panel.appendChild(header);
        panel.appendChild(content);
        document.body.appendChild(panel);
        this.panel = panel;

        const style = document.createElement('style');
        style.textContent = `
            .json-viewer-tabs {
                border-bottom: 1px solid #ddd;
                margin-bottom: 10px;
            }
            .tab-button {
                padding: 8px 16px;
                border: none;
                background: none;
                cursor: pointer;
                opacity: 0.7;
            }
            .tab-button.active {
                border-bottom: 2px solid #2196F3;
                opacity: 1;
            }
            .json-viewer {
                margin: 10px 0;
                padding: 10px;
                background: #f8f8f8;
                border-radius: 4px;
            }
            .json-tree {
                font-family: monospace;
                font-size: 12px;
                max-height: 300px;
                overflow: auto;
            }
            .toggle-icon {
                display: inline-block;
                transition: transform 0.2s;
            }
            .toggle-details[aria-expanded="true"] .toggle-icon {
                transform: rotate(90deg);
            }
        `;
        panel.appendChild(style);

        const toggleIconStyle = document.createElement('style');
        style.textContent = `
            .toggle-details {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px 8px;
                display: flex;
                align-items: center;
                color: #2196F3;
            }
            .toggle-icon {
                display: inline-block;
                transition: transform 0.2s ease;
                font-size: 12px;
                margin-right: 4px;
            }
        `;
        panel.appendChild(toggleIconStyle);
    }
}

// Initialize the base execution
new BaseExecution();
