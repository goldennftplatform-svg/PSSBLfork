/**
 * PSSBL Help Bot - Main Controller
 * Manages the chat interface and user interactions
 */

angular.module('pssblApp').controller('helpbotController', ['$scope', '$http', '$timeout', '$window', '$rootScope', 'helpbotFactory',
    function($scope, $http, $timeout, $window, $rootScope, helpbotFactory) {

        // ==========================================
        // SCOPE VARIABLES
        // ==========================================

        $scope.messages = [];
        $scope.isTyping = false;
        $scope.userInput = '';
        $scope.currentLanguage = 'en';
        $scope.isOnline = true;

        // Voice support (Phase 2)
        $scope.voiceEnabled = false;
        $scope.isRecording = false;
        $scope.isPlaying = false;

        // App configuration (from app_bot.js)
        $scope.appConfig = {
            name: 'PSSBL AI Assistant',
            version: '1.0.0',
            supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'it', 'ru'],
            defaultLanguage: 'en',
            maxMessageLength: 2000
        };

        // ==========================================
        // HELPER FUNCTIONS (from app_bot.js)
        // ==========================================

        // Session ID generation
        $scope.getSessionId = function() {
            var sessionId = sessionStorage.getItem('helpbot_session_id');
            if (!sessionId) {
                sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                sessionStorage.setItem('helpbot_session_id', sessionId);
            }
            return sessionId;
        };

        $scope.sessionId = $scope.getSessionId();

        // Format timestamp
        $scope.formatTimestamp = function(date) {
            if (!date) return '';
            var d = new Date(date);
            return d.toLocaleTimeString();
        };

        // Format date
        $scope.formatDate = function(date) {
            if (!date) return '';
            var d = new Date(date);
            return d.toLocaleDateString();
        };

        // Truncate text
        $scope.truncateText = function(text, maxLength) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        };

        // Handle key press events
        $scope.handleKeyPress = function(event) {
            if (event.keyCode === 13 && !event.shiftKey) {
                // Enter without Shift - send message
                event.preventDefault();
                $scope.sendMessage();
            }
            // Shift+Enter is handled naturally by textarea for new lines
        };

        // ==========================================
        // INITIALIZATION
        // ==========================================

        init();

        function init() {
            // Load user preferences if logged in
            loadUserPreferences();

            // Check service health
            checkHealth();

            // Initialize with greeting message
            addGreetingMessage();

            // Add class for background styling
            document.body.classList.add('helpbot-page');
            console.log('Added helpbot-page class to body:', document.body.className);

            // Focus on input
            $timeout(function() {
                var input = document.getElementById('user-input');
                if (input) input.focus();
            }, 100);

            // Load conversation history if available
            loadConversationHistory();
        };

        // Initialization is already done above

        function loadUserPreferences() {
            // Will be implemented when user auth is connected
            $scope.userPreferences = {
                language: 'en',
                voiceEnabled: false,
                theme: 'light'
            };
        }

        function checkHealth() {
            helpbotFactory.healthCheck()
                .then(function(response) {
                    $scope.isOnline = (response.status === 'online');
                })
                .catch(function() {
                    $scope.isOnline = false;
                });
        }

        function addGreetingMessage() {
            var greeting = getGreetingMessage($scope.currentLanguage);
            $scope.messages.push({
                role: 'assistant',
                content: greeting,
                timestamp: new Date()
            });
        }

        function getGreetingMessage(language) {
            var greetings = {
                'en': 'Hello! I\'m the PSSBL AI Assistant. How can I help you today? You can ask me about league rules, registration, divisions, schedules, and more.',
                'es': '¡Hola! Soy el asistente de IA de la PSSBL. ¿Cómo puedo ayudarte hoy? Puedes preguntarme sobre las reglas de la liga, registro, divisiones, horarios y más.',
                'fr': 'Bonjour! Je suis l\'assistant IA de la PSSBL. Comment puis-je vous aider aujourd\'hui? Vous pouvez me poser des questions sur les règles de la ligue, l\'inscription, les divisions, les horaires, et plus encore.',
                'de': 'Hallo! Ich bin der PSSBL-KI-Assistent. Wie kann ich Ihnen heute helfen? Sie können mich nach Ligaregeln, Anmeldung, Divisionen, Spielplänen und mehr fragen.',
                'zh': '你好！我是PSSBL AI助手。今天我能为您做些什么？您可以向我询问有关联盟规则、注册、分区、时间表等更多信息。',
                'ja': 'こんにちは！PSSBL AIアシスタントです。今日はどのようにお手伝いできますか？リーグのルール、登録、ディビジョン、スケジュールなどについて質問できます。',
                'ko': '안녕하세요! 저는 PSSBL AI 어시스턴트입니다. 오늘 어떻게 도와드릴까요? 리그 규칙, 등록, 디비전, 일정 등에 대해 물어볼 수 있습니다.',
                'pt': 'Olá! Sou o assistente de IA da PSSBL. Como posso ajudá-lo hoje? Você pode me perguntar sobre regras da liga, registro, divisões, horários e muito mais.',
                'it': 'Ciao! Sono l\'assistente IA della PSSBL. Come posso aiutarti oggi? Puoi chiedermi delle regole della lega, registrazione, divisioni, orari e altro ancora.',
                'ru': 'Здравствуйте! Я AI-ассистент PSSBL. Чем могу помочь сегодня? Вы можете спросить меня о правилах лиги, регистрации, дивизионах, расписании и многом другом.'
            };

            return greetings[language] || greetings['en'];
        }

        function loadConversationHistory() {
            // Load previous conversation from this session
            helpbotFactory.getConversationHistory($scope.sessionId)
                .then(function(history) {
                    if (history && history.length > 0) {
                        // Clear default greeting if we have history
                        $scope.messages = [];

                        // Load history messages
                        history.forEach(function(conv) {
                            $scope.messages.push({
                                role: 'user',
                                content: conv.message,
                                timestamp: new Date(conv.created_date),
                                language: conv.detected_language
                            });

                            $scope.messages.push({
                                role: 'assistant',
                                content: conv.response,
                                timestamp: new Date(conv.created_date),
                                sources: JSON.parse(conv.context_used || '[]')
                            });
                        });

                        // Scroll to bottom
                        $timeout(scrollToBottom, 100);
                    }
                })
                .catch(function() {
                    // No history to load, that's fine
                });
        }

        // ==========================================
        // MESSAGE HANDLING
        // ==========================================

        /**
         * Send user message to help bot
         */
        $scope.sendMessage = function() {
            var message = $scope.userInput.trim();

            // Validation
            if (!message) {
                return;
            }

            if (message.length > $scope.appConfig.maxMessageLength) {
                showError('Message is too long. Please keep it under ' + $scope.appConfig.maxMessageLength + ' characters.');
                return;
            }

            // Detect language
            $scope.currentLanguage = detectLanguage(message);

            // Add user message to chat
            $scope.messages.push({
                role: 'user',
                content: message,
                timestamp: new Date(),
                language: $scope.currentLanguage
            });

            // Clear input
            $scope.userInput = '';

            // Show typing indicator
            $scope.isTyping = true;

            // Scroll to bottom
            $timeout(scrollToBottom, 100);

            // Send to API
            helpbotFactory.sendMessage(message, $scope.sessionId, $scope.currentLanguage, $scope.messages)
                .then(function(response) {
                    // Hide typing indicator
                    $scope.isTyping = false;

                    // Check for errors
                    if (response.error) {
                        showError(response.error);
                        return;
                    }

                    // Add bot response
                    var botMessage = {
                        role: 'assistant',
                        content: response.reply,
                        timestamp: new Date(),
                        sources: response.sources || [],
                        language: response.language || $scope.currentLanguage
                    };

                    $scope.messages.push(botMessage);

                    // Update language if detected
                    if (response.language && response.language !== $scope.currentLanguage) {
                        $scope.currentLanguage = response.language;
                    }

                    // Scroll to bottom
                    $timeout(scrollToBottom, 100);

                    // Focus back to input
                    $timeout(function() {
                        var input = document.getElementById('user-input');
                        if (input) input.focus();
                    }, 150);

                })
                .catch(function(error) {
                    $scope.isTyping = false;

                    var errorMsg = 'Sorry, I encountered an error. Please try again.';
                    if (error.details && error.details.message) {
                        errorMsg += ' (' + error.details.message + ')';
                    }

                    $scope.messages.push({
                        role: 'assistant',
                        content: errorMsg,
                        timestamp: new Date(),
                        isError: true
                    });

                    $timeout(scrollToBottom, 100);
                    
                    // Focus back to input
                    $timeout(function() {
                        var input = document.getElementById('user-input');
                        if (input) input.focus();
                    }, 150);
                });
        };

        /**
         * Clear chat history
         */
        $scope.clearHistory = function() {
            if (confirm('Are you sure you want to clear all chat history? This cannot be undone.')) {
                // Clear local messages
                $scope.messages = [];
                
                // Clear session storage
                sessionStorage.removeItem('helpbot_session_id');
                
                // Generate new session ID
                $scope.sessionId = $scope.getSessionId();
                
                // Re-initialize with greeting
                addGreetingMessage();
                
                // Show confirmation
                $scope.$apply();
            }
        };

        /**
         * Rate a bot response
         */
        $scope.rateResponse = function(messageIndex, rating) {
            helpbotFactory.rateResponse($scope.sessionId, messageIndex, rating)
                .then(function() {
                    // Show brief confirmation
                    var message = $scope.messages[messageIndex];
                    if (message) {
                        message.rated = true;
                        message.rating = rating;
                    }
                })
                .catch(function(error) {
                    console.error('Failed to rate response:', error);
                });
        };

        // ==========================================
        // LANGUAGE DETECTION
        // ==========================================

        function detectLanguage(text) {
            // LLM-based language detection will happen on the server
            // For now, do basic client-side detection for common patterns

            var patterns = {
                'es': /\b(hola|gracias|por favor|¿|qué|cómo|dónde|cuándo|registrarse|inscripción|ayuda)\b/i,
                'fr': /\b(bonjour|merci|s'il vous plaît|quoi|comment|où|quand|aide)\b/i,
                'de': /\b(hallo|danke|bitte|was|wie|wo|wann|hilfe)\b/i,
                'zh': /[\u4e00-\u9fff]/,
                'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
                'ko': /[\uac00-\ud7af]/,
                'pt': /\b(olá|obrigado|por favor|o quê|como|onde|quando|ajuda)\b/i,
                'it': /\b(ciao|grazie|per favore|cosa|come|dove|quando|aiuto)\b/i,
                'ru': /[\u0400-\u04FF]/
            };

            // Check each language pattern
            for (var lang in patterns) {
                if (patterns[lang].test(text)) {
                    return lang;
                }
            }

            // Check for English as default
            if (/\b(hello|thank|please|what|how|where|when|help|register)\b/i.test(text)) {
                return 'en';
            }

            // Default to English
            return 'en';
        }

        // ==========================================
        // UI HELPERS
        // ==========================================

        function scrollToBottom() {
            var chatMessages = document.getElementById('chat-messages');
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        function showError(message) {
            $scope.messages.push({
                role: 'assistant',
                content: message,
                timestamp: new Date(),
                isError: true
            });

            $timeout(scrollToBottom, 100);
        }

        /**
         * Handle keyboard input (Enter to send, Shift+Enter for new line)
         */
        $scope.handleKeyPress = function(event) {
            if (event.which === 13 && !event.shiftKey) {
                event.preventDefault();
                $scope.sendMessage();
            }
        };

        // ==========================================
        // VOICE SUPPORT (PHASE 2)
        // ==========================================

        $scope.toggleVoice = function() {
            // Will be implemented in Phase 2
            console.log('Voice support coming in Phase 2');
        };

        $scope.startRecording = function() {
            // Will be implemented in Phase 2
        };

        $scope.stopRecording = function() {
            // Will be implemented in Phase 2
        };

        // ==========================================
        // WATCHERS
        // ==========================================

        // Watch for new messages to auto-scroll
        $scope.$watch('messages.length', function() {
            $timeout(scrollToBottom, 50);
        });

        // ==========================================
        // CLEANUP
        // ==========================================

        $scope.$on('$destroy', function() {
            // Remove the helpbot-page class from body when navigating away
            document.body.classList.remove('helpbot-page');
        });

    }
]);
