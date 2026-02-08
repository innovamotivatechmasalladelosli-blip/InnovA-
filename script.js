// Chat Interface Class
class ChatInterface {
  constructor() {
    this.initializeInterface();
    this.isProcessing = false;
    this.currentLanguage = window.auth?.settings?.language || 'es';
    this.conversationHistory = [];
    this.liveDataSources = new Map();
    
    // Enhanced memory system for function tracking and coherence
    this.sessionMemory = this.loadSessionMemory();
    this.functionUsageHistory = this.sessionMemory.functionUsage || [];
    this.lastGeneratedContent = this.sessionMemory.lastContent || {};
    this.modePreferences = this.sessionMemory.modePreferences || {};
    
    // New: Content modification tracking system
    this.generatedContentHistory = this.sessionMemory.contentHistory || [];
    this.activeModificationContext = null;
    this.lastUserRequest = null;
    
    this.modes = {
      analytical: true,
      research: true,
      image: true,
      document: true,
      virtualReality: true,
      code: true
    };

    // Initialize live data connections
    this.initializeLiveData();
    this.initializeModes();
    this.documentHandler = new DocumentHandler();
    this.vrHandler = new VirtualRealityHandler();
    this.codeGenerator = new CodeGenerator();
  }

  // New method to load session memory
  loadSessionMemory() {
    try {
      const memory = localStorage.getItem('innovaplus_session_memory');
      return memory ? JSON.parse(memory) : {
        functionUsage: [],
        lastContent: {},
        modePreferences: {},
        conversationContext: [],
        contentHistory: [],
        modificationRequests: []
      };
    } catch (error) {
      console.error('Error loading session memory:', error);
      return {
        functionUsage: [],
        lastContent: {},
        modePreferences: {},
        conversationContext: [],
        contentHistory: [],
        modificationRequests: []
      };
    }
  }

  // Enhanced method to save session memory
  saveSessionMemory() {
    try {
      const memory = {
        functionUsage: this.functionUsageHistory.slice(-50), // Keep last 50 function uses
        lastContent: this.lastGeneratedContent,
        modePreferences: this.modePreferences,
        conversationContext: this.conversationHistory.slice(-20) // Keep last 20 messages
      };
      localStorage.setItem('innovaplus_session_memory', JSON.stringify(memory));
    } catch (error) {
      console.error('Error saving session memory:', error);
    }
  }

  // New method to track function usage
  trackFunctionUsage(functionName, query, result, metadata = {}) {
    const usage = {
      timestamp: Date.now(),
      function: functionName,
      query: query.substring(0, 100), // Truncate for storage
      success: !!result,
      metadata: metadata,
      resultType: result?.type || 'unknown'
    };
    
    this.functionUsageHistory.push(usage);
    this.lastGeneratedContent[functionName] = {
      query: query,
      result: result,
      timestamp: Date.now()
    };
    
    // Update mode preferences based on successful usage
    if (result) {
      this.modePreferences[functionName] = (this.modePreferences[functionName] || 0) + 1;
    }
    
    this.saveSessionMemory();
  }

  // New method to track generated content
  trackGeneratedContent(type, originalPrompt, result, metadata = {}) {
    const contentEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      type: type,
      originalPrompt: originalPrompt,
      result: result,
      metadata: metadata,
      modificationHistory: []
    };
    
    this.generatedContentHistory.push(contentEntry);
    this.lastUserRequest = originalPrompt;
    this.saveSessionMemory();
    
    return contentEntry.id;
  }

  // New method to detect modification requests
  async detectModificationRequest(message) {
    if (this.generatedContentHistory.length === 0) return null;
    
    const recentContent = this.generatedContentHistory.slice(-5); // Check last 5 generated items
    
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Analyze if this user message is requesting a modification to recently generated content.

RECENT GENERATED CONTENT:
${recentContent.map(item => `- ${item.type}: "${item.originalPrompt}" (ID: ${item.id})`).join('\n')}

MODIFICATION INDICATORS:
- Words like: "cambia", "modifica", "ajusta", "change", "modify", "adjust", "fix", "update"
- References to specific parts: "el código", "la imagen", "el documento", "the code", "the image", "the document"
- Comparative language: "pero", "sin embargo", "instead", "rather"
- Specific requests: "hazlo más", "make it more", "quiero que", "I want it to"

USER MESSAGE: "${message}"

If this is a modification request, respond with JSON:
{
  "isModification": true,
  "targetContentId": "ID of content to modify",
  "targetType": "type of content",
  "specificChange": "what specifically to change",
  "modificationReason": "why the change is needed",
  "newRequirements": "new requirements or specifications"
}

If not a modification request, respond with:
{
  "isModification": false
}`
        }
      ],
      json: true
    });

    try {
      const analysis = JSON.parse(completion.content);
      if (analysis.isModification) {
        this.activeModificationContext = analysis;
        return analysis;
      }
    } catch (error) {
      console.error('Error analyzing modification request:', error);
    }
    
    return null;
  }

  // New method to handle content modifications
  async handleContentModification(modificationContext, userMessage) {
    const targetContent = this.generatedContentHistory.find(item => item.id === modificationContext.targetContentId);
    if (!targetContent) return null;

    // Track the modification request
    const modificationEntry = {
      timestamp: Date.now(),
      originalContent: targetContent,
      modificationRequest: userMessage,
      specificChange: modificationContext.specificChange,
      reason: modificationContext.modificationReason
    };

    // Add to session memory
    if (!this.sessionMemory.modificationRequests) {
      this.sessionMemory.modificationRequests = [];
    }
    this.sessionMemory.modificationRequests.push(modificationEntry);

    // Generate modified content based on type
    let modifiedResult = null;
    
    switch (targetContent.type) {
      case 'code':
        modifiedResult = await this.modifyCode(targetContent, modificationContext, userMessage);
        break;
      case 'image':
        modifiedResult = await this.modifyImage(targetContent, modificationContext, userMessage);
        break;
      case 'document':
        modifiedResult = await this.modifyDocument(targetContent, modificationContext, userMessage);
        break;
      case 'vr-scene':
        modifiedResult = await this.modifyVRScene(targetContent, modificationContext, userMessage);
        break;
      case 'analysis':
        modifiedResult = await this.modifyAnalysis(targetContent, modificationContext, userMessage);
        break;
      case 'research':
        modifiedResult = await this.modifyResearch(targetContent, modificationContext, userMessage);
        break;
      default:
        modifiedResult = await this.modifyGenericContent(targetContent, modificationContext, userMessage);
    }

    if (modifiedResult) {
      // Track the modification in the original content's history
      targetContent.modificationHistory.push({
        timestamp: Date.now(),
        request: userMessage,
        change: modificationContext.specificChange,
        result: modifiedResult
      });

      // Create new content entry for the modified version
      const newContentId = this.trackGeneratedContent(
        targetContent.type, 
        `Modified: ${targetContent.originalPrompt}`, 
        modifiedResult,
        { 
          ...targetContent.metadata, 
          isModification: true, 
          originalId: targetContent.id,
          modificationReason: modificationContext.modificationReason
        }
      );

      return {
        ...modifiedResult,
        isModification: true,
        originalPrompt: targetContent.originalPrompt,
        modificationReason: modificationContext.modificationReason,
        specificChange: modificationContext.specificChange
      };
    }

    return null;
  }

  // New methods for specific content modifications
  async modifyCode(originalContent, modificationContext, userMessage) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are modifying existing code based on user feedback.

ORIGINAL CODE:
${originalContent.result.content}

ORIGINAL PROMPT: "${originalContent.originalPrompt}"
MODIFICATION REQUEST: "${userMessage}"
SPECIFIC CHANGE NEEDED: "${modificationContext.specificChange}"

Instructions:
1. Keep the core functionality that works
2. Make only the requested changes
3. Explain what you modified and why
4. Ensure the code still functions properly
5. Maintain the same programming language and style

Generate the modified code with clear comments about what changed.`
        }
      ]
    });

    return {
      type: 'code',
      content: completion.content,
      language: originalContent.result.language || 'javascript',
      title: `Modified: ${originalContent.result.title || 'Code'}`
    };
  }

  async modifyImage(originalContent, modificationContext, userMessage) {
    // Create a new prompt that modifies the original
    const newPrompt = `${originalContent.originalPrompt}, but ${modificationContext.specificChange}`;
    
    const result = await websim.imageGen({
      prompt: newPrompt,
      aspect_ratio: originalContent.metadata?.aspect_ratio || "16:9"
    });

    return {
      type: 'image',
      url: result.url,
      title: `Modified: ${originalContent.originalPrompt}`
    };
  }

  async modifyDocument(originalContent, modificationContext, userMessage) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Modify this document based on user feedback.

