var queryGrid = new gridjs.Grid({data: []}).render(document.getElementById('queryTable'));
var resultsGrid =  new gridjs.Grid({data: []}).render(document.getElementById('resultsTable'));


function getInputValue() {
    return document.querySelector('#searchValue').value;
}

async function handleSubmit(event) {
    console.debug('entering handleSubmit');
    const input = getInputValue();
    const data = await requestVotersData(input);
    showData(data);

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
    return res.json();
}

function showData(data) {
    console.debug('entering showData');

    queryGrid.updateConfig({
        data: [data.query]
    }).forceRender();



    document.querySelector('#resultsType').innerHTML = `${data.type} (${data.results.length})`;
    
    if (data.results.length > 0) {
        let queryKeys = Object.keys(data.query);
        resultsGrid.updateConfig({
            columns: Object.keys(data.results[0]).map(key => {
                let column = {id: key};
                if (queryKeys.includes(key)) {
                    column.attributes = (cell) => {
                        if (cell && cell.localeCompare(data.query[key], undefined, { sensitivity: 'base' }) === 0) {
                            return {
                                'style': 'background-color: #7fdb93'
                            };
                        }
                        else if (cell && (cell.toUpperCase().startsWith(data.query[key].toUpperCase()) 
                                || cell.toUpperCase().endsWith(data.query[key].toUpperCase())
                                || data.query[key].toUpperCase().startsWith(cell.toUpperCase()) 
                                || data.query[key].toUpperCase().endsWith(cell.toUpperCase()))) {
                            return {
                                'style': 'background-color: #ede480'
                            };
                        }
                    }
                }
                return column;
            }),

            data: data.results
        }).forceRender();
    }

    console.debug('exiting showData');
}