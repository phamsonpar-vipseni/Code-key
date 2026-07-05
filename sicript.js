async function createKey() {
    const owner = document.getElementById('owner').value;
    const hours = document.getElementById('hours').value;

    const response = await fetch('/api/create-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, hours })
    });
    const data = await response.json();
    document.getElementById('msg').innerText = data.message;
}
