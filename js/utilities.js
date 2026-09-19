var Utilities = {

    version: "1.0",

    loggingEnabled: false,

    enableLogging: function (setting) {
        if (setting == undefined) {
            this.loggingEnabled = ! this.loggingEnabled;
        } else {
            this.loggingEnabled = setting;
        }
    },

    // This is a simple string replace that does not use regular expressions
    // So the strings can contain any characters
    replace: function (find, replace, str) {
        var index = str.indexOf(find);
        if (index >= 0) {
            return str.substr(0, index) + replace + str.substr(index + find.length);
        } else {
            return str;
        }
    },

    isValidDate: function (testDate) {
        if (!testDate) return false;
        if (testDate.match(/^(?:(0[1-9]|1[012])[\- \/.](0[1-9]|[12][0-9]|3[01])[\- \/.](19|20)[0-9]{2})$/)) {
            return true;
        } else {
            return false;
        }
    },

    isValidEmail: function (testEmail) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    },

    replaceAll: function (find, replace, str) {
        return str.replace(new RegExp(find, 'g'), replace);
    },

    extractBetween: function (before, after, str) {
        if (!str || str.length == 0) return "";
        var startPos = 0;
        var endPos = str.length;
        if (before && before.length > 0) {
            startPos = str.indexOf(before);
            if (startPos < 0) {
                return "";
            } else {
                startPos += before.length;
            }
        }
        if (after && after.length > 0) {
            endPos = str.indexOf(after, startPos);
            if (endPos < 0) {
                return "";
            }
        }
        return str.substring(startPos, endPos);
    },

    capitalize: function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    // All logging will pass through here so it can be easily turned on or off.
    log: function (message) {
        if (Utilities.loggingEnabled) {
            var timer = (.001 * performance.now()).toFixed(3);
            console.log(timer + ": " + message);   // May want to expand for multiple arguments
            //console.trace();
        }
    }
}

// Small function to convert basic markdown to html

; function mmd(src) {
    var h = '';

    function escape(t) {
        return new Option(t).innerHTML;
    }
    function inlineEscape(s) {
        return escape(s)
			.replace(/!\[([^\]]*)]\(([^(]+)\)/g, '<img alt="$1" src="$2">')
			.replace(/\[([^\]]+)]\(([^(]+)\)/g, '$1'.link('$2'))
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }

    src
	.replace(/^\s+|\r|\s+$/g, '')
	.replace(/\t/g, '    ')
	.split(/\n\n+/)
	.forEach(function (b, f, R) {
	    f = b[0];
	    R =
		{
		    '*': [/\n\* /, '<ul><li>', '</li></ul>'],
		    '1': [/\n[1-9]\d*\.? /, '<ol><li>', '</li></ol>'],
		    ' ': [/\n    /, '<pre><code>', '</pre></code>', '\n'],
		    '>': [/\n> /, '<blockquote>', '</blockquote>', '\n']
		}[f];
	    h +=
			R ? R[1] + ('\n' + b)
				.split(R[0])
				.slice(1)
				.map(R[3] ? escape : inlineEscape)
				.join(R[3] || '</li>\n<li>') + R[2] :
			f == '#' ? '<h' + (f = b.indexOf(' ')) + '>' + inlineEscape(b.slice(f + 1)) + '</h' + f + '>' :
			f == '<' ? b :
			'<p>' + inlineEscape(b) + '</p>';
	});
    return h;
};

// Even smaller version removing unnecessary translations
; function md_to_html(src) {
    var h = '';

    function escape(t) {
        return t;
    }
    function inlineEscape(s) {
        return escape(s)
			.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
			.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }

    src
	.replace(/^\s+|\r|\s+$/g, '')
	.split(/\n\n+/)
	.forEach(function (b, f, R) {
	    f = b[0];
	    R =
		{
		}[f];
	    h +=
			R ? R[1] + ('\n' + b)
				.split(R[0])
				.slice(1)
				.map(R[3] ? escape : inlineEscape) + R[2] :
			f == '#' ? '<h' + (f = b.indexOf(' ')) + '>' + inlineEscape(b.slice(f + 1)) + '</h' + f + '>' :
			f == '<' ? b :
			'<p>' + inlineEscape(b) + '</p>';
	});
    return h;
};