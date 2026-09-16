const apiKey = 'AIzaSyDGkC8m2VLp8pVFvWwQroAW7rk0n0HEqtw';

async function test() {
    console.log("Testing Autocomplete...");
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
            input: 'Garna',
            includedRegionCodes: ['MA']
        })
    });
    const data = await res.json();
    console.log("Autocomplete response:");
    console.log(JSON.stringify(data, null, 2));

    if (data.suggestions && data.suggestions.length > 0) {
        const placeId = data.suggestions[0].placePrediction.placeId;
        console.log("\nTesting Place Details for", placeId);
        
        const res2 = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=location`, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': apiKey,
            }
        });
        const data2 = await res2.json();
        console.log("Details response:");
        console.log(JSON.stringify(data2, null, 2));
    }
}

test();