ORIGINAL DOCUMENT:
${originalContent.result.content}

ORIGINAL PROMPT: "${originalContent.originalPrompt}"
MODIFICATION REQUEST: "${userMessage}"
SPECIFIC CHANGE: "${modificationContext.specificChange}"

Keep the document structure but make the requested changes.
Respond in ${this.currentLanguage} only.`
        }
      ]
    });

    return {
      type: 'document',
      content: completion.content,
      title: `Modified: ${originalContent.result.title || 'Document'}`
    };
  }

  async modifyVRScene(originalContent, modificationContext, userMessage) {
    const newPrompt = `${originalContent.originalPrompt}, but ${modificationContext.specificChange}`;
    return await this.vrHandler.generateVRScene(newPrompt);
  }

  async modifyAnalysis(originalContent, modificationContext, userMessage) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Update this analysis based on new requirements.

ORIGINAL ANALYSIS:
${originalContent.result.content}

ORIGINAL TOPIC: "${originalContent.originalPrompt}"
NEW REQUIREMENTS: "${userMessage}"
SPECIFIC FOCUS: "${modificationContext.specificChange}"

Provide an updated analysis that addresses the new requirements while building on the original work.
Language: ${this.currentLanguage}`
        }
      ]
    });

    return {
      type: 'analysis',
      content: completion.content,
      metadata: {
        ...originalContent.result.metadata,
        isModification: true
      }
    };
  }

  async modifyResearch(originalContent, modificationContext, userMessage) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Expand or modify this research based on new requirements.

ORIGINAL RESEARCH:
${originalContent.result.content}

ORIGINAL TOPIC: "${originalContent.originalPrompt}"
ADDITIONAL REQUIREMENTS: "${userMessage}"
SPECIFIC CHANGE: "${modificationContext.specificChange}"

