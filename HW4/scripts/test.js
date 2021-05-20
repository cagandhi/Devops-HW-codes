
var main = require("../index.js");

describe("unit tests for index.js", function() {

    it("testing inputs for inc()", function() {
       main.inc(1,1);
       // Add more test inputs...
       main.inc(-1);
    });

});
