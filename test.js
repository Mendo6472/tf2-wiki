const {Client} = require("./index")
const tf2 = new Client();

tf2.search({type: "weapon", q:"Force a nature", lang:"en"})
	.then(result => {
		console.log(result)
	});