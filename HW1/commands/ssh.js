const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execSync = require('child_process').execSync;

exports.command = 'ssh';
exports.desc = 'SSH into the created VM';

exports.handler = async argv => {
    (async () => {
        // define ssh connection values
        let identifyFile = path.join(os.homedir(), '.bakerx', 'insecure_private_key');
        let port = 2800;
        let user = 'vagrant';
        let hostname = '127.0.0.1';

        // call the ssh function with values provided
        await ssh(identifyFile, port, user, hostname);
    })();
};


async function ssh(identifyFile, port, user, hostname) {
    // define the ssh command
    let sshExe = `ssh -i "${identifyFile}" -p ${port} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ${user}@${hostname} `;

    console.log("\n --- X ---");
    console.log("The SSH command is: ");
    console.log(`${sshExe}`);
    console.log(" --- X ---\n");

    // execute the ssh command and child process inherits parent process's std input, output and error streams
    return execSync(`${sshExe}`, { stdio: ['inherit', 'inherit', 'inherit'] });
}