var http = require("http");
var fs = require("fs");

function err_quit(description)
{
	console.log(description);
	process.exit(1);
}
exports.err_quit = err_quit;

function getsize(len)
{
	if(len<1024)
		return len + " Bytes";
	len/=1024;
	if(len<1024)
		return len.toFixed(2) + " KB";	
	len/=1024;
		return len.toFixed(2) + " MB";	
}
exports.getsize = getsize;

function Eachthread(options, threadnum, fd, start, end, callback, statusupdate) {
	this.start = start;
	this.end = end;
	this.fd = fd;
	this.threadnum = threadnum;
	this.pendingwrites = 0;
	var self = this;
	this.req = http.request(options, function(res) {

		res.on('error', function(e) {
			err_quit("recieve response error: " + e.message);
		});
		
		if((res.statusCode / 100).toFixed() == 2)
		{
			res.on('data', function(chunk) {
				//console.log("data arrived");
				if(self.start + chunk.length > self.end + 1)
				{
					callback(self.threadnum, false, "more than expected partial-content arrived");
				}
				else
				{
					self.pendingwrites++;
					//console.log(self.fd + " len: " + chunk.length + " start: " + self.start);
					fs.write(self.fd, chunk, 0, chunk.length, self.start, function(error, written) {
						if(error)
						{
							err_quit("write error on fd");
						}
						if(written < chunk.length)
						{
							err_quit("written less than expected on fd");
						}
						statusupdate(self.threadnum, written);
						self.pendingwrites--;
						if(self.start > self.end && !self.pendingwrites)
							callback(self.threadnum, true);
					});
					self.start += chunk.length;
				}
			});
		
			res.on('end', function() {
				//callback(self.threadnum, true);
				console.log("thread ended");
			});
		}
		else
		{
			callback(self.threadnum, false);
		}
	});
	
	this.req.setHeader("Range","bytes=" + this.start + '-' + this.end);
	this.req.setHeader("Connection","keep-alive");
	this.req.setHeader("User-Agent","Mozilla/5.0 (X11; Linux i686) AppleWebKit/534.30 (KHTML, like Gecko) Ubuntu/11.04 Chromium/12.0.742.112 Chrome/12.0.742.112 Safari/534.30");
	this.req.on('error', function(e) {
		err_quit("problem with request: " + e.message);
	});
	this.req.end();
};
exports.Eachthread = Eachthread;
