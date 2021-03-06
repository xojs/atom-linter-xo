const {Range} = require('atom');
const {generateRange} = require('atom-linter');
const ruleURI = require('eslint-rule-documentation');

// (editor: Object, message: Object) => Array<Object>
function selectSolutions(editor, message) {
	const {fix} = message;
	const buffer = editor.getBuffer();

	if (!fix) {
		return [];
	}

	const {range, text} = fix;

	if (!Array.isArray(range)) {
		return [];
	}

	if (typeof text !== 'string') {
		return [];
	}

	const position = new Range(...range.map(index => buffer.positionForCharacterIndex(index)));
	return [{position, replaceWith: text}];
}

// (message: Object) => string
function selectUrl(message) {
	const result = ruleURI(message.ruleId || '');
	return result.found ? result.url : '';
}

// (message: Object) => string
function selectExcerpt(message) {
	return message.message;
}

// (editor: Object, message: Object) => Array<number>
function selectLocation(editor, x) {
	return {
		file: editor.getPath(),
		position: selectPosition(editor, x)
	};
}

// (editor: Object, message: Object) => Array<number>
function selectPosition(editor, x) {
	const messageLine = x.line - 1;

	if (typeof x.endColumn === 'number' && typeof x.endLine === 'number') {
		const messageColumn = Math.max(0, x.column - 1);
		return [[messageLine, messageColumn], [x.endLine - 1, x.endColumn - 1]];
	}

	if (typeof x.line === 'number' && typeof x.column === 'number') {
		// We want msgCol to remain undefined if it was intentional so
		// `generateRange` will give us a range over the entire line
		const messageColumn = typeof x.column === 'undefined' ? x.column : x.column - 1;

		try {
			return generateRange(editor, messageLine, messageColumn);
		} catch {
			throw new Error(`Failed getting range. This is most likely an issue with ESLint. (${x.ruleId} - ${x.message} at ${x.line}:${x.column})`);
		}
	}
}

// (message: Object) => string
function selectSeverity(message) {
	return message.severity === 2 ? 'error' : 'warning';
}

// (editor: Object) => function
function format(editor) {
	// (report?: Object) => Array<Object>
	return report => {
		if (!report) {
			return [];
		}

		const {results = []} = report;
		const [result] = results;

		if (!result) {
			return [];
		}

		const {messages} = result;

		if (!messages) {
			return [];
		}

		return messages.map(message => {
			return {
				location: selectLocation(editor, message),
				url: selectUrl(message),
				excerpt: selectExcerpt(message),
				severity: selectSeverity(message),
				solutions: selectSolutions(editor, message)
			};
		});
	};
}

module.exports = format;
