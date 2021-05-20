var fs = require('fs'),
    xml2js = require('xml2js'),
    child  = require('child_process'),
    chalk = require('chalk');
var parser = new xml2js.Parser();
var Bluebird = require('bluebird')


function getTestReport(testdir) {
    // '/simplecalc/target/surefire-reports/TEST-com.github.stokito.unitTestExample.calculator.CalculatorTest.xml';

    let testReportBase = `${testdir}/target/surefire-reports/`;
    const files = fs.readdirSync(testReportBase);

    const filename = files.find((file) => {
      // return the first xml file in directory
      return file.includes('.xml');
    });

    console.log( chalk.green(`Found test report ${filename}`) );
    return testReportBase + filename;
}

async function getTestResults(testReport)
{
    var contents = fs.readFileSync(testReport)
    let xml2json = await Bluebird.fromCallback(cb => parser.parseString(contents, cb));
    let tests = readMavenXmlResults(xml2json);
    return tests;
}

async function calculateTestPriority(testsuite_dir)
{
    try {

        return new Promise( function(resolved, rejected)
        {
            let mvn = child.exec('mvn test', {cwd: testsuite_dir});
            mvn.stdout.pipe( process.stdout );
            mvn.stderr.pipe( process.stderr );

            mvn.once('exit', async (exitCode) =>
            {
                let testReport = getTestReport(testsuite_dir);
                let tests = await getTestResults(testReport);

                // refer https://www.w3schools.com/js/js_array_sort.asp and https://stackoverflow.com/a/6712080
                tests.sort( (a,b) =>
                {
                    // failed comes before passed alphabetically
                    if(a.status < b.status) { return -1; }
                    if(a.status > b.status) { return 1; }

                    // if status for both a and b is same, compare on times; ascending order
                    if(a.time < b.time) { return -1; }
                    if(a.time > b.time) { return 1; }
                    return 0;
                }).forEach( e => console.log(e));

                resolved();
            });
        });


    } catch(e) {
        console.log( chalk.red(`Error: Calculating priority of tests:\n`) + chalk.grey(e.stack));
    }
}

async function calculateFlakyTests(testsuite_dir, iterations)
{
    try{
        var test_dict = {};
        for( var i = 1; i <= iterations; i++ )
        {
            console.log("\n ----- \nIteration: "+i);

            try {
                // for stdio options execSync - https://nodejs.org/api/child_process.html#child_process_options_stdio
                await child.execSync('mvn test', {cwd: testsuite_dir, stdio: ['inherit', 'ignore', 'ignore']});
            }
            // mvn test child process throws error since build fails, use generated test report to calculate statistics
            catch (error) {
                // refer https://stackoverflow.com/a/43077917 to see how to keep executing code after catching error
                let testReport = getTestReport(testsuite_dir);
                let tests = await getTestResults(testReport);

                if ( Object.keys(test_dict).length == 0 ) {
                    tests.forEach( (e) => {
                        // each test name will have a dictionary containg 2 keys: "p" and "f". Initialise the count of passing and failing instances with 0
                        test_dict[e.name] = {};
                        test_dict[e.name]["p"]=0;
                        test_dict[e.name]["f"]=0;
                    });
                }

                // iterate over tests, if status is passed, increment test["p"] by 1 else increment test["f"] by 1
                tests.forEach( e => {
                    if (e.status == "passed") {
                        test_dict[e.name]["p"]++;
                    }
                    else if (e.status == "failed") {
                        test_dict[e.name]["f"]++;
                    }
                });

                console.log(chalk.yellow("\n --- Printing Test name, time, status --- "));
                tests.forEach( e => console.log(e));
                // continue;
            }
        }

        // calculate flakyness score for each test
        console.log(chalk.yellow("\n --- Printing flakyness score for each test --- "));
        console.log(chalk.yellow("\n test name | passed test runs | failed test runs | flakyness score"));
        for(var t in test_dict) {
            // flakyness score = min(passing,failing) / (passing + failing)
            var flake = (Math.min(test_dict[t]["p"], test_dict[t]["f"])*100)/(test_dict[t]["p"]+test_dict[t]["f"]);
            console.log(t + " | " + test_dict[t]["p"] + " | " + test_dict[t]["f"] + " | " + flake.toFixed(2) + "%");
        }
        console.log("\n");
    } catch(e) {
        console.log( chalk.red(`Error: Calculating flaky tests:\n`) + chalk.grey(e.stack));
    }
}


function readMavenXmlResults(result)
{
    var tests = [];
    for( var i = 0; i < result.testsuite['$'].tests; i++ )
    {
        var testcase = result.testsuite.testcase[i];

        tests.push({
        name:   testcase['$'].name,
        time:   testcase['$'].time,
        status: testcase.hasOwnProperty('failure') ? "failed": "passed"
        });
    }
    return tests;
}

module.exports.calculateFlakyTests = calculateFlakyTests;
module.exports.calculateTestPriority = calculateTestPriority;