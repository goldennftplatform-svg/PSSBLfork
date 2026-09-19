/**
 * PCBL Help Bot - Filters
 * AngularJS filters for the helpbot interface
 */

// Trust as HTML filter (for rendering markdown/formatted text)
angular.module('pcblApp').filter('trustAsHtml', ['$sce', function($sce) {
    return function(text) {
        if (!text) return '';
        
        // Convert markdown to HTML
        var html = text
            // Bold text **bold** -> <strong>bold</strong>
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Italic text *italic* -> <em>italic</em>
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Links [text](url) -> <a href="url">text</a>
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Fix missing spaces between words (common LLM issues)
            .replace(/([a-z])([A-Z])/g, '$1 $2') // lowercase to uppercase
            .replace(/(\w)([A-Z][a-z])/g, '$1 $2') // word boundaries
            // Line breaks
            .replace(/\n/g, '<br>');
            
        return $sce.trustAsHtml(html);
    };
}]);

// Newline to break filter
angular.module('pcblApp').filter('nlToBr', function() {
    return function(text) {
        if (!text) return '';
        return text.replace(/\n/g, '<br>');
    };
});

// Language code to name filter
angular.module('pcblApp').filter('languageName', function() {
    var languageNames = {
        'en': 'English',
        'es': 'Español',
        'fr': 'Français',
        'de': 'Deutsch',
        'zh': '中文',
        'ja': '日本語',
        'ko': '한국어',
        'pt': 'Português',
        'it': 'Italiano',
        'ru': 'Русский'
    };
    
    return function(code) {
        return languageNames[code] || code;
    };
});
