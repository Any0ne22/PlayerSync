chrome.storage.local.get(['server'], function(result) {
    document.getElementById("server-address").value = result.server;
});

document.getElementById("save-button").addEventListener("click", function() {
    const serverAddress = document.getElementById("server-address").value;
    chrome.storage.local.set({server: serverAddress});
    document.location.href = "popup.html"
});