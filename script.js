class DualAgent {
    constructor() {
        this.apiKey = null;
        this.agent1Output = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadExampleTemplates();
    }

    initializeElements() {
        // API Key elements
        this.apiKeyInput = document.getElementById('apiKey');
        this.testKeyBtn = document.getElementById('testKey');
        this.keyStatus = document.getElementById('keyStatus');

        // Task elements
        this.userTaskInput = document.getElementById('userTask');
        this.analyzeTaskBtn = document.getElementById('analyzeTask');

        // Agent 1 elements
        this.agent1Status = document.getElementById('agent1Status');
        this.agent1Output = document.getElementById('agent1Output');
        this.editAgent1Btn = document.getElementById('editAgent1');
        this.proceedToAgent2Btn = document.getElementById('proceedToAgent2');

        // Agent 2 elements
        this.targetInput = document.getElementById('targetInput');
        this.agent2Status = document.getElementById('agent2Status');
        this.agent2Output = document.getElementById('agent2Output');
        this.executeTaskBtn = document.getElementById('executeTask');
        this.resetWorkflowBtn = document.getElementById('resetWorkflow');

        // Example cards
        this.exampleCards = document.querySelectorAll('.example-card');
    }

    bindEvents() {
        // API Key events - auto-save when user enters key
        this.testKeyBtn.addEventListener('click', () => this.testApiKey());
        this.apiKeyInput.addEventListener('input', () => this.handleKeyInput());
        this.apiKeyInput.addEventListener('blur', () => this.processApiKey());
        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.apiKeyInput.blur(); // Trigger processing
            }
        });

        // Task events
        this.analyzeTaskBtn.addEventListener('click', () => this.runAgent1());
        this.userTaskInput.addEventListener('input', () => this.validateTaskInput());

        // Agent 1 events
        this.editAgent1Btn.addEventListener('click', () => this.editAgent1Output());
        this.proceedToAgent2Btn.addEventListener('click', () => this.enableAgent2());

        // Agent 2 events
        this.executeTaskBtn.addEventListener('click', () => this.runAgent2());
        this.resetWorkflowBtn.addEventListener('click', () => this.resetWorkflow());

        // Example templates
        this.exampleCards.forEach(card => {
            card.addEventListener('click', () => {
                const task = card.dataset.task;
                this.userTaskInput.value = task;
                this.validateTaskInput();
            });
        });
    }

    loadExampleTemplates() {
        // Templates are already in HTML, just need to handle clicks
        console.log('Example templates loaded and ready');
    }

    // API Key Management
    handleKeyInput() {
        // Provide immediate feedback as user types
        const key = this.apiKeyInput.value.trim();
        
        if (key.length === 0) {
            this.keyStatus.classList.add('hidden');
            this.testKeyBtn.disabled = true;
            this.apiKey = null;
            this.validateTaskInput();
            return;
        }

        // Show typing feedback
        if (key.length < 10) {
            this.showKeyStatus('Keep typing...', 'processing');
        } else if (this.isValidKeyFormat(key)) {
            this.showKeyStatus('Press Enter or click away to save', 'processing');
        } else {
            this.showKeyStatus('Invalid format. Should start with "sk-" or "sk-proj-"', 'error');
        }
    }

    processApiKey() {
        const key = this.apiKeyInput.value.trim();
        
        if (!key) {
            this.keyStatus.classList.add('hidden');
            this.testKeyBtn.disabled = true;
            this.apiKey = null;
            this.validateTaskInput();
            return;
        }

        // Validate key format
        if (!this.isValidKeyFormat(key)) {
            this.showKeyStatus('Invalid API key format. Should start with "sk-" or "sk-proj-"', 'error');
            this.testKeyBtn.disabled = true;
            this.apiKey = null;
            this.validateTaskInput();
            return;
        }

        // Additional validation for key length
        if (key.length < 20) {
            this.showKeyStatus('API key appears too short', 'error');
            this.testKeyBtn.disabled = true;
            this.apiKey = null;
            this.validateTaskInput();
            return;
        }

        // Save the key
        this.apiKey = key;
        this.showKeyStatus('✅ API key remembered for this session', 'success');
        this.testKeyBtn.disabled = false;
        this.validateTaskInput();
        
        console.log('API key saved:', key.substring(0, 10) + '...' + key.slice(-4));
    }

    isValidKeyFormat(key) {
        return key.startsWith('sk-') || key.startsWith('sk-proj-');
    }

    async testApiKey() {
        if (!this.apiKey) {
            this.showKeyStatus('No API key to test', 'error');
            return;
        }

        this.testKeyBtn.disabled = true;
        this.showKeyStatus('🔄 Testing API key...', 'processing');

        try {
            // Test with a simple request
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: 'Test'
                        }
                    ],
                    max_tokens: 5
                })
            });

            if (response.ok) {
                this.showKeyStatus('✅ API key works perfectly!', 'success');
            } else {
                const error = await response.json();
                console.error('API Test Error:', error);
                
                let errorMessage = 'API key test failed';
                if (response.status === 401) {
                    errorMessage = '❌ Invalid API key';
                } else if (response.status === 402) {
                    errorMessage = '💳 Billing issue - check your OpenAI account';
                } else if (response.status === 403) {
                    errorMessage = '🚫 API access forbidden';
                } else if (response.status === 429) {
                    errorMessage = '⏰ Rate limited - try again later';
                }
                
                this.showKeyStatus(errorMessage, 'error');
            }
        } catch (error) {
            console.error('API Test Error:', error);
            this.showKeyStatus('❌ Network error testing API key', 'error');
        }

        this.testKeyBtn.disabled = false;
    }

    showKeyStatus(message, type) {
        this.keyStatus.textContent = message;
        this.keyStatus.className = `status ${type}`;
        this.keyStatus.classList.remove('hidden');
        
        // Don't auto-hide processing messages
        if (type !== 'processing') {
            setTimeout(() => {
                this.keyStatus.classList.add('hidden');
            }, 4000);
        }
    }

    validateTaskInput() {
        const hasKey = !!this.apiKey;
        const hasTask = this.userTaskInput.value.trim().length > 0;
        
        this.analyzeTaskBtn.disabled = !hasKey || !hasTask || this.isProcessing;
    }

    // Agent 1: Planner
    async runAgent1() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.analyzeTaskBtn.disabled = true;
        
        // Enhanced status progression
        this.updateAgent1Status('🔍 Initializing analysis...', 'processing');
        this.agent1Output.textContent = '🤖 Agent 1 is starting up...\n\nPreparing to analyze your task...';
        
        await this.delay(800); // Give user time to see the status
        
        this.updateAgent1Status('📋 Breaking down task components...', 'processing');
        this.agent1Output.textContent = '🔍 Analyzing task structure...\n\n• Identifying key objectives\n• Mapping requirements\n• Structuring analysis framework';
        
        await this.delay(1000);
        
        this.updateAgent1Status('🧠 Creating structured plan...', 'processing');
        this.agent1Output.textContent = '⚡ Generating structured framework...\n\n• Defining evaluation criteria\n• Setting constraints\n• Building action plan\n\nThis may take 10-30 seconds...';

        const userTask = this.userTaskInput.value.trim();
        const prompt = this.createAgent1Prompt(userTask);
        
        try {
            this.updateAgent1Status('🚀 Consulting OpenAI API...', 'processing');
            const response = await this.callOpenAI(prompt, 'Agent 1');
            
            this.updateAgent1Status('✅ Analysis complete!', 'success');
            this.agent1Output.textContent = response;
            this.agent1OutputData = response;
            
            this.editAgent1Btn.disabled = false;
            this.proceedToAgent2Btn.disabled = false;
            
            // Show success message briefly
            setTimeout(() => {
                this.updateAgent1Status('Ready for next step', 'ready');
            }, 2000);
            
        } catch (error) {
            this.updateAgent1Status('❌ Analysis failed', 'error');
            this.agent1Output.textContent = `🚨 Error occurred:\n\n${error.message}\n\nPlease check your API key and try again.`;
        }
        
        this.isProcessing = false;
        this.analyzeTaskBtn.disabled = false;
    }

    createAgent1Prompt(userTask) {
        return `You are Agent 1 (Planner) in a two-agent workflow. Your role is to analyze high-level tasks and create structured, detailed plans for Agent 2 to execute.

TASK TO ANALYZE: "${userTask}"

Please analyze this task and provide:

1. **TASK BREAKDOWN**: Break down the high-level task into specific components and focus areas
2. **KEY CRITERIA**: What are the most important criteria to evaluate or analyze?
3. **STRUCTURED PLAN**: Create a detailed action plan that Agent 2 can use to analyze any specific target/subject
4. **OUTPUT FORMAT**: Specify how Agent 2 should structure its response
5. **CONSTRAINTS**: Any limitations or boundaries Agent 2 should observe

Format your response as a clear, structured plan that Agent 2 can directly use. The plan should be comprehensive enough that Agent 2 can provide detailed, actionable analysis of any specific target provided to it.

Make sure the structured plan is:
- Specific and actionable
- Comprehensive in scope
- Clear in its requirements
- Professional in tone
- Results-oriented

Your output will be passed directly to Agent 2 along with a specific target/subject to analyze.`;
    }

    updateAgent1Status(status, type = 'default') {
        this.agent1Status.textContent = status;
        
        // Remove all status classes
        this.agent1Status.className = '';
        
        // Add appropriate styling based on status type
        switch(type) {
            case 'processing':
                this.agent1Status.style.background = '#fff3cd';
                this.agent1Status.style.color = '#856404';
                this.agent1Status.style.border = '1px solid #ffeaa7';
                this.agent1Status.style.animation = 'pulse 2s infinite';
                break;
            case 'success':
                this.agent1Status.style.background = '#d4edda';
                this.agent1Status.style.color = '#155724';
                this.agent1Status.style.border = '1px solid #c3e6cb';
                this.agent1Status.style.animation = 'none';
                break;
            case 'error':
                this.agent1Status.style.background = '#f8d7da';
                this.agent1Status.style.color = '#721c24';
                this.agent1Status.style.border = '1px solid #f5c6cb';
                this.agent1Status.style.animation = 'none';
                break;
            case 'ready':
                this.agent1Status.style.background = '#e2e3e5';
                this.agent1Status.style.color = '#6c757d';
                this.agent1Status.style.border = '1px solid #d6d8db';
                this.agent1Status.style.animation = 'none';
                break;
            default:
                this.agent1Status.style.background = '#e2e3e5';
                this.agent1Status.style.color = '#6c757d';
                this.agent1Status.style.border = '1px solid #d6d8db';
                this.agent1Status.style.animation = 'none';
        }
    }

    // Utility method for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    editAgent1Output() {
        const currentOutput = this.agent1Output.textContent;
        const textarea = document.createElement('textarea');
        textarea.value = currentOutput;
        textarea.style.width = '100%';
        textarea.style.height = '300px';
        textarea.style.padding = '15px';
        textarea.style.border = '2px solid #667eea';
        textarea.style.borderRadius = '8px';
        textarea.style.fontFamily = 'Courier New, monospace';
        textarea.style.fontSize = '14px';
        
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save Changes';
        saveBtn.className = 'btn btn-primary';
        saveBtn.style.marginTop = '10px';
        saveBtn.style.marginRight = '10px';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.marginTop = '10px';
        
        this.agent1Output.innerHTML = '';
        this.agent1Output.appendChild(textarea);
        this.agent1Output.appendChild(saveBtn);
        this.agent1Output.appendChild(cancelBtn);
        
        saveBtn.addEventListener('click', () => {
            this.agent1OutputData = textarea.value;
            this.agent1Output.textContent = textarea.value;
        });
        
        cancelBtn.addEventListener('click', () => {
            this.agent1Output.textContent = currentOutput;
        });
        
        textarea.focus();
    }

    enableAgent2() {
        this.targetInput.disabled = false;
        this.executeTaskBtn.disabled = false;
        this.updateAgent2Status('✅ Ready for target input', 'ready');
        
        // Focus on target input with a brief animation
        setTimeout(() => {
            this.targetInput.focus();
            this.targetInput.style.animation = 'pulse 1s';
            setTimeout(() => {
                this.targetInput.style.animation = '';
            }, 1000);
        }, 100);
    }

    // Agent 2: Responder
    async runAgent2() {
        if (this.isProcessing) return;
        
        const target = this.targetInput.value.trim();
        if (!target) {
            alert('Please enter a target/subject for analysis');
            return;
        }
        
        this.isProcessing = true;
        this.executeTaskBtn.disabled = true;
        
        // Enhanced status progression for Agent 2
        this.updateAgent2Status('⚡ Initializing execution...', 'processing');
        this.agent2Output.textContent = `🤖 Agent 2 is starting up...\n\nPreparing to analyze: "${target}"`;
        
        await this.delay(800);
        
        this.updateAgent2Status('📝 Applying structured plan...', 'processing');
        this.agent2Output.textContent = `🔍 Loading structured plan from Agent 1...\n\n• Reviewing criteria and constraints\n• Adapting framework for target\n• Preparing detailed analysis`;
        
        await this.delay(1000);
        
        this.updateAgent2Status('🎯 Executing detailed analysis...', 'processing');
        this.agent2Output.textContent = `⚡ Analyzing "${target}" using structured approach...\n\n• Applying evaluation criteria\n• Gathering insights\n• Structuring comprehensive response\n\nThis may take 15-45 seconds...`;

        const prompt = this.createAgent2Prompt(target);
        
        try {
            this.updateAgent2Status('🚀 Consulting OpenAI API...', 'processing');
            const response = await this.callOpenAI(prompt, 'Agent 2');
            
            this.updateAgent2Status('🎉 Analysis completed!', 'success');
            this.agent2Output.textContent = response;
            
            // Show success message briefly
            setTimeout(() => {
                this.updateAgent2Status('Task complete', 'ready');
            }, 2000);
            
        } catch (error) {
            this.updateAgent2Status('❌ Execution failed', 'error');
            this.agent2Output.textContent = `🚨 Error occurred:\n\n${error.message}\n\nPlease check your API key and try again.`;
        }
        
        this.isProcessing = false;
        this.executeTaskBtn.disabled = false;
    }

    createAgent2Prompt(target) {
        return `You are Agent 2 (Responder) in a two-agent workflow. You will receive a structured plan from Agent 1 and execute it on a specific target.

STRUCTURED PLAN FROM AGENT 1:
${this.agent1OutputData}

TARGET/SUBJECT TO ANALYZE: "${target}"

Please execute the structured plan above on the specified target. Follow all the guidelines, criteria, and format requirements provided by Agent 1. Provide a comprehensive, detailed analysis that directly addresses all the points outlined in the structured plan.

Be thorough, factual, and actionable in your response.`;
    }

    updateAgent2Status(status, type = 'default') {
        this.agent2Status.textContent = status;
        
        // Remove all status classes
        this.agent2Status.className = '';
        
        // Add appropriate styling based on status type
        switch(type) {
            case 'processing':
                this.agent2Status.style.background = '#fff3cd';
                this.agent2Status.style.color = '#856404';
                this.agent2Status.style.border = '1px solid #ffeaa7';
                this.agent2Status.style.animation = 'pulse 2s infinite';
                break;
            case 'success':
                this.agent2Status.style.background = '#d4edda';
                this.agent2Status.style.color = '#155724';
                this.agent2Status.style.border = '1px solid #c3e6cb';
                this.agent2Status.style.animation = 'none';
                break;
            case 'error':
                this.agent2Status.style.background = '#f8d7da';
                this.agent2Status.style.color = '#721c24';
                this.agent2Status.style.border = '1px solid #f5c6cb';
                this.agent2Status.style.animation = 'none';
                break;
            case 'ready':
                this.agent2Status.style.background = '#e2e3e5';
                this.agent2Status.style.color = '#6c757d';
                this.agent2Status.style.border = '1px solid #d6d8db';
                this.agent2Status.style.animation = 'none';
                break;
            default:
                this.agent2Status.style.background = '#e2e3e5';
                this.agent2Status.style.color = '#6c757d';
                this.agent2Status.style.border = '1px solid #d6d8db';
                this.agent2Status.style.animation = 'none';
        }
    }

    // OpenAI API Integration
    async callOpenAI(prompt, agentName) {
        if (!this.apiKey) {
            throw new Error('No API key provided');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // Using GPT-4 Omni - OpenAI's most capable model
                messages: [
                    {
                        role: 'system',
                        content: `You are ${agentName} in a dual-agent workflow system. Provide clear, structured, and actionable responses.`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            
            // Provide more specific error messages
            let errorMessage = error.error?.message || 'API request failed';
            
            if (response.status === 401) {
                errorMessage = 'Invalid API key. Please check your key at https://platform.openai.com/api-keys';
            } else if (response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please try again in a moment.';
            } else if (response.status === 402) {
                errorMessage = 'Billing issue. Please check your OpenAI account billing.';
            } else if (response.status === 403) {
                errorMessage = 'API access forbidden. Your key may not have the required permissions.';
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    }

    // Workflow Management
    resetWorkflow() {
        // Reset Agent 1
        this.agent1OutputData = null;
        this.agent1Output.textContent = 'Waiting for task analysis...';
        this.updateAgent1Status('🔄 Ready', 'ready');
        this.editAgent1Btn.disabled = true;
        this.proceedToAgent2Btn.disabled = true;

        // Reset Agent 2
        this.targetInput.value = '';
        this.targetInput.disabled = true;
        this.targetInput.style.animation = '';
        this.agent2Output.textContent = 'Waiting for structured plan and target...';
        this.updateAgent2Status('⏳ Waiting for Agent 1', 'default');
        this.executeTaskBtn.disabled = true;

        // Reset task
        this.userTaskInput.value = '';
        this.validateTaskInput();

        // Reset processing state
        this.isProcessing = false;
        
        // Reset API key UI state
        if (!this.apiKey) {
            this.testKeyBtn.disabled = true;
        }
        
        // Show brief reset confirmation
        setTimeout(() => {
            this.updateAgent1Status('Ready', 'ready');
        }, 1000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DualAgent();
}); 