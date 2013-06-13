/**
 * Very simple serial port tool for Chrome browser.
 *
 * @author Priit Kallas <kallaspriit@gmail.com> 2013
 */
var connectionId = null,
	portOpen = false,
	history = [],
	historyIndex = 0;

function openPort(port) {
	chrome.serial.open(port, { bitrate: parseInt($('#bitrate').val()) }, function(info) {
		connectionId = info.connectionId;

		if (connectionId === -1) {
			alert('Opening serial port', port, 'failed');

			return;
		}

		portOpen = true;

		$('#close-btn').attr('disabled', null);
		$('#message').attr('disabled', null);

		readLoop();
	});
}

function closePort(callback) {
	if (connectionId === null) {
		return;
	}

	chrome.serial.close(connectionId, function() {
		connectionId = null;
		portOpen = false;

		$('#close-btn').attr('disabled', 'disabled');
		$('#message').attr('disabled', 'disabled');

		if (typeof(callback) === 'function') {
			callback();
		}
	});
}

function readLoop() {
	if (!portOpen) {
		return;
	}

	chrome.serial.read(connectionId, 1024, function(result) {
		if (result.bytesRead === 0) {
			return;
		}

		$('#log-wrap').append(arrayBufferToString(result.data).replace('<', '&lt;').replace('>', '&gt;'));

		if ($('#autoscroll').is(':checked')) {
			$('#log-wrap').scrollTop($('#log-wrap')[0].scrollHeight);
		}
	});

	setTimeout(readLoop, 0);
}

function send(message) {
	if (!portOpen) {
		return;
	}

	$('#log-wrap').append(
		'<div class="sent-message">&lt; ' + message.replace('<', '&lt;').replace('>', '&gt;') + '</div>'
	);

	chrome.serial.write(connectionId, stringToArrayBuffer(message), function() {});

	if (history[history.length - 1] !== message) {
		history.push(message);
		historyIndex = history.length - 1;
	}
}

function arrayBufferToString(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function stringToArrayBuffer(str) {
	var buf = new ArrayBuffer(str.length),
		bufView = new Uint8Array(buf),
		i;

	for (i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}

	return buf;
}

chrome.serial.getPorts(function(ports) {
	for (var i = 0; i < ports.length; i++) {
		$('#ports').append('<option value="' + ports[i] + '">' + ports[i] + '</option>');
	}

	$('#open-btn').click(function() {
		var port = $('#ports > OPTION:selected').attr('value');

		if (port === '') {
			return;
		}

		if (connectionId !== null) {
			closePort(function() {
				openPort(port);
			});
		} else {
			openPort(port);
		}
	});

	$('#close-btn').click(function() {
		closePort();
	});

	$('#clear-btn').click(function() {
		$('#log-wrap').empty();
	});

	$('#kill-btn').click(function() {
		window.close();
	});

	$('#message').keydown(function(e) {
		if (e.keyCode === 13) { // ENTER
			send($('#message').val());
			$('#message').val('')
		} else if (e.keyCode === 38) { // UP
			$('#message').val(history[historyIndex]);
			historyIndex = Math.max(historyIndex - 1, 0);
		} else if (e.keyCode === 40) { // DOWN
			historyIndex = Math.min(historyIndex + 1, history.length - 1);
			$('#message').val(history[historyIndex]);
		}
	});
});