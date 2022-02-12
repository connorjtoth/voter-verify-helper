const params = new URLSearchParams(window.location.search);
if (params.has('error')) {
    document.querySelector('#error').textContent = params.get('error');
}