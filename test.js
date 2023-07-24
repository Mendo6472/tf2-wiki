const {Client} = require("./index")
const tf2 = new Client();

tf2.search({type: "weapon", q:"baby face's", lang:"en"})
	.then(result => {
		console.log(result)
	});