Provide updated research that addresses the new requirements.
Include sources and maintain research quality.
Language: ${this.currentLanguage}`
        }
      ]
    });

    const sources = this.extractEnhancedSources(completion.content);
    
    return {
      type: 'research',
      content: completion.content,
      sources: sources,
      metadata: {
        ...originalContent.result.metadata,
        isModification: true,
        sourceCount: sources.length
      }
    };
  }

  async modifyGenericContent(originalContent, modificationContext, userMessage) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Modify this content based on user feedback.

ORIGINAL CONTENT:
${originalContent.result.content || originalContent.result}

ORIGINAL REQUEST: "${originalContent.originalPrompt}"
MODIFICATION REQUEST: "${userMessage}"
SPECIFIC CHANGE: "${modificationContext.specificChange}"

Provide the modified content that addresses the user's specific requests.
Language: ${this.currentLanguage}`
        }
      ]
    });

    return {
      type: originalContent.type,
      content: completion.content,
      title: `Modified: ${originalContent.originalPrompt}`
    };
  }

  // New method to get relevant memory context
  getMemoryContext(currentQuery) {
    const recentFunctions = this.functionUsageHistory.slice(-10);
    const relevantContent = {};
    
    // Find similar past queries
    Object.entries(this.lastGeneratedContent).forEach(([func, data]) => {
      if (this.isQuerySimilar(currentQuery, data.query)) {
        relevantContent[func] = data;
      }
    });

    // Check for recent content that might be relevant for modification
    const recentContent = this.generatedContentHistory.slice(-5);
    const modificationHistory = this.sessionMemory.modificationRequests?.slice(-10) || [];
    
    return {
      recentFunctions,
      relevantContent,
      recentGeneratedContent: recentContent,
      modificationHistory: modificationHistory,
      totalFunctionUses: this.functionUsageHistory.length,
      preferredModes: Object.entries(this.modePreferences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([mode]) => mode)
    };
  }

  // Helper method to check query similarity
  isQuerySimilar(query1, query2) {
    if (!query1 || !query2) return false;
    
    const words1 = query1.toLowerCase().split(/\s+/);
    const words2 = query2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => 
      words2.includes(word) && word.length > 3
    );
    
    return commonWords.length >= 2;
  }

  initializeInterface() {
    this.messagesContainer = document.querySelector('#chat-messages');
    this.userInput = document.querySelector('#user-input');
    this.sendButton = document.querySelector('#send-btn');
    
    if (this.elementsExist()) {
      this.bindEvents();
      this.addWelcomeMessage();
    }
  }

  initializeModes() {
    // Mode toggles
    this.modeToggles = {
      analytical: document.getElementById('mode-analytical'),
      research: document.getElementById('mode-research'),
      image: document.getElementById('mode-image'),
      document: document.getElementById('mode-document'),
      virtualReality: document.getElementById('mode-vr'),
      code: document.getElementById('mode-code')
    };

    // Add event listeners for mode toggles
    Object.entries(this.modeToggles).forEach(([mode, toggle]) => {
      if (toggle) {
        toggle.addEventListener('change', (e) => {
          this.modes[mode] = e.target.checked;
        });
      }
    });
  }

  elementsExist() {
    return !!(this.messagesContainer && this.userInput && this.sendButton);
  }

  bindEvents() {
    this.sendButton.addEventListener('click', () => this.sendMessage());
    this.userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
  }

  addWelcomeMessage() {
    const welcomeMessages = {
      es: "¡Hola! Soy InnovA+, tu asistente en español. ¿En qué puedo ayudarte hoy?",
      en: "Hi! I'm InnovA+, your assistant. How can I help you today?"
    };
    const message = welcomeMessages[this.currentLanguage] || welcomeMessages.en;
    this.addMessage(message, 'ai');
  }

  async processAnalyticalMode(message, liveContext = {}) {
    if (!this.modes.analytical) return null;
    
    const startTime = Date.now();
    
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Perform deep analytical reasoning on: "${message}"
                   
                   Provide:
                   - Multi-faceted analysis from different angles
                   - Logical reasoning chains
                   - Pros and cons evaluation
                   - Underlying factors and relationships
                   - Potential implications and outcomes
                   - Data-driven insights where applicable
                   
                   If data visualization would help, include chart data in JSON format:
                   \`\`\`json
                   {chart configuration}
                   \`\`\`
                   
                   Live context: ${JSON.stringify(liveContext)}
                   Language: ${this.currentLanguage}`
        }
      ]
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const cleanContent = this.cleanResponse(completion.content);
    
    // Extract chart data if present
    let chartData = null;
    const chartMatch = cleanContent.match(/```json\s*(\{.*?\})\s*```/s);
    if (chartMatch) {
      try {
        chartData = JSON.parse(chartMatch[1]);
        // Remove chart data from content
        cleanContent = cleanContent.replace(chartMatch[0], '');
      } catch (e) {
        console.error('Error parsing chart data:', e);
      }
    }

    return {
      type: 'analysis',
      content: cleanContent,
      chartData: chartData,
      processingTime: processingTime,
      metadata: {
        analysisType: 'comprehensive',
        complexity: processingTime > 3 ? 'high' : 'moderate'
      }
    };
  }

  async processResearchMode(message, liveContext = {}) {
    if (!this.modes.research) return null;

    const startTime = Date.now();
    
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Conduct thorough research on: "${message}"
                   
                   Provide comprehensive, factual information with:
                   - Clear structure and organization
                   - Specific, verifiable sources with URLs when possible
                   - Key statistics and data points
                   - Multiple perspectives on the topic
                   - Practical implications or applications
                   
                   Format sources as: [Source Name](URL) or [Source Name] for references
                   Include publication dates when available
                   
                   Live context: ${JSON.stringify(liveContext)}
                   Language: ${this.currentLanguage}`
        }
      ]
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const cleanContent = this.cleanResponse(completion.content);
    const sources = this.extractEnhancedSources(cleanContent);

    return {
      type: 'research',
      content: cleanContent,
      sources: sources,
      processingTime: processingTime,
      metadata: {
        sourceCount: sources.length,
        researchDepth: sources.length > 3 ? 'comprehensive' : 'basic'
      }
    };
  }
  
  // Enhanced method to extract detailed sources
  extractEnhancedSources(content) {
    const sources = [];
    
    // More comprehensive patterns for source extraction
    const patterns = [
      // Markdown links
      /\[([^\]]+)\]\(([^)]+)\)/g,
      // Direct URLs with context
      /(?:fuente|source|según|from|via):\s*(https?:\/\/[^\s]+)/gi,
      // Academic citations
      /\(([^)]+),\s*(\d{4})\)/g,
      // News sources
      /según\s+([^,]+),\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      // Direct URLs
      /https?:\/\/[^\s]+/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const source = this.parseSourceMatch(match, pattern);
        if (source && !sources.some(s => s.text === source.text || s.url === source.url)) {
          sources.push(source);
        }
      }
    });
    
    return sources.slice(0, 10); // Limit to 10 sources for readability
  }

  // Parse individual source matches
  parseSourceMatch(match, pattern) {
    if (match[1] && match[2] && !match[2].startsWith('http')) {
      // Academic citation format
      return {
        text: `${match[1]} (${match[2]})`,
        type: 'academic',
        date: match[2]
      };
    } else if (match[1] && match[2]) {
      // Markdown link format
      return {
        text: match[1],
        url: match[2],
        type: this.detectSourceType(match[2])
      };
    } else if (match[0].startsWith('http')) {
      // Direct URL
      return {
        text: this.extractDomainName(match[0]),
        url: match[0],
        type: this.detectSourceType(match[0])
      };
    }
    return null;
  }

  // Detect source type from URL
  detectSourceType(url) {
    if (!url) return 'reference';
    
    const domain = url.toLowerCase();
    if (domain.includes('gov') || domain.includes('.edu')) return 'official';
    if (domain.includes('news') || domain.includes('bbc') || domain.includes('cnn')) return 'news';
    if (domain.includes('scholar') || domain.includes('pubmed') || domain.includes('arxiv')) return 'academic';
    return 'link';
  }

  // Extract clean domain name from URL
  extractDomainName(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url.substring(0, 50) + '...';
    }
  }

  async processImageMode(message) {
    if (!this.modes.image) return null;

    const result = await websim.imageGen({
      prompt: message,
      aspect_ratio: "16:9"
    });

    return {
      type: 'image',
      url: result.url
    };
  }

  async processDocumentMode(message) {
    if (!this.modes.document) return null;

    // Generate document content
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Generate a professional document about: ${message}.
                   Focus on facts and information only.
                   Do not include AI-like phrases or self-references.
                   Use formal, academic style.
                   Respond in ${this.currentLanguage} only.`
        }
      ]
    });

    return {
      type: 'document',
      content: completion.content,
      title: message
    };
  }

  async processVRMode(message) {
    if (!this.modes.virtualReality) return null;

    const vrScene = await this.vrHandler.generateVRScene(message);
    return {
      type: 'vr-scene',
      content: vrScene.content,
      title: vrScene.title
    };
  }

  async processCodeMode(message) {
    if (!this.modes.code) return null;

    const result = await this.codeGenerator.generateCode(message);
    return {
      type: 'code',
      content: result.content,
      language: 'html',
      title: result.title
    };
  }

  addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${type}-message`);

    if (typeof content === 'string') {
      // Enhanced string formatting with better visual treatment
      messageDiv.innerHTML = this.formatEnhancedMessage(content);
    } else {
      switch (content.type) {
        case 'image':
          const imageContainer = document.createElement('div');
          imageContainer.classList.add('image-response-container');
          
          const img = document.createElement('img');
          img.src = content.url;
          img.classList.add('generated-image');
          img.alt = content.title || 'Generated image';
          
          // Add image click handler for modal
          img.addEventListener('click', () => this.showImageModal(content.url));
          
          imageContainer.appendChild(img);
          
          // Enhanced metadata
          const metadata = document.createElement('div');
          metadata.classList.add('response-metadata');
          metadata.innerHTML = `
            <div class="metadata-item">
              <span class="metadata-label">🎨 Imagen generada</span>
              <span class="metadata-value">Click para ampliar</span>
            </div>
          `;
          imageContainer.appendChild(metadata);
          
          messageDiv.appendChild(imageContainer);
          break;

        case 'analysis':
          const analysisDiv = document.createElement('div');
          analysisDiv.classList.add('analysis-content');
          analysisDiv.innerHTML = this.formatEnhancedMessage(content.content);
          
          // Enhanced processing metadata
          if (content.processingTime || content.metadata) {
            const metadata = document.createElement('div');
            metadata.classList.add('response-metadata');
            metadata.innerHTML = `
              <div class="metadata-item">
                <span class="metadata-label">🧠 Análisis ${content.metadata?.analysisType || 'profundo'}</span>
                <span class="metadata-value">
                  ${content.processingTime ? `${content.processingTime}s` : ''} 
                  ${content.metadata?.complexity ? `• ${content.metadata.complexity} complexity` : ''}
                </span>
              </div>
            `;
            analysisDiv.appendChild(metadata);
          }
          
          // Add chart if available
          if (content.chartData) {
            this.documentHandler.generateChart(content.chartData, content.chartData.type || 'bar', 'Análisis Visual')
              .then(chartElement => {
                chartElement.classList.add('enhanced-chart');
                analysisDiv.appendChild(chartElement);
              })
              .catch(console.error);
          }
          
          messageDiv.appendChild(analysisDiv);
          break;
          
        case 'research':
          const researchDiv = document.createElement('div');
          researchDiv.classList.add('research-content');
          researchDiv.innerHTML = this.formatEnhancedMessage(content.content);
          
          // Enhanced research metadata
          if (content.processingTime || content.metadata) {
            const metadata = document.createElement('div');
            metadata.classList.add('response-metadata');
            metadata.innerHTML = `
              <div class="metadata-item">
                <span class="metadata-label">🔍 Investigación ${content.metadata?.researchDepth || 'completa'}</span>
                <span class="metadata-value">
                  ${content.processingTime ? `${content.processingTime}s` : ''} 
                  ${content.metadata?.sourceCount ? `• ${content.metadata.sourceCount} fuentes` : ''}
                </span>
              </div>
            `;
            researchDiv.appendChild(metadata);
          }
          
          // Enhanced sources section
          if (content.sources && content.sources.length > 0) {
            const sourcesDiv = this.createEnhancedSourcesSection(content.sources);
            researchDiv.appendChild(sourcesDiv);
          }
          
          // Add chart if available
          if (content.chartData) {
            this.documentHandler.generateChart(content.chartData, content.chartData.type || 'bar', 'Datos de Investigación')
              .then(chartElement => {
                chartElement.classList.add('enhanced-chart');
                researchDiv.appendChild(chartElement);
              })
              .catch(console.error);
          }
          
          messageDiv.appendChild(researchDiv);
          break;

        case 'document':
          const docPreview = document.createElement('div');
          docPreview.classList.add('document-preview-container');
          docPreview.innerHTML = `
            <div class="document-preview-header">
              <span class="document-preview-title">${content.title}</span>
              <div class="document-preview-action">
                <button class="action-btn edit-doc">
                  <svg class="action-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  ${this.currentLanguage === 'es' ? 'Editar' : 'Edit'}
                </button>
              </div>
            </div>
            <div class="document-preview-content">
              ${content.content}
            </div>
          `;

          docPreview.querySelector('.edit-doc').addEventListener('click', () => {
            this.documentHandler.showEditDialog(content.content, content.title, 'pdf');
          });

          messageDiv.appendChild(docPreview);
          break;

        case 'vr-scene':
          const vrPreview = this.vrHandler.createVRPreview(content.content);
          messageDiv.appendChild(vrPreview);
          break;

        case 'code':
          const codePreview = this.codeGenerator.createCodePreview(content.content, content.language);
          messageDiv.appendChild(codePreview);
          break;

        case 'chart':
          const chartDiv = document.createElement('div');
          chartDiv.classList.add('chart-content');
          chartDiv.innerHTML = `<h3>${content.title}</h3>`;
          this.documentHandler.generateChart(content.chartData, 'bar', content.title)
            .then(chartElement => {
              chartElement.classList.add('enhanced-chart');
              chartDiv.appendChild(chartElement);
            });
          messageDiv.appendChild(chartDiv);
          break;

        case 'schema':
          const schemaDiv = document.createElement('div');
          schemaDiv.classList.add('schema-content');
          schemaDiv.innerHTML = this.formatEnhancedMessage(content.content);
          messageDiv.appendChild(schemaDiv);
          break;

        default:
          const enhancedDiv = document.createElement('div');
          enhancedDiv.classList.add('enhanced-response');
          enhancedDiv.innerHTML = this.formatEnhancedMessage(content.content || content);
          messageDiv.appendChild(enhancedDiv);
      }
    }

    this.messagesContainer.appendChild(messageDiv);
    this.scrollToBottom();
  }

  addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('typing-indicator');
    for (let i = 0; i < 3; i++) {
      indicator.appendChild(document.createElement('div')).classList.add('typing-dot');
    }
    this.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
    return indicator;
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  clearHistory() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = '';
    }
    this.conversationHistory = [];
    
    // Clear session memory but keep preferences
    this.functionUsageHistory = [];
    this.lastGeneratedContent = {};
    this.generatedContentHistory = [];
    this.activeModificationContext = null;
    this.lastUserRequest = null;
    this.saveSessionMemory();
    
    this.addWelcomeMessage();
  }

  async initializeLiveData() {
    // Setup live data sources
    this.liveDataSources.set('news', {
      update: async () => {
        try {
          // Simulate live news API call
          return {
            trending: [
              { title: "Nuevos avances en inteligencia artificial", source: "Tech Today" },
              { title: "Descubrimiento científico revolucionario", source: "Science Daily" },
              { title: "Cambios en política económica global", source: "Economic Times" }
            ],
            updated: new Date().toISOString()
          };
        } catch (error) {
          console.error("Error fetching news data", error);
          return null;
        }
      },
      interval: 5 * 60 * 1000 // Update every 5 minutes
    });

    this.liveDataSources.set('weather', {
      update: async () => {
        try {
          // Simulate live weather data
          return {
            location: "Ciudad de México",
            temperature: Math.floor(Math.random() * 10) + 20, // 20-30°C
            condition: ["Soleado", "Nublado", "Lluvia ligera"][Math.floor(Math.random() * 3)],
            updated: new Date().toISOString()
          };
        } catch (error) {
          console.error("Error fetching weather data", error);
          return null;
        }
      },
      interval: 15 * 60 * 1000 // Update every 15 minutes
    });

    this.liveDataSources.set('markets', {
      update: async () => {
        try {
          // Simulate live market data
          const change = () => (Math.random() * 2 - 1).toFixed(2);
          return {
            indices: [
              { name: "S&P 500", change: change() + "%" },
              { name: "NASDAQ", change: change() + "%" },
              { name: "Dow Jones", change: change() + "%" }
            ],
            updated: new Date().toISOString()
          };
        } catch (error) {
          console.error("Error fetching market data", error);
          return null;
        }
      },
      interval: 60 * 1000 // Update every minute
    });

    // Start live data updates
    this.startLiveUpdates();
  }

  startLiveUpdates() {
    this.liveDataSources.forEach((source, key) => {
      source.update(); // Initial update
      setInterval(() => source.update(), source.interval);
    });
  }

  async getLiveContext() {
    const context = {};
    for (let [key, source] of this.liveDataSources) {
      try {
        context[key] = await source.update();
      } catch (error) {
        console.error(`Error fetching ${key} data:`, error);
      }
    }
    return context;
  }

  async sendMessage() {
    const message = this.userInput.value.trim();
    if (!message || this.isProcessing) return;

    try {
      this.isProcessing = true;
      this.userInput.disabled = true;
      this.sendButton.disabled = true;

      // Add user message
      this.addMessage(message, 'user');
      this.userInput.value = '';

      const typingIndicator = this.addTypingIndicator();

      // First, check if this is a modification request
      const modificationContext = await this.detectModificationRequest(message);

      if (modificationContext) {
        // Handle content modification
        typingIndicator.remove();
        
        const modificationAnnouncement = this.currentLanguage === 'es' 
          ? `🔄 **Modificando contenido anterior**: ${modificationContext.specificChange}\n\n**Contenido original**: ${modificationContext.targetType}\n**Cambio solicitado**: ${modificationContext.modificationReason}\n\n`
          : `🔄 **Modifying previous content**: ${modificationContext.specificChange}\n\n**Original content**: ${modificationContext.targetType}\n**Requested change**: ${modificationContext.modificationReason}\n\n`;
        
        this.addMessage(modificationAnnouncement, 'ai');
        
        const modifiedResult = await this.handleContentModification(modificationContext, message);
        
        if (modifiedResult) {
          this.addMessage(modifiedResult, 'ai');
        } else {
          const errorMessage = this.currentLanguage === 'es'
            ? "No pude modificar el contenido solicitado. ¿Podrías ser más específico sobre qué quieres cambiar?"
            : "I couldn't modify the requested content. Could you be more specific about what you want to change?";
          this.addMessage(errorMessage, 'ai');
        }
      } else {
        // Normal processing flow
        // Get live context data and memory context
        const liveContext = await this.getLiveContext();
        const memoryContext = this.getMemoryContext(message);

        // Update conversation history for better context
        this.conversationHistory.push({
          role: "user",
          content: message
        });
        
        // Keep history to last 10 messages to prevent context overflow
        this.conversationHistory = this.conversationHistory.slice(-10);

        // Smart mode analysis with memory - determine what the user actually needs
        const modeAnalysis = await this.analyzeQueryForOptimalModes(message);
        
        // Get enhanced base response with better context and mode awareness
        const baseResponse = await this.getEnhancedBaseResponse(message, liveContext, modeAnalysis);
        
        // Remove typing indicator
        typingIndicator.remove();

        // Create a comprehensive response that includes mode information and memory
        const enhancedResponse = this.createCoherentResponse(baseResponse, modeAnalysis, memoryContext);
        
        // Add base response with enhanced formatting
        this.addMessage(enhancedResponse, 'ai');
        
        // Add conversation to history
        this.conversationHistory.push({
          role: "assistant",
          content: typeof enhancedResponse === 'string' ? enhancedResponse : enhancedResponse.content || ''
        });
        
        // Process specialized modes only if truly needed
        const specializedResponses = await this.processSpecializedModes(message, modeAnalysis, liveContext);
        
        // Add specialized responses with enhanced visual treatment and tracking
        for (const response of specializedResponses) {
          if (response && response.type !== 'text') {
            this.addMessage(response, 'ai');
            // Track function usage and generated content
            this.trackFunctionUsage(response.type, message, response, {
              processingTime: response.processingTime,
              successful: true
            });
            this.trackGeneratedContent(response.type, message, response, {
              processingTime: response.processingTime,
              modeAnalysis: modeAnalysis
            });
          }
        }
      }

      // Save updated memory
      this.saveSessionMemory();

    } catch (error) {
      console.error('Error:', error);
      // Track failed function usage
      this.trackFunctionUsage('general_query', message, null, {
        error: error.message,
        successful: false
      });
      
      const errorMessages = {
        es: "Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.",
        en: "Sorry, an error occurred. Please try again."
      };
      this.addMessage(errorMessages[this.currentLanguage] || errorMessages.en, 'ai');
    } finally {
      this.isProcessing = false;
      this.userInput.disabled = false;
      this.sendButton.disabled = false;
      this.userInput.focus();
    }
  }

  // Enhanced method for smarter mode analysis with memory
  async analyzeQueryForOptimalModes(message) {
    try {
      const memoryContext = this.getMemoryContext(message);
      
      const analysis = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are InnovA+ analyzing a user query to determine optimal response modes.

AVAILABLE CAPABILITIES:
- Research: Factual investigation with source citations
- Analytical: Deep reasoning, pros/cons, logical analysis  
- Image: Visual content generation from descriptions
- Chart: Data visualization and statistical graphics
- Code: Programming in any language with live preview
- VR: 3D/VR scene creation with A-Frame
- Document: Professional document generation (PDF/DOCX/PPTX/XLSX)

MEMORY CONTEXT:
- Recent function usage: ${JSON.stringify(memoryContext.recentFunctions.slice(-3))}
- Preferred modes: ${memoryContext.preferredModes.join(', ')}
- Similar past queries: ${JSON.stringify(memoryContext.relevantContent)}
- Total function uses this session: ${memoryContext.totalFunctionUses}

ANALYSIS CRITERIA:
- Consider what worked well for similar queries in the past
- Only recommend modes that significantly enhance the response
- Consider user's actual needs, not just possibilities
- Prioritize modes that provide unique value for this specific query
- Be conservative - quality over quantity
- Use memory context to make smarter recommendations

Analyze this query: "${message}"
                      
Respond with JSON only:
{
  "primaryIntent": "informational|creative|technical|analytical|visual|research",
  "confidence": 0.0-1.0,
  "recommendedModes": {
    "research": boolean,
    "analytical": boolean, 
    "image": boolean,
    "chart": boolean,
    "code": boolean,
    "vr": boolean,
    "document": boolean
  },
  "reasoning": "Specific explanation considering past usage and current needs",
  "expectedOutputs": ["List of what will be generated"],
  "memoryInfluence": "How past usage influenced this decision"
}`
          }
        ],
        json: true
      });
      
      return JSON.parse(analysis.content);
    } catch (error) {
      console.error("Error analyzing query:", error);
      // Fallback with memory-informed heuristics
      const memoryContext = this.getMemoryContext(message);
      return {
        primaryIntent: "informational",
        confidence: 0.5,
        recommendedModes: {
          research: this.shouldUseResearchMode(message, memoryContext),
          analytical: this.shouldUseAnalyticalMode(message, memoryContext),
          image: this.shouldGenerateImage(message, memoryContext),
          chart: false,
          code: this.shouldGenerateCode(message, memoryContext),
          vr: this.shouldGenerateVR(message, memoryContext),
          document: this.shouldGenerateDocument(message, memoryContext)
        },
        reasoning: "Fallback analysis using heuristics and memory",
        expectedOutputs: ["Text response"],
        memoryInfluence: "Used past preferences and similar queries"
      };
    }
  }

  // Enhanced method to create coherent responses with memory awareness
  createCoherentResponse(baseResponse, modeAnalysis, memoryContext) {
    const enabledModes = Object.entries(this.modes).filter(([k, v]) => v).map(([k]) => k);
    const recommendedModes = Object.entries(modeAnalysis.recommendedModes || {})
      .filter(([k, v]) => v)
      .map(([k]) => k);
    
    // Create function announcement
    const functionAnnouncement = this.createFunctionAnnouncement(recommendedModes, modeAnalysis.reasoning);
    
    // Add memory context if relevant
    const memoryNote = this.createMemoryNote(memoryContext);
    
    const coherenceNote = this.currentLanguage === 'es' ?
      `\n\n*Tengo acceso completo a generación de imágenes, código, VR, documentos, investigación y análisis profundo. Recordando ${memoryContext.totalFunctionUses} funciones usadas en esta sesión.*` :
      `\n\n*I have full access to image generation, coding, VR, documents, research and deep analysis. Remembering ${memoryContext.totalFunctionUses} functions used this session.*`;
    
    return functionAnnouncement + baseResponse + memoryNote + coherenceNote;
  }

  // New method to create function announcement
  createFunctionAnnouncement(recommendedModes, reasoning) {
    if (recommendedModes.length === 0) return '';
    
    const modeNames = {
      research: this.currentLanguage === 'es' ? 'investigación' : 'research',
      analytical: this.currentLanguage === 'es' ? 'análisis' : 'analysis', 
      image: this.currentLanguage === 'es' ? 'generación de imagen' : 'image generation',
      chart: this.currentLanguage === 'es' ? 'gráficos' : 'charts',
      code: this.currentLanguage === 'es' ? 'generación de código' : 'code generation',
      vr: this.currentLanguage === 'es' ? 'realidad virtual' : 'VR',
      document: this.currentLanguage === 'es' ? 'documentos' : 'documents'
    };
    
    const modesText = recommendedModes.map(mode => modeNames[mode] || mode).join(', ');
    
    const announcement = this.currentLanguage === 'es' ? 
      `**🎯 Plan de acción:** Voy a usar ${modesText} para responder mejor a tu consulta.\n**💭 Razón:** ${reasoning}\n\n` :
      `**🎯 Action plan:** I will use ${modesText} to better answer your query.\n**💭 Reason:** ${reasoning}\n\n`;
    
    return announcement;
  }

  // New method to create memory note
  createMemoryNote(memoryContext) {
    if (memoryContext.relevantContent && Object.keys(memoryContext.relevantContent).length > 0) {
      const relevantFunctions = Object.keys(memoryContext.relevantContent);
      
      const memoryText = this.currentLanguage === 'es' ?
        `\n\n**🧠 Memoria:** Recordando que anteriormente usé ${relevantFunctions.join(', ')} para consultas similares.` :
        `\n\n**🧠 Memory:** Remembering that I previously used ${relevantFunctions.join(', ')} for similar queries.`;
      
      return memoryText;
    }
    return '';
  }

  // Enhanced base response with better context awareness and memory
  async getEnhancedBaseResponse(message, liveContext = {}, modeAnalysis = {}) {
    const memoryContext = this.getMemoryContext(message);
    
    const systemPrompt = `You are InnovA+, an advanced AI assistant with comprehensive capabilities and persistent memory.

CORE CAPABILITIES AND MODES:
1. ANALYTICAL MODE: Deep reasoning, pros/cons analysis, logical chains, implications
2. RESEARCH MODE: Factual information with verifiable sources and citations
3. IMAGE GENERATION: Create visual content from text descriptions using websim.imageGen()
4. CODE GENERATION: Write functional code in any programming language with live preview
5. VR/3D SCENES: Generate immersive A-Frame VR environments and 3D visualizations
6. DOCUMENT CREATION: Professional PDFs, Word docs, PowerPoints, Excel files
7. DATA VISUALIZATION: Interactive charts, graphs, and visual data representations
8. LIVE DATA ACCESS: Real-time news, weather, market data integration

SESSION MEMORY AND COHERENCE:
- Total functions used this session: ${memoryContext.totalFunctionUses}
- Recent successful functions: ${memoryContext.recentFunctions.slice(-3).map(f => f.function).join(', ')}
- Your preferred modes based on success: ${memoryContext.preferredModes.join(', ')}
- Similar past queries and their solutions: ${JSON.stringify(memoryContext.relevantContent)}
- Recent generated content: ${memoryContext.recentGeneratedContent.map(c => `${c.type}: "${c.originalPrompt}"`).join(', ')}
- Previous modifications: ${memoryContext.modificationHistory.map(m => `Modified ${m.originalContent?.type} because: ${m.reason}`).join(', ')}

CONTENT MODIFICATION AWARENESS:
- I can modify previously generated content when users request specific changes
- I remember what I've created and can adjust it based on feedback
- I track modification patterns to improve future generation
- I understand references to "the code", "the image", "the document" etc.

RESPONSE COHERENCE GUIDELINES:
- Reference your memory of previous function usage when relevant
- Build upon successful patterns from past interactions
- Acknowledge when you're repeating successful approaches
- Be specific about which capabilities you plan to use and why
- Maintain consistent personality and knowledge across all responses
- Never contradict previous statements about your capabilities
- Always explain your reasoning for function selection based on memory
- Recognize when users want to modify previous content vs create new content

CURRENT SESSION STATUS:
- Enabled modes: ${Object.entries(this.modes).filter(([k, v]) => v).map(([k]) => k).join(', ')}
- Conversation context: ${this.conversationHistory.length} messages
- Live data available: ${Object.keys(liveContext).join(', ')}
- User's primary intent: ${modeAnalysis.primaryIntent || 'informational'}
- Planned functions: ${Object.entries(modeAnalysis.recommendedModes || {}).filter(([k, v]) => v).map(([k]) => k).join(', ')}

MEMORY-INFORMED INSTRUCTIONS:
1. Always announce what functions you plan to use and why
2. Reference similar past queries when making decisions
3. Build upon previous successful interactions
4. Explain how your memory influences your approach
5. Maintain coherence across the entire session
6. Track and improve based on function success rates
7. Recognize modification requests and handle them appropriately
8. Remember what you've generated and be ready to modify it

Context from previous conversation: ${this.conversationHistory.slice(-3).map(msg => `${msg.role}: ${msg.content.substring(0, 150)}`).join('\n')}

Available live data: ${JSON.stringify(liveContext)}

Respond in ${this.currentLanguage} with clear, well-formatted content that demonstrates full awareness of your capabilities and memory.`;

    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...this.conversationHistory.slice(-6), // Include more context for coherence
        {
          role: "user", 
          content: message
        }
      ]
    });

    return this.cleanResponse(completion.content);
  }

  // New method to clean responses and remove artifacts
  cleanResponse(content) {
    return content
      // Remove any placeholder artifacts
      .replace(/\$\d+/g, '')
      .replace(/\$\{.*?\}/g, '')
      .replace(/\[\$\d+\]/g, '')
      // Remove duplicate spaces and clean up formatting
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }

  // Enhanced specialized mode processing
  async processSpecializedModes(message, modeAnalysis, liveContext) {
    const responses = [];
    const modes = modeAnalysis.recommendedModes || {};

    // Only process modes that are recommended and enabled
    const processingPromises = [];

    if (modes.research && this.modes.research) {
      processingPromises.push(this.processResearchMode(message, liveContext));
    }

    if (modes.analytical && this.modes.analytical) {
      processingPromises.push(this.processAnalyticalMode(message, liveContext));
    }

    if (modes.image && this.modes.image) {
      processingPromises.push(this.processImageMode(message));
    }

    if (modes.chart) {
      processingPromises.push(this.generateSpecificChart(message));
    }

    if (modes.code && this.modes.code) {
      processingPromises.push(this.processCodeMode(message));
    }

    if (modes.vr && this.modes.virtualReality) {
      processingPromises.push(this.processVRMode(message));
    }

    if (modes.document && this.modes.document) {
      processingPromises.push(this.processDocumentMode(message));
    }

    // Process in parallel but limit to 2 concurrent for better performance
    const batchSize = 2;
    for (let i = 0; i < processingPromises.length; i += batchSize) {
      const batch = processingPromises.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(batch);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          responses.push(result.value);
        }
      });
    }

    return responses;
  }

  // Enhanced research mode with better source handling
  async processResearchMode(message, liveContext = {}) {
    if (!this.modes.research) return null;

    const startTime = Date.now();
    
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Conduct thorough research on: "${message}"
                   
                   Provide comprehensive, factual information with:
                   - Clear structure and organization
                   - Specific, verifiable sources with URLs when possible
                   - Key statistics and data points
                   - Multiple perspectives on the topic
                   - Practical implications or applications
                   
                   Format sources as: [Source Name](URL) or [Source Name] for references
                   Include publication dates when available
                   
                   Live context: ${JSON.stringify(liveContext)}
                   Language: ${this.currentLanguage}`
        }
      ]
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const cleanContent = this.cleanResponse(completion.content);
    const sources = this.extractEnhancedSources(cleanContent);

    return {
      type: 'research',
      content: cleanContent,
      sources: sources,
      processingTime: processingTime,
      metadata: {
        sourceCount: sources.length,
        researchDepth: sources.length > 3 ? 'comprehensive' : 'basic'
      }
    };
  }

  // Enhanced analytical mode with better insights
  async processAnalyticalMode(message, liveContext = {}) {
    if (!this.modes.analytical) return null;
    
    const startTime = Date.now();
    
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Perform deep analytical reasoning on: "${message}"
                   
                   Provide:
                   - Multi-faceted analysis from different angles
                   - Logical reasoning chains
                   - Pros and cons evaluation
                   - Underlying factors and relationships
                   - Potential implications and outcomes
                   - Data-driven insights where applicable
                   
                   If data visualization would help, include chart data in JSON format:
                   \`\`\`json
                   {chart configuration}
                   \`\`\`
                   
                   Live context: ${JSON.stringify(liveContext)}
                   Language: ${this.currentLanguage}`
        }
      ]
    });

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const cleanContent = this.cleanResponse(completion.content);
    
    // Extract chart data if present
    let chartData = null;
    const chartMatch = cleanContent.match(/```json\s*(\{.*?\})\s*```/s);
    if (chartMatch) {
      try {
        chartData = JSON.parse(chartMatch[1]);
        // Remove chart data from content
        cleanContent = cleanContent.replace(chartMatch[0], '');
      } catch (e) {
        console.error('Error parsing chart data:', e);
      }
    }

    return {
      type: 'analysis',
      content: cleanContent,
      chartData: chartData,
      processingTime: processingTime,
      metadata: {
        analysisType: 'comprehensive',
        complexity: processingTime > 3 ? 'high' : 'moderate'
      }
    };
  }

  async generateSpecificChart(message) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Generate visualization data for the following request: ${message}.
                    Return only valid, well-structured JSON that can be used with Chart.js.
                    Choose the most appropriate chart type (bar, line, pie, doughnut, radar, etc.)
                    Include descriptive labels, properly formatted datasets, and all necessary chart data.
                    Use an appropriate color scheme for the data visualization.
                    The JSON should be formatted like: 
                    {
                      "type": "bar|line|pie|doughnut|radar",
                      "data": {
                        "labels": ["Label1", "Label2", ...],
                        "datasets": [{
                          "label": "Dataset Name",
                          "data": [value1, value2, ...],
                          "backgroundColor": ["color1", "color2", ...],
                          "borderColor": ["color1", "color2", ...],
                          "borderWidth": 1
                        }]
                      },
                      "options": {
                        "title": {
                          "display": true,
                          "text": "Chart Title"
                        }
                      }
                    }`
        }
      ],
      json: true
    });

    try {
      const chartData = JSON.parse(completion.content);
      
      // Add a title to the chart data based on the message
      let title = message;
      if (message.length > 30) {
        title = message.substring(0, 30) + '...';
      }
      
      return {
        type: 'chart',
        chartData: chartData,
        title: title
      };
    } catch (e) {
      console.error('Error parsing chart data:', e);
      return null;
    }
  }
  
  async generateSchema(message) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Create a schema or diagram description for: ${message}.
                   Return a detailed, structured description that could be used to generate a visual diagram.
                   Include relationships, hierarchies, and key elements.
                   Format the response for easy visualization.`
        }
      ]
    });
    
    return {
      type: 'schema',
      content: completion.content,
      title: `Schema: ${message.substring(0, 30)}...`
    };
  }
  
  // Enhanced helper methods with memory context
  shouldUseResearchMode(message, memoryContext = null) {
    const researchKeywords = ['research', 'investigate', 'study', 'facts', 'data', 'statistics', 'information', 'sources', 'evidence',
                             'investigar', 'estudiar', 'datos', 'estadísticas', 'información', 'fuentes', 'evidencia'];
    
    const keywordMatch = researchKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    
    // Consider memory context
    const memoryBoost = memoryContext?.preferredModes?.includes('research') ? 0.2 : 0;
    const similarSuccess = memoryContext?.relevantContent?.research ? 0.3 : 0;
    
    return keywordMatch || (memoryBoost + similarSuccess) > 0.4;
  }

  shouldUseAnalyticalMode(message, memoryContext = null) {
    const analyticalKeywords = ['analyze', 'compare', 'evaluate', 'pros', 'cons', 'advantages', 'disadvantages', 'implications',
                               'analizar', 'comparar', 'evaluar', 'ventajas', 'desventajas', 'implicaciones'];
    
    const keywordMatch = analyticalKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    
    // Consider memory context
    const memoryBoost = memoryContext?.preferredModes?.includes('analytical') ? 0.2 : 0;
    const similarSuccess = memoryContext?.relevantContent?.analytical ? 0.3 : 0;
    
    return keywordMatch || (memoryBoost + similarSuccess) > 0.4;
  }

  shouldGenerateImage(message, memoryContext = null) {
    const imageKeywords = ['image', 'picture', 'visual', 'draw', 'create', 'generate', 'show me', 'visualize',
                          'imagen', 'foto', 'visual', 'dibujar', 'crear', 'generar', 'muéstrame', 'visualizar'];
    
    const keywordMatch = imageKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    
    // Consider memory context
    const memoryBoost = memoryContext?.preferredModes?.includes('image') ? 0.2 : 0;
    const similarSuccess = memoryContext?.relevantContent?.image ? 0.3 : 0;
    
    return keywordMatch || (memoryBoost + similarSuccess) > 0.4;
  }

  shouldGenerateCode(message, memoryContext = null) {
    const codeKeywords = ['code', 'program', 'script', 'function', 'algorithm', 'javascript', 'python', 'html', 'css',
                         'código', 'programa', 'función', 'algoritmo'];
    
    const keywordMatch = codeKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    
    // Consider memory context
    const memoryBoost = memoryContext?.preferredModes?.includes('code') ? 0.2 : 0;
    const similarSuccess = memoryContext?.relevantContent?.code ? 0.3 : 0;
    
    return keywordMatch || (memoryBoost + similarSuccess) > 0.4;
  }

  shouldGenerateVR(message, memoryContext = null) {
    const vrKeywords = ['vr', 'virtual reality', 'ar', 'augmented reality', '3d', 'scene', 'environment', 'immersive',
                       'realidad virtual', 'realidad aumentada', 'escena', 'ambiente', 'inmersivo'];
    
    const keywordMatch = vrKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    
    // Consider memory context
    const memoryBoost = memoryContext?.preferredModes?.includes('vr') ? 0.2 : 0;
    const similarSuccess = memoryContext?.relevantContent?.vr ? 0.3 : 0;
    
    return keywordMatch || (memoryBoost + similarSuccess) > 0.4;
  }

  shouldGenerateDocument(message, memoryContext = null) {
    const docKeywords = ['document', 'report', 'pdf', 'word', 'excel', 'powerpoint', 'presentation',
                        'documento', 'reporte', 'presentación'];
    
    const keywordMatch = docKeywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()));
    
    // Consider memory context
    const memoryBoost = memoryContext?.preferredModes?.includes('document') ? 0.2 : 0;
    const similarSuccess = memoryContext?.relevantContent?.document ? 0.3 : 0;
    
    return keywordMatch || (memoryBoost + similarSuccess) > 0.4;
  }

  // Enhanced method to get a base response
  async getBaseResponse(message, liveContext = {}) {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are InnovA+, a helpful, informative and professional assistant.
                   Provide coherent, well-structured responses that directly answer the user's question.
                   Use markdown formatting for better visual presentation.
                   
                   Your capabilities include:
                   - Generate and display images based on descriptions
                   - Create interactive VR/AR scenes  
                   - Generate various document formats (PDF, DOCX, PPTX, XLSX)
                   - Create code in multiple programming languages
                   - Generate data visualizations and charts
                   - Produce diagrams and schemas for complex topics
                   - Research topics with accurate references
                   - Deep analytical reasoning
                   
                   Always provide a complete, helpful response even if no specialized modes are needed.
                   Focus on being accurate, informative and conversational.
                   
                   Respond in ${this.currentLanguage} only.
                   If available, use this live context data: ${JSON.stringify(liveContext)}`
        },
        ...this.conversationHistory,
        {
          role: "user", 
          content: message
        }
      ]
    });

    return completion.content;
  }

  // Enhanced message formatting with better visual hierarchy
  formatEnhancedMessage(text) {
    return text
      // Clean up any remaining artifacts first
      .replace(/\$\d+/g, '')
      .replace(/\$\{.*?\}/g, '')
      .replace(/\[\$\d+\]/g, '')
      // Enhanced headers with better hierarchy and styling
      .replace(/^### (.*$)/gm, '<h3 class="response-heading level-3"><span class="heading-decorator">▶</span>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="response-heading level-2"><span class="heading-decorator">●</span>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="response-heading level-1"><span class="heading-decorator">★</span>$1</h1>')
      // Enhanced emphasis with better visual treatment
      .replace(/\*\*(.*?)\*\*/g, '<strong class="response-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="response-italic">$1</em>')
      // Enhanced lists with better styling
      .replace(/^\s*[-*+]\s+(.+)$/gm, '<li class="response-list-item">$1</li>')
      .replace(/^\s*\d+\.\s+(.+)$/gm, '<li class="response-numbered-item">$1</li>')
      // Wrap consecutive list items with enhanced containers
      .replace(/(<li class="response-list-item">.*?<\/li>)/gs, '<ul class="response-list">$1</ul>')
      .replace(/(<li class="response-numbered-item">.*?<\/li>)/gs, '<ol class="response-numbered-list">$1</ol>')
      // Enhanced code blocks with syntax highlighting support
      .replace(/```(.*?)\n([\s\S]*?)```/g, '<div class="code-block-container"><div class="code-block-header"><span class="code-language">$1</span><button class="copy-code-btn" onclick="this.copyCode(this)">📋 Copy</button></div><pre class="code-block"><code class="language-$1">$2</code></pre></div>')
      // Enhanced inline code
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      // Enhanced links with better visual treatment
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="response-link">$1 <span class="link-icon">↗</span></a>')
      // Enhanced blockquotes
      .replace(/^>\s*(.+)$/gm, '<blockquote class="response-quote">$1</blockquote>')
      // Enhanced paragraphs with better spacing
      .replace(/\n\s*\n/g, '</p><p class="response-paragraph">')
      .replace(/^(?!<[h1-6]|<ul|<ol|<div|<pre|<blockquote)(.+)$/gm, '<p class="response-paragraph">$1</p>')
      // Clean up any malformed tags
      .replace(/<\/p><p class="response-paragraph"><([h1-6]|ul|ol|div|pre|blockquote)/g, '<$1')
      .replace(/(<\/[h1-6]>|<\/ul>|<\/ol>|<\/div>|<\/pre>|<\/blockquote>)<p class="response-paragraph">/g, '$1')
      // Final cleanup
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Enhanced sources section creation
  createEnhancedSourcesSection(sources) {
    const sourcesDiv = document.createElement('div');
    sourcesDiv.classList.add('research-sources-section');
    
    const uniqueSources = this.deduplicateSources(sources);
    
    sourcesDiv.innerHTML = `
      <div class="sources-header">
        <span class="sources-icon">📚</span>
        <h4>${this.currentLanguage === 'es' ? 'Fuentes de investigación' : 'Research Sources'} (${uniqueSources.length})</h4>
      </div>
      <div class="sources-list">
        ${uniqueSources.map((source, index) => `
          <div class="source-item">
            <span class="source-number">${index + 1}</span>
            <div class="source-content">
              ${source.url ? 
                `<a href="${source.url}" target="_blank" class="source-link">${source.text}</a>` :
                `<span class="source-text">${source.text}</span>`
              }
              ${source.date ? `<span class="source-date">${source.date}</span>` : ''}
            </div>
            <span class="source-type-icon">${this.getSourceTypeIcon(source.type)}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    return sourcesDiv;
  }

  // Deduplicate sources to avoid repetition
  deduplicateSources(sources) {
    const seen = new Set();
    return sources.filter(source => {
      const key = source.url || source.text;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Get appropriate icon for source type
  getSourceTypeIcon(type) {
    const icons = {
      'link': '🔗',
      'url': '🌐',
      'reference': '📄',
      'academic': '🎓',
      'news': '📰',
      'official': '🏛️'
    };
    return icons[type] || '📄';
  }

  // Show image in modal
  showImageModal(imageUrl) {
    const modal = document.getElementById('imageModal') || this.createImageModal();
    const modalImage = modal.querySelector('#modalImage');
    
    modalImage.src = imageUrl;
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Add click to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeImageModal();
      }
    });
  }

  // Create image modal if it doesn't exist
  createImageModal() {
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <button class="modal-close" onclick="window.chat.closeImageModal()">&times;</button>
        <img id="modalImage" src="" alt="Generated image">
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  // Close image modal
  closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show');
    }
  }
}

// Add copy code functionality globally
window.copyCode = function(button) {
  const codeBlock = button.parentElement.nextElementSibling.querySelector('code');
  if (codeBlock) {
    navigator.clipboard.writeText(codeBlock.textContent).then(() => {
      const originalText = button.textContent;
      button.textContent = '✓ Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  }
};