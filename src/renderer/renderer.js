var MINUTES_TO_MS = 60000;
var alertInterval;
function breakAlert(message) {
    new Notification("Time For a Break!", { body: message }).onclick =
        function () { return console.log(message); };
}
window.onload = function () {
    var startButton = document.getElementsByClassName("start-timer")[0];
    var stopButton = document.getElementsByClassName("stop-timer")[0];
    var messageField = document.getElementById("reminder-message");
    var intervalInput = document.getElementById("reminder-interval");
    startButton.addEventListener('click', function () {
        var intervalAmountMs = MINUTES_TO_MS * parseFloat(intervalInput.value);
        alertInterval = setInterval(function () { return breakAlert(messageField.value); }, intervalAmountMs);
    });
    stopButton.addEventListener('click', function () {
        clearInterval(alertInterval);
    });
};
