const GlideRecord = require('servicenow-rest').gliderecord;
const gr = new GlideRecord('Dev18442','incident','33238','abc123','v1');

module.exports.createIncident = function(req, res) {
    var obj = {
		short_description: req.body.result.parameters.shortdesc,
		description:req.body.result.parameters.description,
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
	let sysId = req.body.result.parameters.sysid;
	gr.get(sysId).then(function(result) {
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