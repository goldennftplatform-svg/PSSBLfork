/**
 * PCBL Help Bot - API Factory
 * Handles all API communication between frontend and backend
 */

angular.module('pcblApp').factory('helpbotFactory', ['$http', '$q', '$rootScope', function($http, $q, $rootScope) {

    // App configuration (from app_bot.js)
    $rootScope.appConfig = {
        name: 'PCBL AI Assistant',
        version: '1.0.0',
        supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'pt', 'it', 'ru'],
        defaultLanguage: 'en',
        maxMessageLength: 2000
    };

    // Determine base URL based on environment
    function getBaseUrl() {
        var hostname = window.location.hostname;

        // Local development - use remote test server
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'https://beta.pssbl.com/PHP/';
        }

        // Production servers
        if (hostname === 'pssbl.com') {
            return 'https://pssbl.com/PHP/';
        } else if (hostname === 'beta.pssbl.com') {
            return 'https://beta.pssbl.com/PHP/';
        }

        // Test/staging servers
        if (hostname === 'pssbl.richbonny.space') {
            return 'https://pssbl.richbonny.space/PHP/';
        }

        // Default fallback
        return "https://beta.pssbl.com/PHP/";
    }

    var baseUrl = getBaseUrl();
    console.log('Helpbot API Base URL:', baseUrl);

    // ==========================================
    // CHAT OPERATIONS
    // ==========================================

    /**
     * Send a chat message to the help bot
     * @param {string} message - User's message
     * @param {string} sessionId - Session identifier
     * @param {string} language - Detected language code
     * @param {array} conversationHistory - Conversation history
     * @returns {Promise} Response with reply, sources, and language
     */
    function sendMessage(message, sessionId, language, conversationHistory) {
        var deferred = $q.defer();

        // Validate input
        if (!message || !message.trim()) {
            deferred.reject({ error: 'Message cannot be empty' });
            return deferred.promise;
        }

        // Sanitize message (basic)
        message = message.trim().substring(0, $rootScope.appConfig.maxMessageLength);

        var payload = {
            type: 'chat',
            message: message,
            session_id: sessionId,
            language: language || 'en',
            conversation_history: JSON.stringify(conversationHistory || [])
        };

        $http.post(baseUrl + 'helpbot.php', payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            }
        })
        .then(function(response) {
            deferred.resolve(response.data);
        })
        .catch(function(error) {
            console.error('Send message error:', error);
            deferred.reject({
                error: 'Failed to send message',
                status: error.status,
                details: error.data
            });
        });

        return deferred.promise;
    }

    /**
     * Rate a bot response
     * @param {string} sessionId - Session identifier
     * @param {number} messageIndex - Message index in conversation
     * @param {string} rating - 'helpful' or 'not_helpful'
     * @returns {Promise}
     */
    function rateResponse(sessionId, messageIndex, rating) {
        var deferred = $q.defer();

        var payload = {
            type: 'rate',
            session_id: sessionId,
            message_index: messageIndex,
            rating: rating
        };

        $http.post(baseUrl + 'helpbot.php', payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            }
        })
        .then(function(response) {
            deferred.resolve(response.data);
        })
        .catch(function(error) {
            console.error('Rate response error:', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    // ==========================================
    // FAQ CRUD OPERATIONS
    // ==========================================

    /**
     * Get all FAQs
     * @returns {Promise} Array of FAQs
     */
    function getFAQs() {
        return $http.get(baseUrl + 'helpbot.php?type=get_faqs')
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Get FAQs error:', error);
                throw error;
            });
    }

    /**
     * Save (create or update) an FAQ
     * @param {object} faq - FAQ object
     * @returns {Promise}
     */
    function saveFAQ(faq) {
        var payload = {
            type: 'save_faq',
            faq: JSON.stringify(faq)
        };

        return $http.post(baseUrl + 'helpbot.php', payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            }
        })
        .then(function(response) {
            return response.data;
        })
        .catch(function(error) {
            console.error('Save FAQ error:', error);
            throw error;
        });
    }

    /**
     * Delete an FAQ (soft delete by setting active = false)
     * @param {number} faqId - FAQ ID
     * @returns {Promise}
     */
    function deleteFAQ(faqId) {
        var payload = {
            type: 'delete_faq',
            faq_id: faqId
        };

        return $http.post(baseUrl + 'helpbot.php', payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            }
        })
        .then(function(response) {
            return response.data;
        })
        .catch(function(error) {
            console.error('Delete FAQ error:', error);
            throw error;
        });
    }

    // ==========================================
    // CONTENT INDEXING
    // ==========================================

    /**
     * Trigger content indexing from sources
     * @returns {Promise} Indexing result with count
     */
    function indexContent() {
        return $http.post(baseUrl + 'helpbot.php', { type: 'index_content' }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            }
        })
        .then(function(response) {
            return response.data;
        })
        .catch(function(error) {
            console.error('Index content error:', error);
            throw error;
        });
    }

    /**
     * Get all indexed content
     * @returns {Promise} Array of indexed content
     */
    function getIndexedContent() {
        return $http.get(baseUrl + 'helpbot.php?type=get_indexed_content')
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Get indexed content error:', error);
                throw error;
            });
    }

    /**
     * Get content sources configuration
     * @returns {Promise} Content sources array
     */
    function getContentSources() {
        return $http.get(baseUrl + 'helpbot.php?type=get_content_sources')
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Get content sources error:', error);
                throw error;
            });
    }

    /**
     * Save content sources configuration
     * @param {array} sources - Array of content source objects
     * @returns {Promise}
     */
    function saveContentSources(sources) {
        var payload = {
            type: 'save_content_sources',
            sources: JSON.stringify(sources)
        };

        return $http.post(baseUrl + 'helpbot.php', payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            }
        })
        .then(function(response) {
            return response.data;
        })
        .catch(function(error) {
            console.error('Save content sources error:', error);
            throw error;
        });
    }

    // ==========================================
    // CONFIGURATION
    // ==========================================

    /**
     * Get all configuration values
     * @returns {Promise} Configuration object
     */
    function getConfig() {
        return $http.get(baseUrl + 'helpbot.php?type=get_config')
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Get config error:', error);
                throw error;
            });
    }

    /**
     * Save configuration values
     * @param {object} config - Configuration object
     * @returns {Promise}
     */
    function saveConfig(config) {
        var payload = {
            type: 'save_config',
            config: JSON.stringify(config)
        };

        return $http.post(baseUrl + 'helpbot.php', payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            transformRequest: function(obj) {
                var str = [];
                for (var p in obj) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
                return str.join('&');
            }
        })
        .then(function(response) {
            return response.data;
        })
        .catch(function(error) {
            console.error('Save config error:', error);
            throw error;
        });
    }

    // ==========================================
    // ANALYTICS
    // ==========================================

    /**
     * Get analytics data
     * @param {string} dateRange - Date range (7d, 30d, 90d, etc.)
     * @returns {Promise} Analytics data
     */
    function getAnalytics(dateRange) {
        return $http.get(baseUrl + 'helpbot.php?type=get_analytics&range=' + (dateRange || '30d'))
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Get analytics error:', error);
                throw error;
            });
    }

    /**
     * Get conversation history
     * @param {string} sessionId - Session ID
     * @returns {Promise} Conversation history
     */
    function getConversationHistory(sessionId) {
        return $http.get(baseUrl + 'helpbot.php?type=get_history&session_id=' + encodeURIComponent(sessionId))
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Get conversation history error:', error);
                throw error;
            });
    }

    // ==========================================
    // HEALTH CHECK
    // ==========================================

    /**
     * Check if the help bot service is online
     * @returns {Promise} Status object
     */
    function healthCheck() {
        return $http.get(baseUrl + 'helpbot.php?type=health')
            .then(function(response) {
                return response.data;
            })
            .catch(function(error) {
                console.error('Health check error:', error);
                return { status: 'error', message: 'Service unavailable' };
            });
    }

    // ==========================================
    // PUBLIC API
    // ==========================================

    return {
        // Chat operations
        sendMessage: sendMessage,
        rateResponse: rateResponse,

        // FAQ operations
        getFAQs: getFAQs,
        saveFAQ: saveFAQ,
        deleteFAQ: deleteFAQ,

        // Content operations
        indexContent: indexContent,
        getIndexedContent: getIndexedContent,
        getContentSources: getContentSources,
        saveContentSources: saveContentSources,

        // Configuration
        getConfig: getConfig,
        saveConfig: saveConfig,

        // Analytics
        getAnalytics: getAnalytics,
        getConversationHistory: getConversationHistory,

        // Health check
        healthCheck: healthCheck,

        // Utility
        getBaseUrl: function() { return baseUrl; }
    };
}]);
