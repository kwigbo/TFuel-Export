var startDate;
var currentDate;
var tomorrowDate;
var finalOutputItems;
var yearTotal;

function generate(form) {

	// Get values input by the user
	var address = document.getElementById('address_input').value;
	var year = document.getElementById('year_input').value;

	// Store start date
	startDate = new Date(year, 0, 1);

    // Set current date and tomorrow to begin the loop through the year
	currentDate = startDate;
	tomorrowDate = new Date(currentDate.valueOf());
	tomorrowDate.setDate(currentDate.getDate() + 1);

	var output_header = document.getElementById('output_header');
	output_header.innerHTML = "Please wait, this will take awhile.";

	var loader = document.getElementById('loader');
	loader.style.display = "block";

	var form = document.getElementById('form');
	form.style.display = "none";

	finalOutputItems = [];
	yearTotal = 0;

	getNextDaysTransactions();
}

function getNextDaysTransactions() {
	// Loop through all the days in the year
	if (currentDate.getFullYear() === startDate.getFullYear()) {
		var output = document.getElementById('output');
		output.innerHTML = "Getting transactions for: " + currentDate.toLocaleDateString("en-US");

		var startTimeStamp = currentDate.getTime() + "";
		// Cut the time off the timestamp
		startTimeStamp = startTimeStamp.substring(0, startTimeStamp.length - 3);
		var endTimeStamp = tomorrowDate.getTime() + "";
		// Cut the time off the timestamp
		endTimeStamp = endTimeStamp.substring(0, endTimeStamp.length - 3);

		// Send the request
		var request = new XMLHttpRequest();
		request.responseType = 'json';
		var parameters = "?startDate=" + startTimeStamp + "&endDate=" + endTimeStamp;
		var url='https://explorer.thetatoken.org:8443/api/accountTx/history/0xe147defE7b3A19152aFbE59499F09af4cBfA5b44';
		request.open("GET", url + parameters);
		request.send();

		request.onload = (e) => {
			var json = request.response
			addDailyRecord(json, currentDate);

			// Update to tommorrow and get the next days transactions
			currentDate = tomorrowDate;
			tomorrowDate = new Date(currentDate.valueOf());
			tomorrowDate.setDate(currentDate.getDate() + 1);
			getNextDaysTransactions();
		}
		request.onerror = function () {
			var output_table = document.getElementById('output_form');
			var rowData = `<tr><td>Failure to load. Try that page again.</td><td></td><td></td></tr>`;
			output_table.innerHTML = rowData + output_table.innerHTML;
			getNextDaysTransactions();
		};
	} else {
		var output_header = document.getElementById('output_header');
		output_header.innerHTML = "Complete!";

		var output = document.getElementById('output');
		output.innerHTML = "";

		var loader = document.getElementById('loader');
		loader.style.display = "none";

		download("tfuel_earnings.csv", convertJSONtoCSV(finalOutputItems));
	}
}

function addDailyRecord(json, date) {
	var items = json["body"]
	// Consolidate all daily transactions into one transaction
	var totalTFuel = 0
	var mostRecentDate = date;
	for (const item in items) {
		var object = items[item];
		var type = object["tx_type"];
		var timestamp = new Date(object["timestamp"]);
		var tfuelAmount = parseFloat(object["tfuel_amount"]);
		// From this address is staking rewards
		if (object["from"] === "0x00000") {
			mostRecentDate = timestamp;
			totalTFuel += tfuelAmount;
		} else if (type === "Receive") {
			addTFuelRecieve(tfuelAmount, timestamp, false);
		}
	}
	addTFuelRecieve(totalTFuel, mostRecentDate, true);
}

function addTFuelRecieve(amount, date, isCombined) {
	if (amount > 0) {
		var message = isCombined ? "Add Combined Transaction" : "Add Individual Transaction"
		var output_table = document.getElementById('output_form');
		var rowData = `<tr><td>${message}</td><td>${timestampString(date)}</td><td>${amount}</td></tr>`;
		output_table.innerHTML = rowData + output_table.innerHTML;
		// Fields here are specific output for cointracker.io
		var finalItem = {
			"Date": timestampString(date), 
			"Received Quantity": amount.toFixed(8),
			"Received Currency": "TFUEL",
			"Sent Quantity": "",
			"Sent Currency": "",
			"Fee Amount": "",
			"Fee Currency": "",
			"Tag": "staked",
		};
		yearTotal += amount;
		var total_tfuel = document.getElementById('total_tfuel');
		total_tfuel.innerHTML = "Total TFuel: " + yearTotal.toFixed(8);
		finalOutputItems.push(finalItem);
	}
}

function tableRowForTransaction(object) {
	// Expected headers
	// tx_hash,timestamp,tx_type,theta_amount,tfuel_amount,from,to
	var timestamp = new Date(object["timestamp"]);
	var tfuelAmount = parseFloat(object["tfuel_amount"]);
	var rowData = `<tr><td>Real Object</td><td>${timestampString(timestamp)}</td><td>${tfuelAmount}</td></tr>`;
	return rowData;
}

function timestampString(date) {
	//MM/DD/YYYY HH:MM:SS
	var month = padWIthZero((date.getUTCMonth()+1).toString());
	var day = padWIthZero(date.getUTCDate().toString());
	var year = date.getUTCFullYear().toString();
	var hours = padWIthZero(date.getUTCHours().toString());
	var minutes = padWIthZero(date.getUTCMinutes().toString());
	var seconds = padWIthZero(date.getUTCSeconds().toString());
	var dateString = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`
	return dateString;
}

function padWIthZero(string) {
	if (string.length < 2) {
		return "0" + string
	}
	return string
}

function convertJSONtoCSV(json) {
	const items = json;
	const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
	const header = Object.keys(items[0]);
	const csv = [
	  header.join(','), // header row first
	  ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
	].join('\r\n')

	return csv;
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

