var http = require("http");
var fs = require("fs");
var url = require("url");
var autil = require("./autil.js");

// Process Command line arguments and initialise global variables

if(process.argv.length < 3)
{
	autil.err_quit("argument length is less than 3");
}

var DESTN = process.argv[2];
var LEN = 0;
var NUMTHREADS = 5;
var MINPERTHREAD = 8192;
var CURPERTHREAD = 0;
var WRITTEN = 0;
var FILENAME = url.parse(DESTN).pathname.substr(1).replace(new RegExp("/","g"),"_");
var STATUSINTERVAL = 5;
var STATUSTIMER;

if(process.argv.length > 3)
	NUMTHREADS = Math.min(10, Number(process.argv[3]));

if(process.argv.length > 4)
	FILENAME = process.argv[4];

if(process.argv.length > 5)
	STATUSINTERVAL = process.argv[5];


// Hack for connection via http-proxy

if(process.env.http_proxy)
	DESTN = url.parse(process.env.http_proxy + '/' + DESTN);

var options = {
	host 	: DESTN.hostname,
	port 	: DESTN.port,
	path 	: DESTN.pathname.substr(process.env.http_proxy?1:0),
	method 	: 'HEAD',
	agent 	: false
};


// send head request and obtain the size of the file

var req = http.request(options, function(res) {
	
	res.on("error", function(e) {
		autil.err_quit("recieve response error: " + e.message);
	});
	
	if((res.statusCode/100).toFixed() == 2)
	{
		console.log("fileSize: ", autil.getsize(res.headers["content-length"]));
		LEN = res.headers["content-length"];
		res.on('end', function() {
			int_main();
		});
	}
	else
	{
		autil.err_quit("response status code: " + res.statusCode);
	}
});

this.req.setHeader("Connection","keep-alive");
this.req.setHeader("User-Agent","Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.30 (KHTML, like Gecko) Ubuntu/11.04 Chromium/12.0.742.112 Chrome/12.0.742.112 Safari/534.30");

req.on("error", function(e){
	autil.err_quit("problem with request: " + e.message);
});

req.end();


//try to download the file in numthread threads in parallel

function int_main()
{
	options["method"] = 'GET';
	
	if(LEN < MINPERTHREAD * NUMTHREADS)
		NUMTHREADS = (LEN / MINPERTHREAD).toFixed();
	
	CURPERTHREAD = (LEN / NUMTHREADS).toFixed();
	REMTHREADS = NUMTHREADS;
	
	var reqs = [], start = [], end = [];
	console.log("fileName: " + FILENAME);
	console.log(LEN);
	console.log("threads : " + NUMTHREADS);

	var fd = fs.openSync(FILENAME, "w");
	if(fd < 0)
	{
		autil.err_quit("file open Sync error");
	}
	fs.truncateSync(fd, LEN);
	
	for(var i = 0; i < NUMTHREADS ; i++)
	{
		start[i] = i * CURPERTHREAD;
		end[i] = ((i < NUMTHREADS - 1) ? (i+1) * CURPERTHREAD -1 : LEN-1);
		
		reqs[i] = new autil.Eachthread(options, i, fd, start[i], end[i], function (threadnum, success, error_desc){

			if(success)
			{
				REMTHREADS--;
				if(REMTHREADS == 0)
				{
					if(WRITTEN == LEN)
					{
						fs.close(fd);
						console.log("All threads ended succesfully, file download complete :-)");
						clearInterval(STATUSTIMER);
						process.exit(0);
					}
					else
					{
						//fs.unlinkSync(FILENAME);
						console.log(WRITTEN + "  " + LEN);
						autil.err_quit("Unexpected error Incomplete Download!!!");
					}
				}
			}
			else
			{
				fs.close(fd);
				fs.unlinkSync(FILENAME);
				err_quit("Some Fatal Error on thread: " + threadnum + "\ndescription: " + desc);
			}
		}, function(threadnum, datawritten) {
			WRITTEN += datawritten;
		});
	};
	STATUSTIMER = setInterval(function() {
		console.log("Written Successfully: " + WRITTEN + " bytes\tDownload %:" + ((WRITTEN * 100) / LEN).toFixed(2));
	}, STATUSINTERVAL * 1000);

};

/*
TODO:
1: debug mode
2: retry in case of some error
3: recovery ie. download in single thread if partial download not supported
4: Progress Bar
*/
