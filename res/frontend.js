const gridHeaderMap = {
    voterid: 'VoterId',
    firstName: 'First',
    middleName: 'Middle',
    lastName: 'Last',
    houseNumber: 'House',
    houseSuffix: 'Sfx',
    preDirection: 'Dir',
    streetName: 'Street',
    streetType: 'Type',
    postDirection: 'Post Dir',
    unitType: 'Apt',
    unitNumber: 'Apt #'
}
const gridStyle = {
    table: {
      border: '3px solid #082961',
    },
    th: {
      'background-color': '#082961',
      color: '#ffffff',
      border: '3px solid #082961',
    },
    td: {
      color: '#000',
      'border-color': '#082961'
    }
};
const queryGrid = new gridjs.Grid({
    data: [],
    style: gridStyle,
  }).render(document.getElementById('queryTable'));
const resultsGrid =  new gridjs.Grid({
    data: [],
    style: gridStyle,
    sort: true,
    autoWidth: false,
  }).render(document.getElementById('resultsTable'));



function getInputValue() {
    return document.querySelector('#searchValue').value;
}

function clearErrors() {
    document.querySelector('#error').textContent = '';
}

function showError(err) {
    document.querySelector('#error').textContent = err;
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
    clearErrors();
    try {
        const res = await fetch('/api/requestVoters', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({query: query}),
        });

        if (!res.ok) {
            throw new Error('Bad response from server: ' + await res.text());
        }

        console.debug('exiting requestVotersData');
        return await res.json();
    }
    catch (err) {
        showError(err);
        throw err;
    }
}

function showData(data) {
    console.debug('entering showData');

    queryGrid.updateConfig({
        data: [data.query]
    }).forceRender();



    document.querySelector('#resultsType').textContent = `${data.type} (${data.results.length})`;
    if (data.results.length > 0) {
        let queryKeys = Object.keys(data.query);
        resultsGrid.updateConfig({
            columns: Object.keys(data.results[0]).map(key => {
                let column = {id: key, name: gridHeaderMap[key]};
                if (queryKeys.includes(key)) {
                    column.attributes = (cell) => {
                        if (cell && cell.localeCompare(data.query[key], undefined, { sensitivity: 'base' }) === 0) {
                            return {
                                'style': 'background-color: #7fdb93; color: #000; border-color: #082961'
                            };
                        }
                        else if (cell && (cell.toUpperCase().startsWith(data.query[key].toUpperCase()) 
                                || cell.toUpperCase().endsWith(data.query[key].toUpperCase())
                                || data.query[key].toUpperCase().startsWith(cell.toUpperCase()) 
                                || data.query[key].toUpperCase().endsWith(cell.toUpperCase()))) {
                            return {
                                'style': 'background-color: #ede480; color: #000; border-color: #082961'
                            };
                        }
                    }
                }
                return column;
            }),

            data: data.results
        }).forceRender();
    }

    document.querySelector('#results').style.display = 'block';

    console.debug('exiting showData');
}