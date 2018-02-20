const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord('Dev18442','incident','33238','abc123','v1');

module.exports.createIncident = function(req, res) {
    var obj = {
		short_description: "Production Server down",
		description:"latin words here",
		priority:1
	};
	
	gr.insert(obj).then(function(response){
		let dataToSend = "Incident created with sys id:"+response.sys_id;
		return res.json({
			speech: dataToSend,
			displayText: dataToSend,
			source: '/incident/create'
		});
	}).catch(function(error){
		return res.json({
            speech: 'Something went wrong!',
            displayText: 'Something went wrong!',
            source: '/incident/create'
        });
	});
};

module.exports.getIncidentStatus = function(req, res) {
	gr.get('e128dec34f1c13008a812ed18110c745').then(function(result) {
		let dataToSend = (result.active === "true") ? "Incident status is active" : "Incident status is inactive" ;
		return res.json({
			speech: dataToSend,
			displayText: dataToSend,
			source: '/incident/create'
		});
	}).catch(function(error) {
		console.log(error);
		return res.json({
            speech: 'Something went wrong!',
            displayText: 'Something went wrong!',
            source: '/incident/getstatus'
        });
	});
};