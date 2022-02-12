function getInputValue() {
    return document.querySelector('#searchValue').value;
}

async function handleSubmit(event) {
    console.debug('entering handleSubmit');
    const input = getInputValue();
    const data = await requestVotersData(input);
    console.debug(data);
    console.debug('exiting handleSubmit');
}

async function requestVotersData(query) {
    console.debug('entering requestVotersData');
    const res = await fetch('/api/requestVoters', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({query: query}),
    });
    console.debug('exiting requestVotersData');
    return res.text();
}
