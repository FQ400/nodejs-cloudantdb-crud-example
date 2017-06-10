var express = require('express');
var cfenv = require('cfenv');
var app = express();
var request = require('request');
var Cloudant = require('cloudant');
var path = require('path');
var bodyParser = require('body-parser');
var json2csv = require('json2csv');
var fs = require('fs');
app.use(express.static(__dirname + '/public'));

//To Store URL of Cloudant VCAP Services as found under environment variables on from App Overview page
var cloudant_url="https://7f7789ed-0f06-4a77-bba1-038f4f93e5f1-bluemix:3277f1918a551f0019fbd65c836bd819b24326f764f8ee684b8eb5ce8c44373f@7f7789ed-0f06-4a77-bba1-038f4f93e5f1-bluemix.cloudant.com";
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
// Check if services are bound to your project
if(process.env.VCAP_SERVICES)
{
	services = JSON.parse(process.env.VCAP_SERVICES);
	if(services.cloudantNoSQLDB) //Check if cloudantNoSQLDB service is bound to your project
	{
		cloudant_url = services.cloudantNoSQLDB[0].credentials.url;  //Get URL and other paramters
		console.log("Name = " + services.cloudantNoSQLDB[0].name);
		console.log("URL = " + services.cloudantNoSQLDB[0].credentials.url);
        console.log("username = " + services.cloudantNoSQLDB[0].credentials.username);
		console.log("password = " + services.cloudantNoSQLDB[0].credentials.password);
	}
}

//Connect using cloudant npm and URL obtained from previous step
var cloudant = Cloudant({url: cloudant_url});
//Edit this variable value to change name of database.
var dbname = 'mydb';
var db;

//Create database
cloudant.db.create(dbname, function(err, data) {
  	if(err) //If database already exists
	    console.log("Database exists. Error : ", err); //NOTE: A Database can be created through the GUI interface as well
  	else
	    console.log("Created database.");

  	//Use the database for further operations like create view, update doc., read doc., delete doc. etc, by assigning dbname to db.
  	db = cloudant.db.use(dbname);
    //Create a design document. It stores the structure of the database and contains the design and map of views too
    //A design doc. referred by _id = "_design/<any name your choose>"
    //A view is used to limit the amount of data returned
    //A design document is similar to inserting any other document, except _id starts with _design/.
    //Name of the view and database are the same. It can be changed if desired.
    //This view returns (i.e. emits) the id, revision number and new_city_name variable of all documents in the DB
  	db.insert(
	 {
		  	_id: "_design/mydb",
		    views: {
	  				  "mydb":
	  				   {
	      					"map": "function (doc) {\n  emit(doc._id, [doc._rev, doc.new_name]);\n}"
	    			   }
      	   		   }
     },
	 function(err, data) {
	    	if(err)
	    			console.log("View already exsits. Error: ", err); //NOTE: A View can be created through the GUI interface as well
	    	else
	    		console.log("mydb view has been created");
	 });

});

app.get('/url',function(req, res){
	var url = cloudant_url + "/mydb/_find";

	var selector = {
	  "selector": {
	    "url": req.query.url
	  },
	  "fields": [
	    "url",
	    "watsonResult"
	  ]
  	};

	request({
			method: 'POST',
			url: url,
			json: true,
			body: selector
			}, function (error, response, body) {
		if (!error && response.statusCode === 200)
		{
			var tags = JSON.parse(body.docs[0].watsonResult);

			var entities = tags.entities && tags.entities.map(function(el){
				return {
					text: el.text,
					relevance: el.relevance,
					count: el.count
				};
			});
			res.contentType('application/json');
			res.send(entities);
		}
		else
		{
			console.log("Response is : " + response.statusCode);
			res.contentType('application/json');
			res.send({ hello: 'world' });
		}
	});
});

var appEnv = cfenv.getAppEnv();
app.listen(appEnv.port, '0.0.0.0', function() {
  console.log("server starting on " + appEnv.url);
});
